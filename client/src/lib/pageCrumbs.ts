import type { Crumb } from "../components/Breadcrumbs";
import type { Locale } from "../i18n";
import { locationBySlug, RENTAL_LOCATIONS } from "./rentalLocations";

function prettifySlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID");
}

export function pageCrumbs(
  pathname: string,
  t: (key: string) => string,
  locale: Locale
): Crumb[] | null {
  if (pathname === "/") return null;
  if (pathname === "/ops" || pathname === "/new-admin") return null;
  if (pathname === "/forgot-password" || pathname === "/reset-password") {
    return null;
  }

  if (pathname === "/cars") {
    return [{ label: t("details.crumbFleet") }];
  }

  const carMatch = /^\/cars\/([^/]+)$/.exec(pathname);
  if (carMatch) {
    return [
      { label: t("details.crumbFleet"), to: "/cars" },
      { label: prettifySlug(carMatch[1]) },
    ];
  }

  if (pathname === "/checkout") {
    return [
      { label: t("details.crumbFleet"), to: "/cars" },
      { label: t("checkout.stepDetails") },
    ];
  }
  if (pathname === "/checkout/confirmed") {
    return [
      { label: t("nav.reservations"), to: "/reservations" },
      { label: t("checkout.confirmedTitle") },
    ];
  }

  if (pathname === "/forgot-password") {
    return [{ label: t("auth.forgotTitle") }];
  }
  if (pathname === "/reset-password") {
    return [{ label: t("auth.resetTitle") }];
  }
  if (pathname === "/contact") return [{ label: t("nav.contact") }];
  if (pathname === "/faq") return [{ label: t("nav.faq") }];
  if (pathname === "/terms") return [{ label: t("footer.terms") }];

  const loc =
    locationBySlug(pathname.replace(/^\//, "")) ||
    RENTAL_LOCATIONS.find((l) => l.path === pathname);
  if (loc) {
    return [
      { label: t("nav.locations"), to: "/#cities" },
      { label: locale === "sq" ? loc.citySq : loc.cityEn },
    ];
  }

  if (pathname === "/reservations") {
    return [{ label: t("nav.reservations") }];
  }
  if (pathname.startsWith("/reservations/")) {
    return [
      { label: t("nav.reservations"), to: "/reservations" },
      { label: t("reservations.viewDetails") },
    ];
  }
  if (pathname === "/favorites") return [{ label: t("nav.favorites") }];
  if (pathname === "/profile") return [{ label: t("dashboard.navSettings") }];
  if (pathname === "/dashboard") return [{ label: t("nav.dashboard") }];
  if (pathname === "/chats") return [{ label: t("nav.chats") }];
  if (pathname === "/contractor") return [{ label: t("nav.fleet") }];
  if (pathname === "/calendar") return [{ label: t("dashboard.navCalendar") }];
  if (pathname === "/customers") return [{ label: t("dashboard.navCustomers") }];
  if (pathname.startsWith("/customers/")) {
    return [
      { label: t("dashboard.navCustomers"), to: "/customers" },
      { label: t("opsPages.viewHistory") },
    ];
  }
  if (pathname === "/locations") return [{ label: t("dashboard.navLocations") }];
  if (pathname === "/reviews") return [{ label: t("dashboard.navReviews") }];
  if (pathname === "/promo-codes") return [{ label: t("dashboard.navPromo") }];
  if (pathname === "/reports") return [{ label: t("dashboard.navReports") }];
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return [{ label: t("nav.admin") }];
  }
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return [{ label: t("nav.superAdmin") }];
  }

  return [{ label: prettifySlug(pathname.split("/").filter(Boolean).pop() || "") }];
}
