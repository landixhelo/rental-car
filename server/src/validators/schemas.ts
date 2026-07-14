import { z } from "zod";

/** Strong password: 10+ chars, upper, lower, number, special */
export const strongPassword = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    password: strongPassword,
    phone: z.string().trim().max(30).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30).optional(),
    password: strongPassword.optional().or(z.literal("")),
  }),
});

export const carSchema = z.object({
  body: z.object({
    brand: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(80),
    year: z.coerce.number().int().min(1990).max(2100),
    pricePerDay: z.coerce.number().positive().max(10000),
    seats: z.coerce.number().int().min(1).max(20),
    doors: z.coerce.number().int().min(2).max(6).default(4),
    luggage: z.coerce.number().int().min(0).max(10).default(2),
    horsepower: z.string().trim().max(40).optional(),
    color: z.string().trim().max(40).optional(),
    mileage: z.string().trim().max(40).optional(),
    location: z.string().trim().max(80).default("Tiranë"),
    fuel: z.string().trim().min(1).max(40),
    transmission: z.string().trim().min(1).max(40),
    type: z.string().trim().min(1).max(40),
    status: z.enum(["AVAILABLE", "RESERVED", "MAINTENANCE"]).default("AVAILABLE"),
    description: z.string().trim().min(10).max(2000),
    features: z.array(z.string().trim().max(80)).max(30).default([]),
    imageUrl: z.string().url().max(500),
  }),
});

export const reservationSchema = z.object({
  body: z.object({
    carId: z.string().cuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pickupLocationId: z.string().min(1),
    returnLocationId: z.string().min(1),
    extras: z.array(z.string()).max(10).default([]),
    paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD"]),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const reviewSchema = z.object({
  body: z.object({
    carId: z.string().cuid(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  }),
});

export const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(30).optional(),
    subject: z.string().trim().min(2).max(200),
    message: z.string().trim().min(10).max(2000),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});
