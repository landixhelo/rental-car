import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { cancellationPolicyText } from "./cancellation.js";
import { getBusinessPublic } from "./business.js";

export function isMailConfigured() {
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

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
}) {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured — skipped:", options.subject);
    return { sent: false as const };
  }

  await transporter().sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text.replace(/\n/g, "<br/>"),
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType || "application/pdf",
    })),
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
  invoicePdf?: Buffer | null;
  invoiceFilename?: string;
}) {
  const biz = getBusinessPublic();
  const summary = [
    `Makina: ${input.carLabel}`,
    `Datat: ${input.startDate} → ${input.endDate}`,
    `Totali: €${input.totalPrice}`,
    `Pagesa: ${input.paymentMethod} (${input.paymentStatus})`,
    `Statusi: ${input.status}`,
  ].join("\n");

  const policy = cancellationPolicyText();
  const contactLine = [
    biz.phone && `Tel: ${biz.phone}`,
    biz.whatsapp && `WhatsApp: +${biz.whatsapp}`,
    `Email: ${biz.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  const invoiceNote = input.invoicePdf
    ? "\nFatura e rezervimit është bashkangjitur si PDF.\n"
    : "";

  const customerAttachments: MailAttachment[] | undefined = input.invoicePdf
    ? [
        {
          filename:
            input.invoiceFilename ||
            `autorent-fature-${input.startDate}.pdf`,
          content: input.invoicePdf,
          contentType: "application/pdf",
        },
      ]
    : undefined;

  await sendMail({
    to: input.customerEmail,
    subject: `AutoRent — konfirmim rezervimi (${input.carLabel})`,
    text: `Përshëndetje ${input.customerName},\n\nRezervimi u regjistrua me sukses.\n${invoiceNote}\n${summary}\n\nPolitika e anulimit:\n${policy}\n\nNa kontakto:\n${contactLine}\n\nwww.landixhelo.me\n\nFaleminderit,\nAutoRent`,
    attachments: customerAttachments,
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
      attachments: customerAttachments,
    });
  }
}
