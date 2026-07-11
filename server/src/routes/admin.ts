import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema } from "../validators/schemas.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res, next) => {
  try {
    const [cars, users, reservations, messages] = await Promise.all([
      prisma.car.count(),
      prisma.user.count(),
      prisma.reservation.findMany({
        where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
        include: {
          car: { select: { brand: true, model: true } },
          user: { select: { fullName: true } },
        },
      }),
      prisma.contactMessage.count(),
    ]);

    const revenue = reservations.reduce(
      (sum, r) => sum + Number(r.totalPrice),
      0
    );

    const countByCar: Record<string, number> = {};
    reservations.forEach((r) => {
      const key = `${r.car.brand} ${r.car.model}`;
      countByCar[key] = (countByCar[key] || 0) + 1;
    });
    const top = Object.entries(countByCar).sort((a, b) => b[1] - a[1])[0];

    const pendingPayments = await prisma.reservation.count({
      where: {
        status: { not: "CANCELLED" },
        paymentStatus: { not: "PAID" },
      },
    });

    const upcoming = reservations
      .slice()
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        car: `${r.car.brand} ${r.car.model}`,
        startDate: r.startDate,
        endDate: r.endDate,
        customer: r.user.fullName,
      }));

    res.json({
      stats: {
        cars,
        users,
        reservations: reservations.length,
        messages,
        revenue,
        topCar: top ? { name: top[0], count: top[1] } : null,
        pendingPayments,
        upcoming,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/messages", async (_req, res, next) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", validate(idParamSchema), async (req, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      throw new AppError("Cannot delete your own admin account");
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
