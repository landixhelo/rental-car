export const SITE = {
  name: "Auto Rental",
  heritage: "Via Egnatia",
  fullName: "Auto Rental — Via Egnatia",
  legalName: "Auto Rental Via Egnatia",
  url: "https://www.landixhelo.me",
  localeDefault: "sq_AL",
  locales: {
    sq: "sq_AL",
    en: "en_US",
    it: "it_IT",
  } as const,
  description: {
    sq: "Qira makinash në Shqipëri — Tiranë, Durrës, Vlorë, Sarandë dhe Aeroporti i Tiranës. Rezervim online.",
    en: "Car rental in Albania — Tirana, Durrës, Vlorë, Sarandë and Tirana Airport. Book online.",
    it: "Noleggio auto in Albania — Tirana, Durazzo, Valona, Saranda e aeroporto di Tirana. Prenota online.",
  },
  keywords: {
    sq: "qira makinash, auto rental albania, via egnatia, qira auto tirane, makina me qira, SUV me qira",
    en: "car rental albania, auto rental via egnatia, rent a car tirana, albania car hire, SUV rental",
    it: "noleggio auto albania, auto rental via egnatia, noleggio tirana, affitto auto albania",
  },
  /** Overridden at runtime from /api/meta when available. */
  phone: "+355689001257",
  email: "devbyland@gmail.com",
  nipt: "",
  address: {
    street: "",
    locality: "Tiranë",
    region: "Tiranë",
    country: "AL",
    full: "Tiranë, Shqipëri",
  },
  ogImage: "https://www.landixhelo.me/logo.png",
  twitter: "@autorent",
} as const;

export type SeoLocale = keyof typeof SITE.description;

export type BusinessInfo = {
  phone?: string;
  phoneDigits?: string;
  email?: string;
  nipt?: string;
  address?: string;
  street?: string;
  hours?: string;
  cancelFreeHours?: number;
  cancellationPolicy?: string;
  mailConfigured?: boolean;
};

/** Mutable runtime contact fields hydrated from API. */
export const businessRuntime: BusinessInfo = {
  phone: SITE.phone,
  email: SITE.email,
  nipt: SITE.nipt,
  address: SITE.address.full,
  street: SITE.address.street,
};

export function applyBusinessMeta(b: BusinessInfo | undefined) {
  if (!b) return;
  if (b.phone) businessRuntime.phone = b.phone;
  if (b.phoneDigits) businessRuntime.phoneDigits = b.phoneDigits;
  if (b.email) businessRuntime.email = b.email;
  if (b.nipt !== undefined) businessRuntime.nipt = b.nipt;
  if (b.address) businessRuntime.address = b.address;
  if (b.street !== undefined) businessRuntime.street = b.street;
  if (b.hours) businessRuntime.hours = b.hours;
  if (b.cancelFreeHours) businessRuntime.cancelFreeHours = b.cancelFreeHours;
  if (b.cancellationPolicy)
    businessRuntime.cancellationPolicy = b.cancellationPolicy;
  if (b.mailConfigured !== undefined)
    businessRuntime.mailConfigured = b.mailConfigured;
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = SITE.url.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
