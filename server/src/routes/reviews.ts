import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, reviewSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", requireAuth, validate(reviewSchema), async (req, res, next) => {
  try {
    const { carId, rating, comment } = req.body;
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new AppError("Car not found", 404);

    const review = await prisma.review.upsert({
      where: {
        userId_carId: { userId: req.user!.id, carId },
      },
      update: { rating, comment },
      create: {
        userId: req.user!.id,
        carId,
        rating,
        comment,
      },
      include: { user: { select: { fullName: true } } },
    });

    res.status(201).json({
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        userName: review.user.fullName,
        createdAt: review.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/car/:id", validate(idParamSchema), async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { carId: req.params.id },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: r.user.fullName,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
