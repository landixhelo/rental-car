import { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { requireAuth, requireAdmin, requireContractorOrAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { idParamSchema, reservationSchema } from "../validators/schemas.js";
import { EXTRAS, calcDays, getLocation } from "../lib/pricing.js";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { Router } from "express";

const router = Router();

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new AppError("Invalid date format");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

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
            owner: {
              select: { companyName: true, fullName: true },
            },
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
        car: {
          ...r.car,
          companyName:
            r.car.owner?.companyName?.trim() ||
            r.car.owner?.fullName ||
            "AutoRent",
          owner: undefined,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/fleet", requireAuth, requireContractorOrAdmin, async (req, res, next) => {
  try {
    const isContractor = req.user!.role === "CONTRACTOR";

    // Resolve owned car IDs first so fleet bookings always match the contractor's cars.
    const ownedCars = isContractor
      ? await prisma.car.findMany({
          where: { ownerId: req.user!.id },
          select: { id: true },
        })
      : [];

    const where = isContractor
      ? ownedCars.length > 0
        ? { carId: { in: ownedCars.map((c) => c.id) } }
        : { id: "__no_fleet_cars__" }
      : {};

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        car: {
          select: {
            brand: true,
            model: true,
            year: true,
            imageUrl: true,
            ownerId: true,
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
  (req, res, next) => {
    upload.single("document")(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      const raw = req.body || {};
      const extrasRaw = raw.extras;
      const extras = Array.isArray(extrasRaw)
        ? extrasRaw
        : typeof extrasRaw === "string" && extrasRaw
          ? (() => {
              try {
                const parsed = JSON.parse(extrasRaw);
                return Array.isArray(parsed) ? parsed : [extrasRaw];
              } catch {
                return [extrasRaw];
              }
            })()
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

      // Parse YYYY-MM-DD as UTC date-only to match Prisma @db.Date
      const start = parseDateOnly(startDate);
      const end = parseDateOnly(endDate);
      const today = parseDateOnly(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Tirane",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date())
      );

      if (start < today) {
        throw new AppError("Data e fillimit nuk mund të jetë në të kaluarën");
      }
      const totalDays = calcDays(start, end);
      if (totalDays <= 0) throw new AppError("Intervali i datave është i pavlefshëm");

      const car = await prisma.car.findUnique({ where: { id: carId } });
      if (!car) throw new AppError("Car not found", 404);
      if (car.status === "MAINTENANCE") {
        throw new AppError("Makina është në mirëmbajtje");
      }

      const overlap = await prisma.reservation.findFirst({
        where: {
          carId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (overlap) {
        throw new AppError(
          "Makina është e rezervuar për këto data. Zgjidh data të tjera.",
          409
        );
      }

      const selectedExtras = EXTRAS.filter((e) => body.extras.includes(e.id)).map(
        (e) => ({ id: e.id, name: e.name, price: e.price })
      );
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

      const created = await prisma.reservation.create({
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
            select: {
              brand: true,
              model: true,
              imageUrl: true,
              year: true,
              ownerId: true,
            },
          },
          user: { select: { fullName: true, email: true, phone: true } },
        },
      });

      // Notifications are best-effort (reservation already saved)
      try {
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            title: "Rezervimi u konfirmua",
            message: `Rezervimi për ${created.car.brand} ${created.car.model} (${startDate} → ${endDate}) u ruajt. Pagesa: ${paymentMethod}.`,
          },
        });

        if (created.car.ownerId && created.car.ownerId !== req.user!.id) {
          await prisma.notification.create({
            data: {
              userId: created.car.ownerId,
              title: "Rezervim i ri nga klienti",
              message: `${created.user.fullName} rezervoi ${created.car.brand} ${created.car.model} (${startDate} → ${endDate}). Totali: €${Number(created.totalPrice)}.`,
            },
          });
        }

        const superAdmins = await prisma.user.findMany({
          where: { role: "SUPER_ADMIN", isActive: true },
          select: { id: true },
        });
        for (const admin of superAdmins) {
          if (admin.id === req.user!.id || admin.id === created.car.ownerId) {
            continue;
          }
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "Rezervim i ri",
              message: `${created.user.fullName} rezervoi ${created.car.brand} ${created.car.model} (${startDate} → ${endDate}). Totali: €${Number(created.totalPrice)}.`,
            },
          });
        }
      } catch (notifyErr) {
        console.error("Notification failed after reservation:", notifyErr);
      }

      res.status(201).json({
        reservation: {
          ...created,
          carSubtotal: Number(created.carSubtotal),
          extrasTotal: Number(created.extrasTotal),
          locationFees: Number(created.locationFees),
          totalPrice: Number(created.totalPrice),
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
  requireContractorOrAdmin,
  validate(statusSchema),
  async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: { car: { select: { ownerId: true } } },
      });
      if (!reservation) throw new AppError("Reservation not found", 404);

      if (
        req.user!.role === "CONTRACTOR" &&
        reservation.car.ownerId !== req.user!.id
      ) {
        throw new AppError("Forbidden", 403);
      }

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
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
