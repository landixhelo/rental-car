import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireContractorOrAdmin,
} from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(requireAuth, requireContractorOrAdmin);

const updateStatusSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    status: z.enum(["New", "Read", "Done"]),
  }),
});

router.get("/", async (_req, res, next) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const unread = messages.filter((m) => m.status === "New").length;
    res.json({ messages, unread });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", validate(updateStatusSchema), async (req, res, next) => {
  try {
    const existing = await prisma.contactMessage.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new AppError("Chat not found", 404);

    const message = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

export default router;
