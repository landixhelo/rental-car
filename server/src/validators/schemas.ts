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
    rememberMe: z.boolean().optional().default(false),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(20).max(200),
    password: strongPassword,
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().max(30).optional().nullable(),
    password: strongPassword.optional().or(z.literal("")),
    currentPassword: z.string().min(1).max(200).optional().or(z.literal("")),
    avatarUrl: z.string().trim().max(500).optional().nullable().or(z.literal("")),
    companyName: z.string().trim().max(120).optional().nullable(),
    businessPhone: z.string().trim().max(40).optional().nullable(),
    businessWhatsapp: z.string().trim().max(40).optional().nullable(),
    businessAddress: z.string().trim().max(200).optional().nullable(),
    bookingNotifyEmail: z
      .union([z.string().trim().email(), z.literal(""), z.null()])
      .optional(),
    notifyBookingEmail: z.boolean().optional(),
    notifyCancelEmail: z.boolean().optional(),
    notifyPaymentEmail: z.boolean().optional(),
    notifyDocumentEmail: z.boolean().optional(),
    minRentalDays: z.coerce.number().int().min(1).max(90).optional().nullable(),
    maxRentalDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
    minDriverAge: z.coerce.number().int().min(16).max(90).optional().nullable(),
    maxDriverAge: z.coerce.number().int().min(18).max(99).optional().nullable(),
    weeklyDiscountPct: z.coerce.number().int().min(0).max(80).optional().nullable(),
    monthlyDiscountPct: z.coerce
      .number()
      .int()
      .min(0)
      .max(80)
      .optional()
      .nullable(),
    requireDeposit: z.boolean().optional().nullable(),
    defaultDepositEur: z.coerce
      .number()
      .min(0)
      .max(10000)
      .optional()
      .nullable(),
    businessHours: z
      .array(
        z.object({
          day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
          open: z.boolean(),
          from: z.string().trim().max(8).optional(),
          to: z.string().trim().max(8).optional(),
        })
      )
      .max(7)
      .optional()
      .nullable(),
    cancellationPolicyText: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .or(z.literal("")),
  }),
});

export const carBodyObject = z.object({
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
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  images: z.array(z.string().trim().max(500)).max(8).default([]),
});

export const carSchema = z.object({
  body: carBodyObject.superRefine((data, ctx) => {
    const hasImages = (data.images?.length || 0) > 0;
    const hasUrl = Boolean(data.imageUrl && String(data.imageUrl).trim());
    if (!hasImages && !hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrl"],
        message: "At least one image URL or uploaded image is required",
      });
    }
    if (hasUrl && data.imageUrl && !/^https?:\/\/|^\//.test(data.imageUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageUrl"],
        message: "Invalid image URL",
      });
    }
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
    guestFullName: z.string().trim().min(2).max(100).optional(),
    guestEmail: z.string().trim().email().max(200).optional(),
    guestPhone: z.string().trim().min(6).max(40).optional(),
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

export const cancelReservationSchema = z.object({
  params: z.object({
    // Accept legacy cuid and any stable reservation id string.
    id: z.string().min(1).max(64),
  }),
  body: z.object({
    reason: z
      .string({
        required_error: "Arsyeja e anulimit është e detyrueshme",
        invalid_type_error: "Arsyeja e anulimit është e detyrueshme",
      })
      .trim()
      .min(5, "Arsyeja duhet të ketë të paktën 5 karaktere")
      .max(500, "Arsyeja është shumë e gjatë"),
  }),
});

/** Public car URL: cuid (legacy) or slug like bmw-x5-2023 */
export const carPublicParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(2)
      .max(120)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  }),
});
