import rateLimit from "express-rate-limit";
import { isProd } from "../config/env.js";

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 40 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, try again later" },
});
