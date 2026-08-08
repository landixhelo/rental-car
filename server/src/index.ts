import express from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { env, isProd, getAllowedOrigins } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import carRoutes from "./routes/cars.js";
import mediaRoutes from "./routes/media.js";
import seoRoutes from "./routes/seo.js";
import reservationRoutes from "./routes/reservations.js";
import reviewRoutes from "./routes/reviews.js";
import favoriteRoutes from "./routes/favorites.js";
import contactRoutes from "./routes/contact.js";
import adminRoutes from "./routes/admin.js";
import superAdminRoutes from "./routes/superAdmin.js";
import paymentRoutes, { stripeWebhookHandler } from "./routes/payments.js";
import dashboardRoutes from "./routes/dashboard.js";
import { EXTRAS, LOCATIONS } from "./lib/pricing.js";
import { stripeEnabled } from "./lib/stripePay.js";
import { getBusinessPublic } from "./lib/business.js";
import { ensureSchema } from "./lib/ensureSchema.js";

console.log("Booting AutoRent API...");

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(hpp());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = getAllowedOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    void stripeWebhookHandler(req, res);
  }
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 600 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "autorent-api" });
});

app.get("/api/meta", (_req, res) => {
  const business = getBusinessPublic();
  res.json({
    locations: LOCATIONS,
    extras: EXTRAS,
    cardEnabled: stripeEnabled(),
    whatsapp: business.whatsapp,
    business,
  });
});

app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    fallthrough: true,
    index: false,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await ensureSchema();
  app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`AutoRent API on http://0.0.0.0:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
