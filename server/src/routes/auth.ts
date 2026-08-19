import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { env, isProd } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { isGuestPasswordHash } from "../lib/guestEmail.js";
import { isMailConfigured, sendMail } from "../lib/mail.js";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/schemas.js";
import {
  createAuthenticationOptions,
  createRegistrationOptions,
  deletePasskey,
  listPasskeys,
  verifyAndSaveRegistration,
  verifyAuthentication,
} from "../lib/webauthn.js";
import { uploadCarImages } from "../middleware/upload.js";
import {
  formatHoursSummary,
  normalizeBusinessHours,
} from "../lib/rentalSettings.js";
import fs from "fs";

const router = Router();

// Only login/register — not /me or notifications (those are used constantly)
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, try again later" },
});

function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  companyName?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  bookingNotifyEmail?: string | null;
  avatarUrl?: string | null;
  notifyBookingEmail?: boolean;
  notifyCancelEmail?: boolean;
  notifyPaymentEmail?: boolean;
  notifyDocumentEmail?: boolean;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
  minDriverAge?: number | null;
  maxDriverAge?: number | null;
  weeklyDiscountPct?: number | null;
  monthlyDiscountPct?: number | null;
  requireDeposit?: boolean | null;
  defaultDepositEur?: { toNumber?: () => number } | number | null;
  businessHours?: unknown;
  cancellationPolicyText?: string | null;
  role: "USER" | "CONTRACTOR" | "ADMIN" | "SUPER_ADMIN";
  isActive?: boolean;
  createdAt: Date;
}) {
  const deposit =
    user.defaultDepositEur == null
      ? null
      : typeof user.defaultDepositEur === "number"
        ? user.defaultDepositEur
        : Number(user.defaultDepositEur);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName ?? null,
    businessPhone: user.businessPhone ?? null,
    businessAddress: user.businessAddress ?? null,
    bookingNotifyEmail: user.bookingNotifyEmail ?? null,
    avatarUrl: user.avatarUrl ?? null,
    notifyBookingEmail: user.notifyBookingEmail ?? true,
    notifyCancelEmail: user.notifyCancelEmail ?? true,
    notifyPaymentEmail: user.notifyPaymentEmail ?? true,
    notifyDocumentEmail: user.notifyDocumentEmail ?? true,
    minRentalDays: user.minRentalDays ?? null,
    maxRentalDays: user.maxRentalDays ?? null,
    minDriverAge: user.minDriverAge ?? null,
    maxDriverAge: user.maxDriverAge ?? null,
    weeklyDiscountPct: user.weeklyDiscountPct ?? null,
    monthlyDiscountPct: user.monthlyDiscountPct ?? null,
    requireDeposit: user.requireDeposit ?? null,
    defaultDepositEur: deposit,
    businessHours: normalizeBusinessHours(user.businessHours),
    businessHoursSummary: formatHoursSummary(
      normalizeBusinessHours(user.businessHours)
    ),
    cancellationPolicyText: user.cancellationPolicyText ?? null,
    role: user.role,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
  };
}

router.post(
  "/register",
  authAttemptLimiter,
  validate(registerSchema),
  async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;
    const exists = await prisma.user.findFirst({
      where: { email: { equals: String(email).trim(), mode: "insensitive" } },
    });
    if (exists && exists.role === "USER" && isGuestPasswordHash(exists.passwordHash)) {
      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      const user = await prisma.user.update({
        where: { id: exists.id },
        data: {
          fullName,
          passwordHash,
          phone: phone || exists.phone,
        },
      });
      const token = signToken({
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      });
      setAuthCookie(res, token);
      res.status(201).json({ user: publicUser(user) });
      return;
    }
    if (exists) throw new AppError("Email already registered", 409);

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, phone },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    setAuthCookie(res, token);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/login",
  authAttemptLimiter,
  validate(loginSchema),
  async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body as {
      email: string;
      password: string;
      rememberMe?: boolean;
    };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("Invalid email or password", 401);
    if (isGuestPasswordHash(user.passwordHash)) {
      throw new AppError("Invalid email or password", 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError("Invalid email or password", 401);
    if (!user.isActive) throw new AppError("Account is deactivated", 403);

    const keepSignedIn = Boolean(rememberMe);
    const token = signToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      keepSignedIn
    );
    setAuthCookie(res, token, keepSignedIn);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

router.post(
  "/forgot-password",
  authAttemptLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const email = String(req.body.email).trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });

      // Always same response (no email enumeration)
      const okMessage = {
        message:
          "Nëse email-i ekziston, dërguam një link për rivendosjen e fjalëkalimit.",
      };

      if (!user || !user.isActive) {
        res.json(okMessage);
        return;
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        },
      });

      const appUrl = env.PUBLIC_APP_URL || env.CLIENT_ORIGIN;
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      const mailed = await sendMail({
        to: user.email,
        subject: "Auto Rental — rivendos fjalëkalimin",
        text: `Përshëndetje ${user.fullName},\n\nKliko për të rivendosur fjalëkalimin (vlen 1 orë):\n${resetUrl}\n\nNëse nuk e kërkove ti, injoro këtë email.\n\nAuto Rental`,
      });

      // Without SMTP, return the link once so reset still works until email is set up.
      if (!mailed.sent && !isMailConfigured()) {
        res.json({
          message:
            "Email nuk është konfiguruar ende. Përdor linkun më poshtë (vlen 1 orë).",
          resetUrl,
        });
        return;
      }

      res.json(okMessage);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/reset-password",
  authAttemptLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body as {
        token: string;
        password: string;
      };
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: tokenHash,
          passwordResetExpires: { gt: new Date() },
        },
      });
      if (!user) {
        throw new AppError("Linku është i pavlefshëm ose ka skaduar", 400);
      }

      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      res.json({ message: "Fjalëkalimi u ndryshua. Mund të hysh tani." });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError("User not found", 404);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const body = req.body as Record<string, unknown>;
      const fullName = String(body.fullName || "");
      const phone = body.phone as string | null | undefined;
      const password = body.password as string | undefined;
      const currentPassword = body.currentPassword as string | undefined;

      const existing = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });
      if (!existing) throw new AppError("User not found", 404);

      const data: Record<string, unknown> = {
        fullName,
        phone: phone || null,
      };

      if (password) {
        if (!currentPassword) {
          throw new AppError("Current password is required", 400);
        }
        const ok = await bcrypt.compare(currentPassword, existing.passwordHash);
        if (!ok) throw new AppError("Current password is incorrect", 400);
        data.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      }

      if (body.avatarUrl !== undefined) {
        data.avatarUrl =
          body.avatarUrl && String(body.avatarUrl).trim()
            ? String(body.avatarUrl).trim()
            : null;
      }

      const isStaff =
        req.user!.role === "CONTRACTOR" ||
        req.user!.role === "ADMIN" ||
        req.user!.role === "SUPER_ADMIN";

      if (isStaff) {
        const staffKeys = [
          "companyName",
          "businessPhone",
          "businessAddress",
        ] as const;
        for (const key of staffKeys) {
          if (body[key] !== undefined) {
            data[key] = body[key] ? String(body[key]).trim() : null;
          }
        }
        if (body.bookingNotifyEmail !== undefined) {
          data.bookingNotifyEmail =
            body.bookingNotifyEmail && String(body.bookingNotifyEmail).trim()
              ? String(body.bookingNotifyEmail).trim()
              : null;
        }

        const intKeys = [
          "minRentalDays",
          "maxRentalDays",
          "minDriverAge",
          "maxDriverAge",
          "weeklyDiscountPct",
          "monthlyDiscountPct",
        ] as const;
        for (const key of intKeys) {
          if (body[key] !== undefined) {
            data[key] =
              body[key] === null || body[key] === ""
                ? null
                : Number(body[key]);
          }
        }
        if (body.requireDeposit !== undefined) {
          data.requireDeposit =
            body.requireDeposit === null ? null : Boolean(body.requireDeposit);
        }
        if (body.defaultDepositEur !== undefined) {
          data.defaultDepositEur =
            body.defaultDepositEur === null || body.defaultDepositEur === ""
              ? null
              : Number(body.defaultDepositEur);
        }
        if (body.businessHours !== undefined) {
          data.businessHours =
            body.businessHours === null
              ? null
              : normalizeBusinessHours(body.businessHours);
        }
        if (body.cancellationPolicyText !== undefined) {
          data.cancellationPolicyText =
            body.cancellationPolicyText &&
            String(body.cancellationPolicyText).trim()
              ? String(body.cancellationPolicyText).trim()
              : null;
        }
      }

      if (typeof body.notifyBookingEmail === "boolean") {
        data.notifyBookingEmail = body.notifyBookingEmail;
      }
      if (typeof body.notifyCancelEmail === "boolean") {
        data.notifyCancelEmail = body.notifyCancelEmail;
      }
      if (typeof body.notifyPaymentEmail === "boolean") {
        data.notifyPaymentEmail = body.notifyPaymentEmail;
      }
      if (typeof body.notifyDocumentEmail === "boolean") {
        data.notifyDocumentEmail = body.notifyDocumentEmail;
      }

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data,
      });
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/avatar",
  requireAuth,
  (req, res, next) => {
    uploadCarImages.single("image")(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("Upload a photo", 400);
      const data = fs.readFileSync(req.file.path);
      fs.unlink(req.file.path, () => {});
      const saved = await prisma.mediaFile.create({
        data: {
          mimeType: req.file.mimetype || "image/jpeg",
          data,
        },
      });
      const url = `/api/media/${saved.id}`;
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { avatarUrl: url },
      });
      res.status(201).json({ url, user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.patch("/notifications/read", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** WebAuthn / Face ID passkeys */
router.get("/passkeys", requireAuth, async (req, res, next) => {
  try {
    const passkeys = await listPasskeys(req.user!.id);
    res.json({ passkeys });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/passkeys/register/options",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user || !user.isActive) throw new AppError("Unauthorized", 401);
      const options = await createRegistrationOptions({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      });
      res.json(options);
    } catch (err) {
      next(err);
    }
  }
);

router.post("/passkeys/register/verify", requireAuth, async (req, res, next) => {
  try {
    await verifyAndSaveRegistration(req.user!.id, req.body);
    const passkeys = await listPasskeys(req.user!.id);
    res.json({ verified: true, passkeys });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err instanceof Error ? err.message : "Passkey registration failed",
            400
          )
    );
  }
});

router.delete("/passkeys/:id", requireAuth, async (req, res, next) => {
  try {
    const ok = await deletePasskey(req.user!.id, req.params.id);
    if (!ok) throw new AppError("Passkey not found", 404);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/passkeys/login/options",
  authAttemptLimiter,
  async (req, res, next) => {
    try {
      const email =
        typeof req.body?.email === "string" ? req.body.email : undefined;
      const options = await createAuthenticationOptions(email);
      res.json(options);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/passkeys/login/verify",
  authAttemptLimiter,
  async (req, res, next) => {
    try {
      const user = await verifyAuthentication(req.body);
      const token = signToken(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
        true
      );
      setAuthCookie(res, token, true);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(
        err instanceof AppError
          ? err
          : new AppError(
              err instanceof Error ? err.message : "Passkey login failed",
              401
            )
      );
    }
  }
);

export default router;
