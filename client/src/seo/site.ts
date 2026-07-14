export const SITE = {
  name: "AutoRent",
  legalName: "AutoRent Albania",
  url: "https://www.landixhelo.me",
  localeDefault: "sq_AL",
  locales: {
    sq: "sq_AL",
    en: "en_US",
    it: "it_IT",
  } as const,
  description: {
    sq: "Qira makinash premium në Shqipëri — SUV, sedan dhe sportive. Rezervim online i shpejtë në Tiranë, Durrës dhe Vlorë.",
    en: "Premium car rental in Albania — SUVs, sedans and sports cars. Fast online booking in Tirana, Durrës and Vlorë.",
    it: "Noleggio auto premium in Albania — SUV, berline e sportive. Prenotazione online rapida a Tirana, Durazzo e Valona.",
  },
  keywords: {
    sq: "qira makinash, rental car albania, qira auto tirane, makina me qira, SUV me qira, AutoRent",
    en: "car rental albania, rent a car tirana, albania car hire, SUV rental, AutoRent",
    it: "noleggio auto albania, noleggio tirana, affitto auto albania, SUV noleggio, AutoRent",
  },
  phone: "+355690000000",
  email: "support@autorent.al",
  address: {
    street: "Tiranë",
    locality: "Tiranë",
    region: "Tiranë",
    country: "AL",
  },
  ogImage: "https://www.landixhelo.me/og-cover.svg",
  twitter: "@autorent",
} as const;

export type SeoLocale = keyof typeof SITE.description;

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = SITE.url.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
