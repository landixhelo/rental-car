import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../config/env.js";
import { AppError } from "./error.js";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const allowedDocs = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const allowedImages = new Set(["image/jpeg", "image/png", "image/webp"]);

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedDocs.has(file.mimetype)) {
      return cb(
        new AppError("Only JPG, PNG, WEBP or PDF allowed", 400) as unknown as Error
      );
    }
    cb(null, true);
  },
});

export const uploadCarImages = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImages.has(file.mimetype)) {
      return cb(
        new AppError("Only JPG, PNG or WEBP images allowed", 400) as unknown as Error
      );
    }
    cb(null, true);
  },
});
