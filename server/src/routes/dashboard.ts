import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireContractorOrAdmin,
} from "../middleware/auth.js";
import { todayStamp } from "../lib/carAvailability.js";
import { LOCATIONS } from "../lib/pricing.js";

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
          car: {
            select: {
              id: true,
              brand: true,
              model: true,
              imageUrl: true,
            },
          },
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
      {
        carId: string;
        label: string;
        count: number;
        revenue: number;
        imageUrl: string | null;
      }
    > = {};
    for (const r of reservations) {
      if (r.status === "CANCELLED" || r.status === "REJECTED") continue;
      const id = r.car.id;
      if (!carCounts[id]) {
        carCounts[id] = {
          carId: id,
          label: `${r.car.brand} ${r.car.model}`,
          count: 0,
          revenue: 0,
          imageUrl: r.car.imageUrl || null,
        };
      }
      carCounts[id].count += 1;
      if (r.status === "CONFIRMED" || r.status === "COMPLETED") {
        carCounts[id].revenue += Number(r.totalPrice);
      }
    }
    const topCars = Object.values(carCounts)
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
      }))
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

router.get("/customers", async (req, res, next) => {
  try {
    const isContractor = req.user!.role === "CONTRACTOR";
    const reservationWhere: Prisma.ReservationWhereInput = isContractor
      ? { car: { ownerId: req.user!.id } }
      : {};

    const rows = await prisma.reservation.findMany({
      where: reservationWhere,
      select: {
        id: true,
        status: true,
        totalPrice: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        car: { select: { brand: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byUser = new Map<
      string,
      {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        memberSince: string;
        bookings: number;
        revenue: number;
        lastBookingId: string;
        lastCar: string;
        lastStart: string;
        lastEnd: string;
        lastStatus: string;
      }
    >();

    for (const r of rows) {
      const u = r.user;
      const existing = byUser.get(u.id);
      const amount =
        r.status === "CONFIRMED" || r.status === "COMPLETED"
          ? Number(r.totalPrice)
          : 0;
      if (!existing) {
        byUser.set(u.id, {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          memberSince: u.createdAt.toISOString().slice(0, 10),
          bookings: 1,
          revenue: amount,
          lastBookingId: r.id,
          lastCar: `${r.car.brand} ${r.car.model}`,
          lastStart: r.startDate.toISOString().slice(0, 10),
          lastEnd: r.endDate.toISOString().slice(0, 10),
          lastStatus: r.status,
        });
      } else {
        existing.bookings += 1;
        existing.revenue += amount;
      }
    }

    const customers = Array.from(byUser.values())
      .map((c) => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
      }))
      .sort((a, b) => b.bookings - a.bookings);

    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

router.get("/reviews", async (req, res, next) => {
  try {
    const isContractor = req.user!.role === "CONTRACTOR";
    const reviews = await prisma.review.findMany({
      where: isContractor ? { car: { ownerId: req.user!.id } } : {},
      include: {
        user: { select: { fullName: true, email: true } },
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            imageUrl: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        userName: r.user.fullName,
        userEmail: r.user.email,
        carId: r.car.id,
        carLabel: `${r.car.brand} ${r.car.model}`,
        carYear: r.car.year,
        carImage: r.car.imageUrl,
      })),
      average:
        reviews.length === 0
          ? 0
          : Math.round(
              (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
            ) / 10,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/locations", async (req, res, next) => {
  try {
    const isContractor = req.user!.role === "CONTRACTOR";
    const reservationWhere: Prisma.ReservationWhereInput = isContractor
      ? { car: { ownerId: req.user!.id } }
      : {};

    const [reservations] = await Promise.all([
      prisma.reservation.findMany({
        where: reservationWhere,
        select: {
          pickupLocation: true,
          returnLocation: true,
          status: true,
          totalPrice: true,
        },
      }),
    ]);

    const stats = new Map<
      string,
      { name: string; pickups: number; returns: number; revenue: number }
    >();

    for (const loc of LOCATIONS) {
      stats.set(loc.name, {
        name: loc.name,
        pickups: 0,
        returns: 0,
        revenue: 0,
      });
    }

    for (const r of reservations) {
      const pickup = stats.get(r.pickupLocation) || {
        name: r.pickupLocation,
        pickups: 0,
        returns: 0,
        revenue: 0,
      };
      pickup.pickups += 1;
      if (r.status === "CONFIRMED" || r.status === "COMPLETED") {
        pickup.revenue += Number(r.totalPrice);
      }
      stats.set(r.pickupLocation, pickup);

      const ret = stats.get(r.returnLocation) || {
        name: r.returnLocation,
        pickups: 0,
        returns: 0,
        revenue: 0,
      };
      ret.returns += 1;
      stats.set(r.returnLocation, ret);
    }

    res.json({
      locations: LOCATIONS.map((l) => ({
        id: l.id,
        name: l.name,
        fee: l.fee,
        pickups: stats.get(l.name)?.pickups || 0,
        returns: stats.get(l.name)?.returns || 0,
        revenue: Math.round((stats.get(l.name)?.revenue || 0) * 100) / 100,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
