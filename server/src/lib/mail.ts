import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function canSendMail() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!canSendMail()) {
    console.warn("[mail] SMTP not configured — skipped:", options.subject);
    return { sent: false as const };
  }

  await transporter().sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text.replace(/\n/g, "<br/>"),
  });
  return { sent: true as const };
}

export async function sendReservationEmails(input: {
  customerEmail: string;
  customerName: string;
  carLabel: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  adminEmail?: string | null;
  ownerEmail?: string | null;
}) {
  const summary = [
    `Makina: ${input.carLabel}`,
    `Datat: ${input.startDate} → ${input.endDate}`,
    `Totali: €${input.totalPrice}`,
    `Pagesa: ${input.paymentMethod} (${input.paymentStatus})`,
    `Statusi: ${input.status}`,
  ].join("\n");

  await sendMail({
    to: input.customerEmail,
    subject: `AutoRent — rezervimi yt (${input.carLabel})`,
    text: `Përshëndetje ${input.customerName},\n\nRezervimi u regjistrua.\n\n${summary}\n\nFaleminderit,\nAutoRent`,
  });

  const staff = [input.adminEmail, input.ownerEmail].filter(
    (e): e is string => Boolean(e)
  );
  for (const to of Array.from(new Set(staff))) {
    if (to === input.customerEmail) continue;
    await sendMail({
      to,
      subject: `Rezervim i ri — ${input.carLabel}`,
      text: `Rezervim i ri nga ${input.customerName} (${input.customerEmail}).\n\n${summary}`,
    });
  }
}
