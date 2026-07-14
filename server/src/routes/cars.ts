import { optionalAuth, requireAuth, requireAdmin, requireContractorOrAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { carSchema, idParamSchema } from "../validators/schemas.js";
import { AppError } from "../middleware/error.js";
import { prisma } from "../lib/prisma.js";
import { carOwnerSelect, companyNameFromOwner } from "../lib/carOwner.js";
import { Prisma } from "@prisma/client";
import { Router } from "express";

const router = Router();

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const {
      search,
      type,
      status,
      fuel,
      transmission,
      location,
      minPrice,
      maxPrice,
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.CarWhereInput = {};

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { owner: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (type && type !== "all") where.type = type;
    if (status && status !== "all") {
      where.status = status as "AVAILABLE" | "RESERVED" | "MAINTENANCE";
    }
    if (fuel && fuel !== "all") where.fuel = fuel;
    if (transmission && transmission !== "all") where.transmission = transmission;
    if (location && location !== "all") {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = Number(minPrice);
      if (maxPrice) where.pricePerDay.lte = Number(maxPrice);
    }

    const cars = await prisma.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: carOwnerSelect,
        reviews: { select: { rating: true } },
        favorites: req.user
          ? { where: { userId: req.user.id }, select: { id: true } }
          : false,
      },
    });

    const data = cars.map((car) => {
      const count = car.reviews.length;
      const avg =
        count === 0
          ? 0
          : Math.round(
              (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
            ) / 10;
      return {
        ...car,
        pricePerDay: Number(car.pricePerDay),
        companyName: companyNameFromOwner(car.owner),
        ratingAvg: avg,
        ratingCount: count,
        isFavorite: Array.isArray(car.favorites) && car.favorites.length > 0,
        reviews: undefined,
        favorites: undefined,
        owner: undefined,
      };
    });

    res.json({ cars: data });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", requireAuth, requireContractorOrAdmin, async (req, res, next) => {
  try {
    const where: Prisma.CarWhereInput =
      req.user!.role === "CONTRACTOR" ? { ownerId: req.user!.id } : {};

    const cars = await prisma.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        reviews: { select: { rating: true } },
        _count: { select: { reservations: true } },
      },
    });

    res.json({
      cars: cars.map((car) => {
        const count = car.reviews.length;
        const avg =
          count === 0
            ? 0
            : Math.round(
                (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
              ) / 10;
        return {
          ...car,
          pricePerDay: Number(car.pricePerDay),
          ratingAvg: avg,
          ratingCount: count,
          reservationsCount: car._count.reservations,
          reviews: undefined,
          _count: undefined,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuth, validate(idParamSchema), async (req, res, next) => {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.id },
      include: {
        owner: carOwnerSelect,
        reviews: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
        },
        favorites: req.user
          ? { where: { userId: req.user.id }, select: { id: true } }
          : false,
      },
    });
    if (!car) throw new AppError("Car not found", 404);

    const count = car.reviews.length;
    const avg =
      count === 0
        ? 0
        : Math.round(
            (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
          ) / 10;

    res.json({
      car: {
        ...car,
        pricePerDay: Number(car.pricePerDay),
        companyName: companyNameFromOwner(car.owner),
        ratingAvg: avg,
        ratingCount: count,
        isFavorite: Array.isArray(car.favorites) && car.favorites.length > 0,
        favorites: undefined,
        owner: undefined,
        reviews: car.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          userName: r.user.fullName,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  requireContractorOrAdmin,
  validate(carSchema),
  async (req, res, next) => {
    try {
      const ownerId =
        req.user!.role === "CONTRACTOR" ? req.user!.id : req.body.ownerId || null;

      const car = await prisma.car.create({
        data: { ...req.body, ownerId },
      });
      res.status(201).json({ car: { ...car, pricePerDay: Number(car.pricePerDay) } });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireContractorOrAdmin,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError("Car not found", 404);

      if (
        req.user!.role === "CONTRACTOR" &&
        existing.ownerId !== req.user!.id
      ) {
        throw new AppError("Forbidden", 403);
      }

      const parsed = carSchema.shape.body.partial().parse(req.body);
      const car = await prisma.car.update({
        where: { id: req.params.id },
        data: parsed,
      });
      res.json({ car: { ...car, pricePerDay: Number(car.pricePerDay) } });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireContractorOrAdmin,
  validate(idParamSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.car.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new AppError("Car not found", 404);

      if (
        req.user!.role === "CONTRACTOR" &&
        existing.ownerId !== req.user!.id
      ) {
        throw new AppError("Forbidden", 403);
      }

      await prisma.car.delete({ where: { id: req.params.id } });
      res.json({ message: "Car deleted" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
