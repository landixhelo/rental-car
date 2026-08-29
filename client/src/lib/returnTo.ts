export const RETURN_TO_PARAM = "from";

/** Same-origin path only — blocks protocol-relative open redirects (`//evil.com`). */
export function isSafeInternalPath(
  path: string | null | undefined
): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://") || path.includes("\\")) return false;
  return true;
}

const RETURN_PREFIXES = [
  "/dashboard",
  "/contractor",
  "/calendar",
  "/chats",
  "/reservations",
  "/customers",
  "/locations",
  "/reviews",
  "/promo-codes",
  "/reports",
  "/admin",
  "/super-admin",
  "/profile",
  "/favorites",
] as const;

export function isSafeReturnTo(path: string | null | undefined): path is string {
  if (!isSafeInternalPath(path)) return false;
  const pathname = path.split("?")[0];
  return RETURN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function readReturnTo(
  location: { search: string; state: unknown },
  fallback: string
): string {
  const stateFrom =
    location.state &&
    typeof location.state === "object" &&
    "from" in location.state
      ? String((location.state as { from?: unknown }).from || "")
      : "";
  const queryFrom = new URLSearchParams(location.search).get(RETURN_TO_PARAM) || "";
  if (isSafeReturnTo(stateFrom)) return stateFrom;
  if (isSafeReturnTo(queryFrom)) return queryFrom;
  return fallback;
}

export function withReturnTo(pathname: string, from: string) {
  if (!isSafeReturnTo(from)) return { pathname };
  return {
    pathname,
    search: `?${RETURN_TO_PARAM}=${encodeURIComponent(from)}`,
    state: { from },
  };
}

export function reservationLocation(id: string, from: string) {
  return withReturnTo(`/reservations/${id}`, from);
}

export function customerHistoryLocation(id: string, from: string) {
  return withReturnTo(`/customers/${id}`, from);
}

export function backLabelKey(path: string) {
  const pathname = path.split("?")[0];
  if (pathname === "/customers") return "opsPages.backToCustomers";
  if (pathname.startsWith("/customers/")) return "opsPages.backToHistory";
  if (pathname === "/calendar" || pathname.startsWith("/calendar/")) {
    return "opsPages.backToCalendar";
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "opsPages.backToDashboard";
  }
  return "reservations.backToList";
}
