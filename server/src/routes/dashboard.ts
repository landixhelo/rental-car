import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireContractorOrAdmin,
} from "../middleware/auth.js";
import { todayStamp } from "../lib/carAvailability.js";

const router = Router();

router.use(requireAuth, requireContractorOrAdmin);

router.get("/", async (req, res, next) => {
  try {
    const role = req.user!.role;
    const isContractor = role === "CONTRACTOR";

    const carWhere: Prisma.CarWhereInput = isContractor
      ? { ownerId: req.user!.id }
      : {};

    const reservationWhere: Prisma.ReservationWhereInput = isContractor
      ? { car: { ownerId: req.user!.id } }
      : {};

    const today = new Date(todayStamp());

    const [
      carsTotal,
      carsAvailable,
      carsReserved,
      carsMaintenance,
      reservations,
      pendingDocuments,
      heldDeposits,
      activeBookings,
    ] = await Promise.all([
      prisma.car.count({ where: carWhere }),
      prisma.car.count({ where: { ...carWhere, status: "AVAILABLE" } }),
      prisma.car.count({ where: { ...carWhere, status: "RESERVED" } }),
      prisma.car.count({ where: { ...carWhere, status: "MAINTENANCE" } }),
      prisma.reservation.findMany({
        where: reservationWhere,
        select: {
          id: true,
          status: true,
          totalPrice: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          documentStatus: true,
          depositStatus: true,
          car: { select: { id: true, brand: true, model: true } },
          user: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.reservation.count({
        where: { ...reservationWhere, documentStatus: "PENDING" },
      }),
      prisma.reservation.count({
        where: { ...reservationWhere, depositStatus: "HELD" },
      }),
      prisma.reservation.count({
        where: {
          ...reservationWhere,
          status: { in: ["PENDING", "CONFIRMED"] },
          endDate: { gte: today },
        },
      }),
    ]);

    const byStatus = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      REJECTED: 0,
    };
    for (const r of reservations) {
      if (r.status in byStatus) {
        byStatus[r.status as keyof typeof byStatus] += 1;
      }
    }

    const revenue = reservations
      .filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED")
      .reduce((sum, r) => sum + Number(r.totalPrice), 0);

    // Last 12 months revenue series (YYYY-MM)
    const monthKeys: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthKeys.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      );
    }
    const revenueByMonth: Record<string, number> = Object.fromEntries(
      monthKeys.map((k) => [k, 0])
    );
    for (const r of reservations) {
      if (r.status !== "CONFIRMED" && r.status !== "COMPLETED") continue;
      const key = r.createdAt.toISOString().slice(0, 7);
      if (key in revenueByMonth) {
        revenueByMonth[key] += Number(r.totalPrice);
      }
    }
    const monthlyRevenue = monthKeys.map((month) => ({
      month,
      total: Math.round(revenueByMonth[month] * 100) / 100,
    }));

    const carCounts: Record<
      string,
      { carId: string; label: string; count: number }
    > = {};
    for (const r of reservations) {
      if (r.status === "CANCELLED" || r.status === "REJECTED") continue;
      const id = r.car.id;
      if (!carCounts[id]) {
        carCounts[id] = {
          carId: id,
          label: `${r.car.brand} ${r.car.model}`,
          count: 0,
        };
      }
      carCounts[id].count += 1;
    }
    const topCars = Object.values(carCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recent = reservations.slice(0, 8).map((r) => ({
      id: r.id,
      status: r.status,
      totalPrice: Number(r.totalPrice),
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
      carLabel: `${r.car.brand} ${r.car.model}`,
      customerName: r.user.fullName,
      customerEmail: r.user.email,
      createdAt: r.createdAt.toISOString(),
    }));

    const availabilityPct =
      carsTotal === 0
        ? 0
        : Math.round((carsAvailable / carsTotal) * 1000) / 10;

    res.json({
      scope: isContractor ? "fleet" : "platform",
      fleet: {
        total: carsTotal,
        available: carsAvailable,
        reserved: carsReserved,
        maintenance: carsMaintenance,
        availabilityPct,
      },
      reservations: {
        total: reservations.length,
        byStatus,
        active: activeBookings,
      },
      revenue: {
        total: Math.round(revenue * 100) / 100,
        monthly: monthlyRevenue,
      },
      ops: {
        pendingDocuments,
        heldDeposits,
      },
      recent,
      topCars,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
