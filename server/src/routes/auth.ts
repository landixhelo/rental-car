import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { env, isProd } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { sendMail } from "../lib/mail.js";
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
  role: "USER" | "CONTRACTOR" | "ADMIN" | "SUPER_ADMIN";
  isActive?: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName ?? null,
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
    const exists = await prisma.user.findUnique({ where: { email } });
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
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("Invalid email or password", 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError("Invalid email or password", 401);
    if (!user.isActive) throw new AppError("Account is deactivated", 403);

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    setAuthCookie(res, token);
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

      await sendMail({
        to: user.email,
        subject: "AutoRent — rivendos fjalëkalimin",
        text: `Përshëndetje ${user.fullName},\n\nKliko për të rivendosur fjalëkalimin (vlen 1 orë):\n${resetUrl}\n\nNëse nuk e kërkove ti, injoro këtë email.\n\nAutoRent`,
      });

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
      const { fullName, phone, password } = req.body;
      const data: {
        fullName: string;
        phone?: string;
        passwordHash?: string;
      } = { fullName, phone };

      if (password) {
        data.passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
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
      where: {
        userId: req.user!.id,
        read: false,
        title: { contains: "Rezervim", mode: "insensitive" },
      },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.patch("/notifications/read", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
        title: { contains: "Rezervim", mode: "insensitive" },
      },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
