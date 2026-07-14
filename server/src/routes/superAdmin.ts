import { Router } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, strongPassword } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth, requireSuperAdmin);

const createAccountSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().email(),
      password: strongPassword,
      phone: z.string().trim().max(30).optional(),
      companyName: z.string().trim().max(120).optional(),
      role: z.enum(["USER", "CONTRACTOR", "ADMIN"]),
      notes: z.string().trim().max(1000).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === "CONTRACTOR" && !data.companyName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Company name is required for contractors",
        });
      }
    }),
});

const updateAccountSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    companyName: z.string().trim().max(120).optional().nullable(),
    role: z.enum(["USER", "CONTRACTOR", "ADMIN"]).optional(),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    password: strongPassword.optional(),
  }),
});

function publicAccount(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: Role;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { reservations: number; ownedCars: number };
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
    isActive: user.isActive,
    notes: user.notes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    reservationsCount: user._count?.reservations ?? 0,
    carsCount: user._count?.ownedCars ?? 0,
  };
}

router.get("/overview", async (_req, res, next) => {
  try {
    const [
      clients,
      contractors,
      admins,
      activeUsers,
      inactiveUsers,
      cars,
      reservations,
      revenueRows,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "CONTRACTOR" } }),
      prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.car.count(),
      prisma.reservation.count({
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
      }),
      prisma.reservation.findMany({
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
        select: { totalPrice: true },
      }),
    ]);

    const revenue = revenueRows.reduce(
      (sum, r) => sum + Number(r.totalPrice),
      0
    );

    res.json({
      overview: {
        clients,
        contractors,
        admins,
        activeUsers,
        inactiveUsers,
        cars,
        reservations,
        revenue,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/accounts", async (req, res, next) => {
  try {
    const role = String(req.query.role || "all");
    const q = String(req.query.q || "").trim();

    const where: {
      role?: Role | { in: Role[] };
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (role === "clients") where.role = "USER";
    else if (role === "contractors") where.role = "CONTRACTOR";
    else if (role === "admins") where.role = { in: ["ADMIN", "SUPER_ADMIN"] };
    else if (role !== "all") {
      throw new AppError("Invalid role filter");
    }

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        companyName: true,
        role: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            reservations: true,
            ownedCars: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ accounts: users.map(publicAccount) });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/accounts/:id",
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: { reservations: true, ownedCars: true },
          },
          reservations: {
            include: {
              car: { select: { brand: true, model: true, imageUrl: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
          ownedCars: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!user) throw new AppError("Account not found", 404);

      res.json({
        account: publicAccount(user),
        reservations: user.reservations.map((r) => ({
          ...r,
          carSubtotal: Number(r.carSubtotal),
          extrasTotal: Number(r.extrasTotal),
          locationFees: Number(r.locationFees),
          totalPrice: Number(r.totalPrice),
        })),
        cars: user.ownedCars.map((c) => ({
          ...c,
          pricePerDay: Number(c.pricePerDay),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/accounts",
  validate(createAccountSchema),
  async (req, res, next) => {
    try {
      const { fullName, email, password, phone, companyName, role, notes } =
        req.body;

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new AppError("Email already registered", 409);

      const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          phone,
          companyName,
          role,
          notes,
        },
        include: {
          _count: { select: { reservations: true, ownedCars: true } },
        },
      });

      res.status(201).json({ account: publicAccount(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/accounts/:id",
  validate(updateAccountSchema),
  async (req, res, next) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
      });
      if (!target) throw new AppError("Account not found", 404);
      if (target.role === "SUPER_ADMIN") {
        throw new AppError("Cannot modify super admin account");
      }
      if (target.id === req.user!.id) {
        throw new AppError("Use profile page for your own account");
      }

      const data: Record<string, unknown> = { ...req.body };
      if (req.body.password) {
        data.passwordHash = await bcrypt.hash(
          req.body.password,
          env.BCRYPT_ROUNDS
        );
        delete data.password;
      }

      const user = await prisma.user.update({
        where: { id: target.id },
        data,
        include: {
          _count: { select: { reservations: true, ownedCars: true } },
        },
      });

      res.json({ account: publicAccount(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/accounts/:id/toggle-active",
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
      });
      if (!target) throw new AppError("Account not found", 404);
      if (target.role === "SUPER_ADMIN") {
        throw new AppError("Cannot deactivate super admin");
      }
      if (target.id === req.user!.id) {
        throw new AppError("Cannot deactivate yourself");
      }

      const user = await prisma.user.update({
        where: { id: target.id },
        data: { isActive: !target.isActive },
        include: {
          _count: { select: { reservations: true, ownedCars: true } },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: user.isActive ? "Llogaria u aktivizua" : "Llogaria u pezullua",
          message: user.isActive
            ? "Super Admin aktivizoi llogarinë tuaj."
            : "Super Admin pezulloi llogarinë tuaj. Kontaktoni support.",
        },
      });

      res.json({ account: publicAccount(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/accounts/:id",
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
      });
      if (!target) throw new AppError("Account not found", 404);
      if (target.role === "SUPER_ADMIN") {
        throw new AppError("Cannot delete super admin");
      }
      if (target.id === req.user!.id) {
        throw new AppError("Cannot delete yourself");
      }

      await prisma.user.delete({ where: { id: target.id } });
      res.json({ message: "Account deleted" });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/accounts/:id/notify",
  validate(
    z.object({
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(1000),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
      });
      if (!target) throw new AppError("Account not found", 404);

      const notification = await prisma.notification.create({
        data: {
          userId: target.id,
          title: req.body.title,
          message: req.body.message,
        },
      });

      res.status(201).json({ notification });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
