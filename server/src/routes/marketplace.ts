import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireContractorOrAdmin,
  requireAdmin,
  optionalAuth,
} from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { validate } from "../middleware/validate.js";
import { uniqueShopSlug } from "../lib/slug.js";
import {
  carOwnerSelect,
  companyNameFromOwner,
} from "../lib/carOwner.js";
import {
  activeReservationSelect,
  effectiveCarStatus,
} from "../lib/carAvailability.js";

const router = Router();

function asImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function mapSale(listing: {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: Prisma.Decimal | number;
  mileage: string | null;
  location: string;
  fuel: string | null;
  transmission: string | null;
  type: string | null;
  color: string | null;
  description: string;
  images: unknown;
  status: string;
  createdAt: Date;
  seller?: {
    id: string;
    fullName: string;
    companyName: string | null;
    phone: string | null;
    shopSlug: string | null;
    shopIsPublic: boolean;
  } | null;
}) {
  const images = asImages(listing.images);
  return {
    id: listing.id,
    title: listing.title,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    price: Number(listing.price),
    mileage: listing.mileage,
    location: listing.location,
    fuel: listing.fuel,
    transmission: listing.transmission,
    type: listing.type,
    color: listing.color,
    description: listing.description,
    images,
    imageUrl: images[0] || "",
    status: listing.status,
    createdAt: listing.createdAt,
    seller: listing.seller
      ? {
          name:
            listing.seller.companyName?.trim() ||
            listing.seller.fullName,
          phone: listing.seller.phone,
          shopSlug:
            listing.seller.shopIsPublic && listing.seller.shopSlug
              ? listing.seller.shopSlug
              : null,
        }
      : null,
  };
}

/** Public: partner rental shops */
router.get("/shops", async (_req, res, next) => {
  try {
    const shops = await prisma.user.findMany({
      where: {
        role: { in: ["CONTRACTOR", "ADMIN", "SUPER_ADMIN"] },
        isActive: true,
        shopIsPublic: true,
        shopSlug: { not: null },
      },
      select: {
        id: true,
        companyName: true,
        fullName: true,
        shopSlug: true,
        shopBio: true,
        shopLogoUrl: true,
        shopCity: true,
        phone: true,
        _count: {
          select: {
            ownedCars: {
              where: { listingStatus: "PUBLISHED" },
            },
          },
        },
      },
      orderBy: { companyName: "asc" },
    });

    res.json({
      shops: shops.map((s) => ({
        slug: s.shopSlug!,
        name: s.companyName?.trim() || s.fullName,
        bio: s.shopBio,
        logoUrl: s.shopLogoUrl,
        city: s.shopCity,
        phone: s.phone,
        carsCount: s._count.ownedCars,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/shops/:slug", async (req, res, next) => {
  try {
    const shop = await prisma.user.findFirst({
      where: {
        shopSlug: req.params.slug,
        shopIsPublic: true,
        isActive: true,
      },
      select: {
        id: true,
        companyName: true,
        fullName: true,
        shopSlug: true,
        shopBio: true,
        shopLogoUrl: true,
        shopCity: true,
        phone: true,
      },
    });
    if (!shop) throw new AppError("Shop not found", 404);

    const cars = await prisma.car.findMany({
      where: {
        ownerId: shop.id,
        listingStatus: "PUBLISHED",
        status: { not: "MAINTENANCE" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        owner: carOwnerSelect,
        reviews: { select: { rating: true } },
        reservations: activeReservationSelect(),
      },
    });

    res.json({
      shop: {
        slug: shop.shopSlug!,
        name: shop.companyName?.trim() || shop.fullName,
        bio: shop.shopBio,
        logoUrl: shop.shopLogoUrl,
        city: shop.shopCity,
        phone: shop.phone,
      },
      cars: cars.map((car) => {
        const count = car.reviews.length;
        const avg =
          count === 0
            ? 0
            : Math.round(
                (car.reviews.reduce((s, r) => s + r.rating, 0) / count) * 10
              ) / 10;
        const images = asImages(car.images);
        return {
          id: car.id,
          slug: car.slug,
          brand: car.brand,
          model: car.model,
          year: car.year,
          pricePerDay: Number(car.pricePerDay),
          location: car.location,
          type: car.type,
          fuel: car.fuel,
          transmission: car.transmission,
          imageUrl: car.imageUrl || images[0] || "",
          images,
          status: effectiveCarStatus(car.status, car.reservations),
          companyName: companyNameFromOwner(car.owner),
          shopSlug: shop.shopSlug,
          ratingAvg: avg,
          ratingCount: count,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

/** Public: buy/sell listings */
router.get("/sales", optionalAuth, async (req, res, next) => {
  try {
    const { search, location, minPrice, maxPrice } = req.query as Record<
      string,
      string | undefined
    >;
    const where: Prisma.VehicleListingWhereInput = {
      status: "PUBLISHED",
    };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }
    if (location && location !== "all") {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const listings = await prisma.vehicleListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            companyName: true,
            phone: true,
            shopSlug: true,
            shopIsPublic: true,
          },
        },
      },
    });
    res.json({ listings: listings.map(mapSale) });
  } catch (err) {
    next(err);
  }
});

router.get("/sales/:id", async (req, res, next) => {
  try {
    const listing = await prisma.vehicleListing.findFirst({
      where: { id: req.params.id, status: "PUBLISHED" },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            companyName: true,
            phone: true,
            shopSlug: true,
            shopIsPublic: true,
          },
        },
      },
    });
    if (!listing) throw new AppError("Listing not found", 404);
    res.json({ listing: mapSale(listing) });
  } catch (err) {
    next(err);
  }
});

const shopUpdateSchema = z.object({
  body: z.object({
    companyName: z.string().trim().min(2).max(120).optional(),
    shopBio: z.string().trim().max(2000).optional().nullable(),
    shopLogoUrl: z.string().trim().max(500).optional().nullable(),
    shopCity: z.string().trim().max(80).optional().nullable(),
    shopIsPublic: z.boolean().optional(),
    shopSlug: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
  }),
});

router.get("/my-shop", requireAuth, requireContractorOrAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        companyName: true,
        shopSlug: true,
        shopBio: true,
        shopLogoUrl: true,
        shopCity: true,
        shopIsPublic: true,
        commissionPercent: true,
        phone: true,
      },
    });
    if (!user) throw new AppError("User not found", 404);
    res.json({ shop: user });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/my-shop",
  requireAuth,
  requireContractorOrAdmin,
  validate(shopUpdateSchema),
  async (req, res, next) => {
    try {
      const body = req.body as {
        companyName?: string;
        shopBio?: string | null;
        shopLogoUrl?: string | null;
        shopCity?: string | null;
        shopIsPublic?: boolean;
        shopSlug?: string;
      };

      let shopSlug = body.shopSlug;
      if (shopSlug) {
        shopSlug = await uniqueShopSlug(shopSlug, req.user!.id);
      } else if (body.shopIsPublic) {
        const me = await prisma.user.findUnique({
          where: { id: req.user!.id },
          select: { shopSlug: true, companyName: true, fullName: true },
        });
        if (me && !me.shopSlug) {
          shopSlug = await uniqueShopSlug(
            me.companyName || me.fullName || "shop",
            req.user!.id
          );
        }
      }

      const shop = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(body.companyName !== undefined
            ? { companyName: body.companyName }
            : {}),
          ...(body.shopBio !== undefined ? { shopBio: body.shopBio } : {}),
          ...(body.shopLogoUrl !== undefined
            ? { shopLogoUrl: body.shopLogoUrl }
            : {}),
          ...(body.shopCity !== undefined ? { shopCity: body.shopCity } : {}),
          ...(body.shopIsPublic !== undefined
            ? { shopIsPublic: body.shopIsPublic }
            : {}),
          ...(shopSlug ? { shopSlug } : {}),
        },
        select: {
          companyName: true,
          shopSlug: true,
          shopBio: true,
          shopLogoUrl: true,
          shopCity: true,
          shopIsPublic: true,
          commissionPercent: true,
          phone: true,
        },
      });
      res.json({ shop });
    } catch (err) {
      next(err);
    }
  }
);

const saleBodySchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(60),
    year: z.coerce.number().int().min(1980).max(2100),
    price: z.coerce.number().positive().max(10_000_000),
    mileage: z.string().trim().max(40).optional().nullable(),
    location: z.string().trim().min(2).max(80).default("Tiranë"),
    fuel: z.string().trim().max(40).optional().nullable(),
    transmission: z.string().trim().max(40).optional().nullable(),
    type: z.string().trim().max(40).optional().nullable(),
    color: z.string().trim().max(40).optional().nullable(),
    description: z.string().trim().min(10).max(5000),
    images: z.array(z.string().trim().min(1)).max(8).default([]),
    status: z
      .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "SUSPENDED", "SOLD", "ARCHIVED"])
      .optional(),
  }),
});

router.get("/my-sales", requireAuth, async (req, res, next) => {
  try {
    const listings = await prisma.vehicleListing.findMany({
      where: { sellerId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      listings: listings.map((l) => mapSale({ ...l, seller: null })),
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/my-sales",
  requireAuth,
  validate(saleBodySchema),
  async (req, res, next) => {
    try {
      const role = req.user!.role;
      const canPublishDirect =
        role === "ADMIN" || role === "SUPER_ADMIN";
      const status =
        req.body.status && canPublishDirect
          ? req.body.status
          : "PENDING_REVIEW";

      const listing = await prisma.vehicleListing.create({
        data: {
          sellerId: req.user!.id,
          title: req.body.title,
          brand: req.body.brand,
          model: req.body.model,
          year: req.body.year,
          price: req.body.price,
          mileage: req.body.mileage || null,
          location: req.body.location || "Tiranë",
          fuel: req.body.fuel || null,
          transmission: req.body.transmission || null,
          type: req.body.type || null,
          color: req.body.color || null,
          description: req.body.description,
          images: req.body.images || [],
          status,
        },
      });
      res.status(201).json({ listing: mapSale({ ...listing, seller: null }) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/my-sales/:id",
  requireAuth,
  validate(
    z.object({
      params: z.object({ id: z.string().cuid() }),
      body: saleBodySchema.shape.body.partial(),
    })
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.vehicleListing.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new AppError("Listing not found", 404);
      const isOwner = existing.sellerId === req.user!.id;
      const isStaff =
        req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
      if (!isOwner && !isStaff) throw new AppError("Forbidden", 403);

      const data: Prisma.VehicleListingUpdateInput = {};
      const b = req.body;
      for (const key of [
        "title",
        "brand",
        "model",
        "year",
        "price",
        "mileage",
        "location",
        "fuel",
        "transmission",
        "type",
        "color",
        "description",
        "images",
      ] as const) {
        if (b[key] !== undefined) (data as any)[key] = b[key];
      }
      if (b.status !== undefined) {
        if (isStaff) data.status = b.status;
        else if (["DRAFT", "PENDING_REVIEW", "SOLD", "ARCHIVED"].includes(b.status)) {
          data.status = b.status;
        } else if (b.status === "PUBLISHED") {
          data.status = "PENDING_REVIEW";
        }
      }

      const listing = await prisma.vehicleListing.update({
        where: { id: req.params.id },
        data,
      });
      res.json({ listing: mapSale({ ...listing, seller: null }) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/my-sales/:id",
  requireAuth,
  validate(z.object({ params: z.object({ id: z.string().cuid() }) })),
  async (req, res, next) => {
    try {
      const existing = await prisma.vehicleListing.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) throw new AppError("Listing not found", 404);
      const isOwner = existing.sellerId === req.user!.id;
      const isStaff =
        req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
      if (!isOwner && !isStaff) throw new AppError("Forbidden", 403);
      await prisma.vehicleListing.delete({ where: { id: req.params.id } });
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

/** Super admin: moderate sale listings + shops */
router.get(
  "/admin/sales",
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const listings = await prisma.vehicleListing.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          seller: {
            select: {
              id: true,
              fullName: true,
              companyName: true,
              phone: true,
              shopSlug: true,
              shopIsPublic: true,
            },
          },
        },
      });
      res.json({ listings: listings.map(mapSale) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/admin/sales/:id",
  requireAuth,
  requireAdmin,
  validate(
    z.object({
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        status: z.enum([
          "DRAFT",
          "PENDING_REVIEW",
          "PUBLISHED",
          "SUSPENDED",
          "SOLD",
          "ARCHIVED",
        ]),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const listing = await prisma.vehicleListing.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
        include: {
          seller: {
            select: {
              id: true,
              fullName: true,
              companyName: true,
              phone: true,
              shopSlug: true,
              shopIsPublic: true,
            },
          },
        },
      });
      res.json({ listing: mapSale(listing) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
