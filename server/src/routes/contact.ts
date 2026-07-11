import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { contactSchema } from "../validators/schemas.js";
import rateLimit from "express-rate-limit";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages, try again later" },
});

router.post(
  "/",
  contactLimiter,
  validate(contactSchema),
  async (req, res, next) => {
    try {
      const message = await prisma.contactMessage.create({ data: req.body });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
