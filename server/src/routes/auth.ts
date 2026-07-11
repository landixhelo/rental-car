import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../validators/schemas.js";

const router = Router();

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

router.post("/register", validate(registerSchema), async (req, res, next) => {
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

router.post("/login", validate(loginSchema), async (req, res, next) => {
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

export default router;
