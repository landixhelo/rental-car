import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/error.js";

const router = Router();

/** Serve image from Postgres (survives Railway redeploys). */
router.get("/:id", async (req, res, next) => {
  try {
    const file = await prisma.mediaFile.findUnique({
      where: { id: req.params.id },
    });
    if (!file) throw new AppError("Image not found", 404);

    res.setHeader("Content-Type", file.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(Buffer.from(file.data));
  } catch (err) {
    next(err);
  }
});

export default router;
