import { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { requireAuth, requireAdmin, requireContractorOrAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { idParamSchema, reservationSchema } from "../validators/schemas.js";
import { EXTRAS, calcDays, getLocation } from "../lib/pricing.js";
import { sendMail, sendReservationEmails } from "../lib/mail.js";
import { buildReservationPdf } from "../lib/pdfContract.js";
import { createCheckoutSession, stripeEnabled } from "../lib/stripePay.js";
import { assertCustomerCanCancel } from "../lib/cancellation.js";
import { cancellationPolicyText } from "../lib/cancellation.js";
import { env } from "../config/env.js";
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
        depositAmount: Number(r.depositAmount),
        car: {
          ...r.car,
          companyName: r.car.owner?.companyName?.trim() || "AutoRent",
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
        depositAmount: Number(r.depositAmount),
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

      // Half-open [start, end): return day can be the next customer's pickup day.
      const overlap = await prisma.reservation.findFirst({
        where: {
          carId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startDate: { lt: end },
          endDate: { gt: start },
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

      if (paymentMethod === "CARD" && !stripeEnabled()) {
        throw new AppError(
          "Pagesa me kartë nuk është aktive ende. Zgjidh Cash ose Bank Transfer.",
          400
        );
      }

      let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
      let bookingStatus: "PENDING" | "CONFIRMED" = "CONFIRMED";
      if (paymentMethod === "CARD") {
        paymentStatus = PaymentStatus.PENDING;
        bookingStatus = "PENDING";
      } else if (paymentMethod === "BANK_TRANSFER") {
        paymentStatus = PaymentStatus.AWAITING_TRANSFER;
      } else {
        paymentStatus = PaymentStatus.PAY_ON_PICKUP;
      }

      const hasDocument = Boolean(req.file);
      const depositAmount =
        env.DEFAULT_DEPOSIT_EUR > 0
          ? env.DEFAULT_DEPOSIT_EUR
          : Number(car.pricePerDay);

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
          documentUrl: hasDocument ? `/uploads/${req.file!.filename}` : null,
          documentStatus: hasDocument ? "PENDING" : "NONE",
          depositAmount,
          depositStatus: depositAmount > 0 ? "HELD" : "NONE",
          status: bookingStatus,
        },
        include: {
          car: {
            select: {
              brand: true,
              model: true,
              imageUrl: true,
              year: true,
              ownerId: true,
              owner: { select: { email: true } },
            },
          },
          user: { select: { fullName: true, email: true, phone: true } },
        },
      });

      let checkoutUrl: string | null = null;
      if (paymentMethod === "CARD") {
        try {
          const session = await createCheckoutSession({
            reservationId: created.id,
            amountEur: Number(created.totalPrice),
            carLabel: `${created.car.brand} ${created.car.model}`,
            customerEmail: created.user.email,
          });
          checkoutUrl = session.url;
          await prisma.reservation.update({
            where: { id: created.id },
            data: { stripeSessionId: session.id },
          });
        } catch (stripeErr) {
          console.error("Stripe checkout failed:", stripeErr);
          // Reservation exists — mark clearly and ask user to pay another way / retry
          await prisma.reservation.update({
            where: { id: created.id },
            data: {
              status: "PENDING",
              paymentStatus: PaymentStatus.PENDING,
            },
          });
          throw new AppError(
            "Pagesa me kartë dështoi. Rezervimi u ruajt si PENDING — zgjidh Cash/Transfer ose provo përsëri.",
            502
          );
        }
      }

      // Notifications / email are best-effort (reservation already saved)
      try {
        const title =
          bookingStatus === "PENDING"
            ? "Rezervimi u krijua — prisni pagesën"
            : "Rezervimi u konfirmua";
        await prisma.notification.create({
          data: {
            userId: req.user!.id,
            title,
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

        let invoicePdf: Buffer | null = null;
        try {
          const extras = Array.isArray(created.extras)
            ? (created.extras as Array<{ name?: string; price?: number }>)
            : [];
          invoicePdf = await buildReservationPdf({
            id: created.id,
            customerName: created.user.fullName,
            customerEmail: created.user.email,
            customerPhone: created.user.phone,
            carLabel: `${created.car.brand} ${created.car.model} (${created.car.year})`,
            startDate,
            endDate,
            totalDays: created.totalDays,
            pickupLocation: created.pickupLocation,
            returnLocation: created.returnLocation,
            paymentMethod: created.paymentMethod,
            paymentStatus: created.paymentStatus,
            status: created.status,
            carSubtotal: Number(created.carSubtotal),
            extrasTotal: Number(created.extrasTotal),
            locationFees: Number(created.locationFees),
            totalPrice: Number(created.totalPrice),
            depositAmount: Number(created.depositAmount || 0),
            depositStatus: created.depositStatus,
            extras,
            createdAt: created.createdAt.toISOString().slice(0, 10),
          });
        } catch (pdfErr) {
          console.error(
            "[mail] invoice PDF failed — sending reservation email without attachment:",
            pdfErr instanceof Error ? pdfErr.message : pdfErr
          );
        }

        await sendReservationEmails({
          customerEmail: created.user.email,
          customerName: created.user.fullName,
          carLabel: `${created.car.brand} ${created.car.model}`,
          startDate,
          endDate,
          totalPrice: Number(created.totalPrice),
          paymentMethod,
          paymentStatus,
          status: bookingStatus,
          adminEmail: env.ADMIN_EMAIL || env.BUSINESS_EMAIL,
          ownerEmail: created.car.owner?.email,
          invoicePdf,
          invoiceFilename: `autorent-fature-${created.id.slice(0, 8)}.pdf`,
        });
      } catch (notifyErr) {
        console.error("Notification/email failed after reservation:", notifyErr);
      }

      res.status(201).json({
        reservation: {
          ...created,
          carSubtotal: Number(created.carSubtotal),
          extrasTotal: Number(created.extrasTotal),
          locationFees: Number(created.locationFees),
          totalPrice: Number(created.totalPrice),
        },
        checkoutUrl,
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
        include: {
          user: { select: { email: true, fullName: true } },
          car: { select: { brand: true, model: true } },
        },
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

      const decision = assertCustomerCanCancel(
        reservation.startDate,
        req.user!.role
      );

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED" },
      });

      try {
        await sendMail({
          to: reservation.user.email,
          subject: "AutoRent — rezervimi u anulua",
          text: `Përshëndetje ${reservation.user.fullName},\n\nRezervimi për ${reservation.car.brand} ${reservation.car.model} u anulua.\n\n${decision.refundNote}\n\nPolitika: ${cancellationPolicyText()}\n\nAutoRent`,
        });
        if (env.ADMIN_EMAIL) {
          await sendMail({
            to: env.ADMIN_EMAIL,
            subject: `Anulim rezervimi — ${reservation.car.brand} ${reservation.car.model}`,
            text: `${reservation.user.fullName} anuloi rezervimin ${reservation.id}.\n${decision.refundNote}\nFree cancel: ${decision.freeCancel}`,
          });
        }
      } catch (mailErr) {
        console.error("Cancel email failed:", mailErr);
      }

      res.json({
        reservation: updated,
        cancellation: {
          freeCancel: decision.freeCancel,
          refundNote: decision.refundNote,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id/contract.pdf",
  requireAuth,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: {
          user: {
            select: { fullName: true, email: true, phone: true, id: true },
          },
          car: {
            select: { brand: true, model: true, year: true, ownerId: true },
          },
        },
      });
      if (!reservation) throw new AppError("Reservation not found", 404);

      const role = req.user!.role;
      const isOwner =
        reservation.userId === req.user!.id ||
        reservation.car.ownerId === req.user!.id ||
        role === "ADMIN" ||
        role === "SUPER_ADMIN";
      if (!isOwner) throw new AppError("Forbidden", 403);

      const extras = Array.isArray(reservation.extras)
        ? (reservation.extras as Array<{ name?: string; price?: number }>)
        : [];

      const pdf = await buildReservationPdf({
        id: reservation.id,
        customerName: reservation.user.fullName,
        customerEmail: reservation.user.email,
        customerPhone: reservation.user.phone,
        carLabel: `${reservation.car.brand} ${reservation.car.model} (${reservation.car.year})`,
        startDate: reservation.startDate.toISOString().slice(0, 10),
        endDate: reservation.endDate.toISOString().slice(0, 10),
        totalDays: reservation.totalDays,
        pickupLocation: reservation.pickupLocation,
        returnLocation: reservation.returnLocation,
        paymentMethod: reservation.paymentMethod,
        paymentStatus: reservation.paymentStatus,
        status: reservation.status,
        carSubtotal: Number(reservation.carSubtotal),
        extrasTotal: Number(reservation.extrasTotal),
        locationFees: Number(reservation.locationFees),
        totalPrice: Number(reservation.totalPrice),
        depositAmount: Number(reservation.depositAmount || 0),
        depositStatus: reservation.depositStatus,
        extras,
        createdAt: reservation.createdAt.toISOString().slice(0, 10),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="autorent-fature-${reservation.id.slice(0, 8)}.pdf"`
      );
      res.send(pdf);
    } catch (err) {
      next(err);
    }
  }
);

const paymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum([
      "PENDING",
      "AWAITING_TRANSFER",
      "PAY_ON_PICKUP",
      "PAID",
    ]),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const documentStatusSchema = z.object({
  body: z.object({
    documentStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    documentNote: z.string().trim().max(500).optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const depositStatusSchema = z.object({
  body: z.object({
    depositStatus: z.enum(["HELD", "RETURNED", "FORFEITED"]),
    depositAmount: z.coerce.number().min(0).max(10000).optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.patch(
  "/:id/payment",
  requireAuth,
  requireContractorOrAdmin,
  validate(paymentStatusSchema),
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

      const paymentStatus = req.body.paymentStatus as PaymentStatus;
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus,
          ...(paymentStatus === "PAID" && reservation.status === "PENDING"
            ? { status: "CONFIRMED" }
            : {}),
        },
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

async function assertFleetAccess(
  reservationId: string,
  user: { id: string; role: string } | undefined
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      car: { select: { ownerId: true } },
      user: { select: { email: true, fullName: true } },
    },
  });
  if (!reservation) throw new AppError("Reservation not found", 404);
  if (!user) throw new AppError("Forbidden", 403);
  if (
    user.role === "CONTRACTOR" &&
    reservation.car.ownerId !== user.id
  ) {
    throw new AppError("Forbidden", 403);
  }
  if (
    user.role !== "CONTRACTOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    throw new AppError("Forbidden", 403);
  }
  return reservation;
}

router.patch(
  "/:id/document",
  requireAuth,
  requireContractorOrAdmin,
  validate(documentStatusSchema),
  async (req, res, next) => {
    try {
      const reservation = await assertFleetAccess(req.params.id, req.user);
      if (!reservation.documentUrl && req.body.documentStatus !== "PENDING") {
        throw new AppError("Nuk ka dokument të ngarkuar për këtë rezervim", 400);
      }

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          documentStatus: req.body.documentStatus,
          documentNote: req.body.documentNote || null,
        },
      });

      try {
        await sendMail({
          to: reservation.user.email,
          subject: `AutoRent — dokumenti: ${req.body.documentStatus}`,
          text: `Përshëndetje ${reservation.user.fullName},\n\nStatusi i dokumentit të rezervimit: ${req.body.documentStatus}.\n${req.body.documentNote ? `Shënim: ${req.body.documentNote}\n` : ""}\nAutoRent`,
        });
      } catch (e) {
        console.error("Document status email failed:", e);
      }

      res.json({ reservation: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id/deposit",
  requireAuth,
  requireContractorOrAdmin,
  validate(depositStatusSchema),
  async (req, res, next) => {
    try {
      await assertFleetAccess(req.params.id, req.user);
      const updated = await prisma.reservation.update({
        where: { id: req.params.id },
        data: {
          depositStatus: req.body.depositStatus,
          ...(req.body.depositAmount != null
            ? { depositAmount: req.body.depositAmount }
            : {}),
        },
      });
      res.json({
        reservation: {
          ...updated,
          depositAmount: Number(updated.depositAmount),
        },
      });
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
