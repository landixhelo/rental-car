import { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { idParamSchema, reservationSchema } from "../validators/schemas.js";
import { EXTRAS, calcDays, getLocation } from "../lib/pricing.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { Router } from "express";

const router = Router();

const statusSchema = z.object({
  body: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED"]),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user!.id },
      include: {
        car: {
          select: {
            brand: true,
            model: true,
            year: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      reservations: reservations.map((r) => ({
        ...r,
        carSubtotal: Number(r.carSubtotal),
        extrasTotal: Number(r.extrasTotal),
        locationFees: Number(r.locationFees),
        totalPrice: Number(r.totalPrice),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        car: { select: { brand: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      reservations: reservations.map((r) => ({
        ...r,
        carSubtotal: Number(r.carSubtotal),
        extrasTotal: Number(r.extrasTotal),
        locationFees: Number(r.locationFees),
        totalPrice: Number(r.totalPrice),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  upload.single("document"),
  async (req, res, next) => {
    try {
      const raw = req.body || {};
      const extrasRaw = raw.extras;
      const extras = Array.isArray(extrasRaw)
        ? extrasRaw
        : typeof extrasRaw === "string" && extrasRaw
          ? [extrasRaw]
          : [];

      const body = reservationSchema.shape.body.parse({
        carId: raw.carId,
        startDate: raw.startDate,
        endDate: raw.endDate,
        pickupLocationId: raw.pickupLocationId,
        returnLocationId: raw.returnLocationId,
        extras,
        paymentMethod: raw.paymentMethod,
        notes: raw.notes || undefined,
      });

      const {
        carId,
        startDate,
        endDate,
        pickupLocationId,
        returnLocationId,
        paymentMethod,
        notes,
      } = body;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) throw new AppError("Start date cannot be in the past");
      const totalDays = calcDays(start, end);
      if (totalDays <= 0) throw new AppError("Invalid date range");

      const car = await prisma.car.findUnique({ where: { id: carId } });
      if (!car) throw new AppError("Car not found", 404);
      if (car.status === "MAINTENANCE") {
        throw new AppError("Car is under maintenance");
      }

      const selectedExtras = EXTRAS.filter((e) => body.extras.includes(e.id));
      const pickup = getLocation(pickupLocationId);
      const ret = getLocation(returnLocationId);
      const carSubtotal = totalDays * Number(car.pricePerDay);
      const extrasTotal = selectedExtras.reduce(
        (sum, e) => sum + e.price * totalDays,
        0
      );
      const locationFees = pickup.fee + ret.fee;
      const totalPrice = carSubtotal + extrasTotal + locationFees;

      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
      if (paymentMethod === "CARD") paymentStatus = PaymentStatus.PAID;
      else if (paymentMethod === "BANK_TRANSFER") {
        paymentStatus = PaymentStatus.AWAITING_TRANSFER;
      } else paymentStatus = PaymentStatus.PAY_ON_PICKUP;

      const reservation = await prisma.$transaction(async (tx) => {
        const overlap = await tx.reservation.findFirst({
          where: {
            carId,
            status: { notIn: ["CANCELLED", "REJECTED"] },
            startDate: { lte: end },
            endDate: { gte: start },
          },
        });
        if (overlap) {
          throw new AppError("Car is not available for these dates", 409);
        }

        const created = await tx.reservation.create({
          data: {
            userId: req.user!.id,
            carId,
            startDate: start,
            endDate: end,
            totalDays,
            carSubtotal,
            extras: selectedExtras,
            extrasTotal,
            pickupLocation: pickup.name,
            returnLocation: ret.name,
            locationFees,
            totalPrice,
            notes,
            paymentMethod,
            paymentStatus,
            documentUrl: req.file ? `/uploads/${req.file.filename}` : null,
            status: "CONFIRMED",
          },
          include: {
            car: {
              select: { brand: true, model: true, imageUrl: true, year: true },
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: req.user!.id,
            title: "Rezervimi u konfirmua",
            message: `Rezervimi për ${created.car.brand} ${created.car.model} (${startDate} → ${endDate}) u ruajt. Pagesa: ${paymentMethod}.`,
          },
        });

        return created;
      });

      res.status(201).json({
        reservation: {
          ...reservation,
          carSubtotal: Number(reservation.carSubtotal),
          extrasTotal: Number(reservation.extrasTotal),
          locationFees: Number(reservation.locationFees),
          totalPrice: Number(reservation.totalPrice),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/cancel",
  requireAuth,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
      });
      if (!reservation) throw new AppError("Reservation not found", 404);
      if (
        reservation.userId !== req.user!.id &&
        req.user!.role !== "ADMIN" &&
        req.user!.role !== "SUPER_ADMIN"
      ) {
        throw new AppError("Forbidden", 403);
      }
      if (["CANCELLED", "COMPLETED", "REJECTED"].includes(reservation.status)) {
        throw new AppError("Reservation cannot be cancelled");
      }

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED" },
      });
      res.json({ reservation: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const updated = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      });
      res.json({ reservation: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      await prisma.reservation.delete({ where: { id: req.params.id } });
      res.json({ message: "Reservation deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
