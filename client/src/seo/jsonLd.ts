import { SITE, absoluteUrl, businessRuntime } from "./site";
import type { Car } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";

export function organizationJsonLd() {
  const phone = businessRuntime.phone || SITE.phone;
  const email = businessRuntime.email || SITE.email;
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "AutoRental", "LocalBusiness"],
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: absoluteUrl("/favicon.svg"),
    image: SITE.ogImage,
    email,
    telephone: phone,
    ...(businessRuntime.nipt
      ? { taxID: businessRuntime.nipt, vatID: businessRuntime.nipt }
      : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: businessRuntime.street || SITE.address.street || undefined,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    areaServed: [
      { "@type": "City", name: "Tirana" },
      { "@type": "City", name: "Durrës" },
      { "@type": "City", name: "Vlorë" },
      { "@type": "Country", name: "Albania" },
    ],
    priceRange: "€€",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "08:00",
      closes: "20:00",
    },
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: ["sq", "en", "it"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/cars?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function carProductJsonLd(car: Car) {
  const images = (car.images?.length ? car.images : [car.imageUrl])
    .map((src) => {
      const m = mediaUrl(src);
      if (!m) return "";
      if (m.startsWith("http")) return m;
      return absoluteUrl(m);
    })
    .filter(Boolean);

  const path = carPath(car);
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    "@id": absoluteUrl(path),
    name: `${car.brand} ${car.model}`,
    brand: { "@type": "Brand", name: car.brand },
    model: car.model,
    vehicleModelDate: String(car.year),
    description: car.description,
    image: images,
    url: absoluteUrl(path),
    color: car.color || undefined,
    vehicleTransmission: car.transmission,
    fuelType: car.fuel,
    numberOfDoors: car.doors,
    seatingCapacity: car.seats,
    mileageFromOdometer: car.mileage
      ? { "@type": "QuantitativeValue", value: car.mileage }
      : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "EUR",
      price: car.pricePerDay,
      availability:
        car.status === "AVAILABLE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      priceValidUntil: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 90
      )
        .toISOString()
        .slice(0, 10),
      seller: { "@id": `${SITE.url}/#organization` },
    },
    aggregateRating:
      car.ratingCount && car.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: car.ratingAvg,
            reviewCount: car.ratingCount,
          }
        : undefined,
  };
}

export function faqJsonLd(
  items: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function itemListCarsJsonLd(
  cars: Array<{
    id: string;
    slug?: string | null;
    brand: string;
    model: string;
    imageUrl: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: cars.slice(0, 20).map((car, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(carPath(car)),
      name: `${car.brand} ${car.model}`,
    })),
  };
}
