import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema } from "../validators/schemas.js";
import { carOwnerSelect, companyNameFromOwner } from "../lib/carOwner.js";
import {
  activeReservationSelect,
  currentReservationEnd,
  effectiveCarStatus,
} from "../lib/carAvailability.js";
import { carImagesFromRecord } from "../lib/carImages.js";
import { z } from "zod";

const router = Router();

const favoriteBody = z.object({
  body: z.object({ carId: z.string().cuid() }),
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        car: {
          include: {
            owner: carOwnerSelect,
            reservations: activeReservationSelect,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      favorites: favorites.map((f) => {
        const images = carImagesFromRecord(f.car);
        return {
          id: f.id,
          car: {
            ...f.car,
            status: effectiveCarStatus(f.car.status, f.car.reservations),
            reservedUntil: currentReservationEnd(f.car.reservations),
            images,
            imageUrl: images[0] || f.car.imageUrl,
            pricePerDay: Number(f.car.pricePerDay),
            companyName: companyNameFromOwner(f.car.owner),
            isFavorite: true,
            owner: undefined,
            reservations: undefined,
          },
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, validate(favoriteBody), async (req, res, next) => {
  try {
    const { carId } = req.body;
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new AppError("Car not found", 404);

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_carId: { userId: req.user!.id, carId },
      },
      update: {},
      create: { userId: req.user!.id, carId },
    });

    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/:id",
  requireAuth,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      // :id is carId for convenience
      await prisma.favorite.deleteMany({
        where: { userId: req.user!.id, carId: req.params.id },
      });
      res.json({ message: "Removed from favorites" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
