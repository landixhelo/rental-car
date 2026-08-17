export function syncAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (count > 0 && typeof nav.setAppBadge === "function") {
    nav.setAppBadge(count).catch(() => {});
    return;
  }
  if (typeof nav.clearAppBadge === "function") {
    nav.clearAppBadge().catch(() => {});
  }
}

export function badgeLabel(count: number) {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}
