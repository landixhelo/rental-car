import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idParamSchema, reviewSchema } from "../validators/schemas.js";

const router = Router();

function reviewName(r: {
  authorName?: string | null;
  user?: { fullName: string } | null;
}) {
  return (r.authorName || r.user?.fullName || "").trim() || "—";
}

router.get("/", async (_req, res, next) => {
  try {
    const [reviews, agg] = await Promise.all([
      prisma.review.findMany({
        where: { comment: { not: null } },
        include: {
          user: { select: { fullName: true } },
          car: { select: { brand: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    res.json({
      average: Number(agg._avg.rating || 0),
      count: agg._count._all,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: reviewName(r),
        carLabel: `${r.car.brand} ${r.car.model}`,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", optionalAuth, validate(reviewSchema), async (req, res, next) => {
  try {
    const { carId, rating, comment, authorName } = req.body;
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new AppError("Car not found", 404);

    const name = String(authorName).trim();
    const userId = req.user?.id || null;

    const review = userId
      ? await prisma.review.upsert({
          where: {
            userId_carId: { userId, carId },
          },
          update: { rating, comment, authorName: name },
          create: {
            userId,
            carId,
            rating,
            comment,
            authorName: name,
          },
          include: { user: { select: { fullName: true } } },
        })
      : await prisma.review.create({
          data: {
            carId,
            rating,
            comment,
            authorName: name,
          },
          include: { user: { select: { fullName: true } } },
        });

    res.status(201).json({
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        userName: reviewName(review),
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
        userName: reviewName(r),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
