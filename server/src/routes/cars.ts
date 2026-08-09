import { optionalAuth, requireAuth, requireContractorOrAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  carBodyObject,
  carPublicParamSchema,
  carSchema,
  idParamSchema,
} from "../validators/schemas.js";
import { uniqueCarSlug } from "../lib/slug.js";
import { AppError } from "../middleware/error.js";
import { prisma } from "../lib/prisma.js";
import {
  carOwnerSelect,
  companyNameFromOwner,
  shopSlugFromOwner,
} from "../lib/carOwner.js";
import {
  activeReservationSelect,
  currentReservationEnd,
  effectiveCarStatus,
  toBusyRanges,
} from "../lib/carAvailability.js";
import {
  carImagesFromRecord,
  normalizeCarImages,
  asStringArray,
} from "../lib/carImages.js";
import { uploadCarImages } from "../middleware/upload.js";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import fs from "fs";

const router = Router();

function parseFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function uploadedPaths(files: Express.Multer.File[] | undefined) {
  return (files || []).map((f) => `/uploads/${f.filename}`);
}

function withImages<T extends { imageUrl: string; images?: unknown }>(car: T) {
  const images = carImagesFromRecord(car);
  return {
    ...car,
    images,
    imageUrl: images[0] || car.imageUrl,
  };
}

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
      startDate,
      endDate,
    } = req.query as Record<string, string | undefined>;

    const where: Prisma.CarWhereInput = {
      // Marketplace: only published rental listings on the public fleet.
      listingStatus: "PUBLISHED",
    };

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
    // Status filter applied after computing live availability from reservations.
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

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
        where.status = { not: "MAINTENANCE" };
        where.NOT = {
          reservations: {
            some: {
              status: { in: ["PENDING", "CONFIRMED"] },
              startDate: { lt: end },
              endDate: { gt: start },
            },
          },
        };
      }
    }

    const cars = await prisma.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: carOwnerSelect,
        reviews: { select: { rating: true } },
        reservations: activeReservationSelect(),
        favorites: req.user
          ? { where: { userId: req.user.id }, select: { id: true } }
          : false,
      },
    });

    const data = cars
      .map((car) => {
        const count = car.reviews.length;
        const avg =
          count === 0
            ? 0
            : Math.round(
                (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
              ) / 10;
        const liveStatus = effectiveCarStatus(car.status, car.reservations);
        return withImages({
          ...car,
          status: liveStatus,
          reservedUntil: currentReservationEnd(car.reservations),
          pricePerDay: Number(car.pricePerDay),
          companyName: companyNameFromOwner(car.owner),
          shopSlug: shopSlugFromOwner(car.owner),
          ratingAvg: avg,
          ratingCount: count,
          isFavorite: Array.isArray(car.favorites) && car.favorites.length > 0,
          reviews: undefined,
          favorites: undefined,
          owner: undefined,
          reservations: undefined,
        });
      })
      .filter((car) => {
        if (!status || status === "all") return true;
        return car.status === status;
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
        reservations: activeReservationSelect(),
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
        return withImages({
          ...car,
          status: effectiveCarStatus(car.status, car.reservations),
          reservedUntil: currentReservationEnd(car.reservations),
          pricePerDay: Number(car.pricePerDay),
          ratingAvg: avg,
          ratingCount: count,
          reservationsCount: car._count.reservations,
          reviews: undefined,
          reservations: undefined,
          _count: undefined,
        });
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/images",
  requireAuth,
  requireContractorOrAdmin,
  (req, res, next) => {
    uploadCarImages.single("image")(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError("Ngarko një foto", 400);

      const data = fs.readFileSync(req.file.path);
      fs.unlink(req.file.path, () => {});

      const saved = await prisma.mediaFile.create({
        data: {
          mimeType: req.file.mimetype || "image/jpeg",
          data,
        },
      });

      // Persist in DB so images survive Railway redeploys (disk is ephemeral).
      res.status(201).json({ url: `/api/media/${saved.id}` });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id", optionalAuth, validate(carPublicParamSchema), async (req, res, next) => {
  try {
    const key = req.params.id;
    const car = await prisma.car.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
      },
      include: {
        owner: carOwnerSelect,
        reservations: activeReservationSelect(),
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

    const isStaff =
      req.user &&
      ["CONTRACTOR", "ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    const isOwner =
      req.user && car.ownerId && req.user.id === car.ownerId;
    if (
      car.listingStatus !== "PUBLISHED" &&
      !isStaff &&
      !isOwner
    ) {
      throw new AppError("Car not found", 404);
    }

    const count = car.reviews.length;
    const avg =
      count === 0
        ? 0
        : Math.round(
            (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
          ) / 10;

    res.json({
      car: withImages({
        ...car,
        status: effectiveCarStatus(car.status, car.reservations),
        reservedUntil: currentReservationEnd(car.reservations),
        busyRanges: toBusyRanges(car.reservations),
        pricePerDay: Number(car.pricePerDay),
        companyName: companyNameFromOwner(car.owner),
        shopSlug: shopSlugFromOwner(car.owner),
        ratingAvg: avg,
        ratingCount: count,
        isFavorite: Array.isArray(car.favorites) && car.favorites.length > 0,
        favorites: undefined,
        owner: undefined,
        reservations: undefined,
        reviews: car.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          userName: r.user.fullName,
          createdAt: r.createdAt,
        })),
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  requireContractorOrAdmin,
  (req, res, next) => {
    if (!req.is("multipart/form-data")) return next();
    uploadCarImages.array("images", 8)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      const raw = req.body || {};
      const media = normalizeCarImages({
        imageUrl: raw.imageUrl,
        images: raw.imageUrls ?? raw.images,
        uploadedPaths: uploadedPaths(req.files as Express.Multer.File[]),
      });
      if (!media.images.length) {
        throw new AppError("Ngarko të paktën një foto ose vendos Image URL", 400);
      }

      const body = carSchema.shape.body.parse({
        ...raw,
        year: raw.year,
        pricePerDay: raw.pricePerDay,
        seats: raw.seats || 5,
        doors: raw.doors || 4,
        luggage: raw.luggage || 2,
        features: parseFeatures(raw.features),
        imageUrl: media.imageUrl,
        images: media.images,
        status: raw.status || "AVAILABLE",
        location: raw.location || "Tiranë",
      });

      const ownerId =
        req.user!.role === "CONTRACTOR" ? req.user!.id : raw.ownerId || null;

      const { images: _bodyImages, imageUrl: _bodyUrl, ...carFields } = body;
      const slug = await uniqueCarSlug(
        carFields.brand,
        carFields.model,
        carFields.year
      );
      const car = await prisma.car.create({
        data: {
          ...carFields,
          slug,
          imageUrl: media.imageUrl,
          images: media.images,
          ownerId,
        },
      });
      res.status(201).json({
        car: withImages({ ...car, pricePerDay: Number(car.pricePerDay) }),
      });
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
  (req, res, next) => {
    if (!req.is("multipart/form-data")) return next();
    uploadCarImages.array("images", 8)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  },
  async (req, res, next) => {
    try {
      const existing = await prisma.car.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new AppError("Car not found", 404);

      if (
        req.user!.role === "CONTRACTOR" &&
        existing.ownerId !== req.user!.id
      ) {
        throw new AppError("Forbidden", 403);
      }

      const raw = req.body || {};
      const replaceImages = String(raw.replaceImages || "") === "true";
      const clientSentImageList = raw.imageUrls !== undefined;
      const media = normalizeCarImages({
        imageUrl: raw.imageUrl,
        images: raw.imageUrls ?? raw.images,
        uploadedPaths: uploadedPaths(req.files as Express.Multer.File[]),
        existingImages: existing.images,
        // Prefer the client's kept list (imageUrls) so removals stick.
        keepExisting: !replaceImages && !clientSentImageList,
      });

      const parsed = carBodyObject.partial().parse({
        ...raw,
        features:
          raw.features !== undefined ? parseFeatures(raw.features) : undefined,
        imageUrl: media.imageUrl || existing.imageUrl,
        images: media.images.length
          ? media.images
          : asStringArray(existing.images),
      });

      const nextImages =
        media.images.length > 0
          ? media.images
          : carImagesFromRecord(existing);
      const nextCover = nextImages[0] || existing.imageUrl;

      const { images: _ignoredImages, imageUrl: _ignoredUrl, ...rest } = parsed;
      const nextBrand = rest.brand ?? existing.brand;
      const nextModel = rest.model ?? existing.model;
      const nextYear = rest.year ?? existing.year;
      const brandModelYearChanged =
        nextBrand !== existing.brand ||
        nextModel !== existing.model ||
        nextYear !== existing.year;
      const slug =
        !existing.slug || brandModelYearChanged
          ? await uniqueCarSlug(nextBrand, nextModel, nextYear, existing.id)
          : existing.slug;

      const car = await prisma.car.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          slug,
          imageUrl: nextCover,
          images: nextImages,
        },
      });
      res.json({
        car: withImages({ ...car, pricePerDay: Number(car.pricePerDay) }),
      });
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
