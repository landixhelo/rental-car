import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { contactSchema } from "../validators/schemas.js";
import { sendMail } from "../lib/mail.js";
import { env } from "../config/env.js";
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

      const to = env.ADMIN_EMAIL || env.SMTP_USER;
      if (to) {
        try {
          await sendMail({
            to,
            subject: `Kontakt AutoRent: ${message.subject}`,
            text: `Nga: ${message.name} <${message.email}>\nTel: ${message.phone || "-"}\n\n${message.message}`,
          });
          await sendMail({
            to: message.email,
            subject: "AutoRent — mesazhi u pranua",
            text: `Përshëndetje ${message.name},\n\nFaleminderit për mesazhin. Do t’ju përgjigjemi sa më shpejt.\n\nAutoRent`,
          });
        } catch (mailErr) {
          console.error("Contact email failed:", mailErr);
        }
      }

      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
