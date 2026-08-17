import { env } from "../config/env.js";
import { cancellationPolicyText, cancelFreeHours } from "./cancellation.js";

function digits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function getBusinessPublic() {
  const phoneRaw = env.BUSINESS_PHONE || "";
  const phoneDisplay = phoneRaw.startsWith("+")
    ? phoneRaw
    : phoneRaw
      ? `+${digits(phoneRaw)}`
      : "";

  return {
    name: "Auto Rental",
    phone: phoneDisplay,
    phoneDigits: digits(phoneRaw),
    email: env.BUSINESS_EMAIL || env.ADMIN_EMAIL || "devbyland@gmail.com",
    nipt: env.BUSINESS_NIPT || "",
    address: env.BUSINESS_ADDRESS || "Tiranë, Shqipëri",
    street: env.BUSINESS_STREET || "",
    hours: "08:00 – 20:00",
    cancelFreeHours: cancelFreeHours(),
    cancellationPolicy: cancellationPolicyText(),
    mailConfigured: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
  };
}
