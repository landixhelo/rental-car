import dns from "node:dns";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { cancellationPolicyText } from "./cancellation.js";
import { getBusinessPublic } from "./business.js";

function lookupIpv4(
  hostname: string,
  _options: unknown,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string,
    family: number
  ) => void
) {
  dns.lookup(hostname, { family: 4 }, callback);
}

export function isMailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function mailAuth() {
  return {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  };
}

function isGmail() {
  return /gmail\.com$/i.test(env.SMTP_HOST || "");
}

function fromAddress() {
  const user = (env.SMTP_USER || "").trim();
  const raw = (env.SMTP_FROM || "").trim();
  // Gmail only accepts the authenticated mailbox as From.
  if (isGmail() && user) {
    return `"Auto Rental — Via Egnatia" <${user}>`;
  }
  if (raw) return raw;
  if (!user) return "";
  return `"Auto Rental — Via Egnatia" <${user}>`;
}

function isSendableAddress(to: string) {
  const email = to.trim().toLowerCase();
  if (!email || !email.includes("@")) return false;
  if (email.endsWith("@guest.viaegnatia.al")) return false;
  return true;
}

function transporter() {
  const host = env.SMTP_HOST || "";
  const auth = mailAuth();
  const timeouts = {
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 25_000,
    family: 4 as const,
    lookup: lookupIpv4,
  };
  if (isGmail()) {
    // Railway often hangs on IPv6 / port 587 to Gmail. Prefer SMTPS + IPv4.
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth,
      ...timeouts,
    });
  }
  const port = env.SMTP_PORT;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth,
    ...timeouts,
  });
}

export async function verifyMail() {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured — emails will not send");
    return false;
  }
  const passLen = env.SMTP_PASS?.length ?? 0;
  console.info(
    "[mail] config host=",
    env.SMTP_HOST,
    "user=",
    env.SMTP_USER,
    "from=",
    fromAddress(),
    "passLen=",
    passLen
  );
  if (isGmail() && passLen !== 16) {
    console.warn(
      "[mail] Gmail App Password should be 16 characters (no spaces). passLen=",
      passLen
    );
  }
  try {
    await Promise.race([
      transporter().verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP verify timeout (20s)")), 20_000)
      ),
    ]);
    console.info("[mail] SMTP ready via", env.SMTP_HOST);
    return true;
  } catch (err) {
    console.error(
      "[mail] SMTP login failed:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
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
    console.warn("[mail] SMTP not configured — skipped:", options.subject, "→", options.to);
    return { sent: false as const };
  }
  if (!isSendableAddress(options.to)) {
    console.warn("[mail] skipped invalid recipient:", options.subject, "→", options.to);
    return { sent: false as const };
  }

  try {
    await transporter().sendMail({
      from: fromAddress(),
      replyTo: env.BUSINESS_EMAIL || env.SMTP_USER,
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
    console.info(
      "[mail] sent:",
      options.subject,
      "→",
      options.to,
      options.attachments?.length ? `(${options.attachments.length} attachment)` : ""
    );
    return { sent: true as const };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[mail] failed:", options.subject, "→", options.to, reason);
    return { sent: false as const, error: reason };
  }
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
  skipCustomerEmail?: boolean;
  cancellationPolicyOverride?: string | null;
}) {
  const biz = getBusinessPublic();
  const summary = [
    `Makina: ${input.carLabel}`,
    `Datat: ${input.startDate} → ${input.endDate}`,
    `Totali: €${input.totalPrice}`,
    `Pagesa: ${input.paymentMethod} (${input.paymentStatus})`,
    `Statusi: ${input.status}`,
  ].join("\n");

  const policy = cancellationPolicyText(input.cancellationPolicyOverride);
  const contactLine = [
    biz.phone && `Tel: ${biz.phone}`,
    `Email: ${biz.email}`,
  ]
    .filter(Boolean)
    .join("\n");

  const baseText = `Përshëndetje ${input.customerName},\n\nRezervimi u regjistrua me sukses.\n`;
  const tail = `\n${summary}\n\nPolitika e anulimit:\n${policy}\n\nNa kontakto:\n${contactLine}\n\nwww.landixhelo.me\n\nFaleminderit,\nAuto Rental — Via Egnatia`;
  const subject = `Auto Rental — konfirmim rezervimi (${input.carLabel})`;

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

  let customerResult: { sent: true } | { sent: false; error?: string } = {
    sent: true,
  };

  if (!input.skipCustomerEmail) {
    customerResult = await sendMail({
      to: input.customerEmail,
      subject,
      text: `${baseText}${
        customerAttachments
          ? "\nFatura e rezervimit është bashkangjitur si PDF.\n"
          : ""
      }${tail}`,
      attachments: customerAttachments,
    });

    // Attachment or size issues: retry plain email so customer still gets confirmation.
    if (!customerResult.sent && customerAttachments) {
      console.warn("[mail] retrying customer email without PDF attachment");
      customerResult = await sendMail({
        to: input.customerEmail,
        subject,
        text: `${baseText}${tail}`,
      });
    }
  } else {
    console.info(
      "[mail] skipped customer confirmation (prefs) →",
      input.customerEmail
    );
  }

  const staff = [input.adminEmail, input.ownerEmail].filter(
    (e): e is string => Boolean(e)
  );
  for (const to of Array.from(new Set(staff))) {
    if (to === input.customerEmail) continue;
    const staffResult = await sendMail({
      to,
      subject: `Rezervim i ri — ${input.carLabel}`,
      text: `Rezervim i ri nga ${input.customerName} (${input.customerEmail}).\n\n${summary}`,
      attachments: customerAttachments,
    });
    if (!staffResult.sent && customerAttachments) {
      await sendMail({
        to,
        subject: `Rezervim i ri — ${input.carLabel}`,
        text: `Rezervim i ri nga ${input.customerName} (${input.customerEmail}).\n\n${summary}`,
      });
    }
  }

  return customerResult;
}
