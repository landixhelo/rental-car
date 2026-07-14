/**
 * Resolve media paths for <img src>.
 * - /api/media/* → same-origin (Vercel proxies to Railway)
 * - /uploads/* → Railway host (legacy disk uploads; may be gone after redeploy)
 * - http(s)/data/blob → unchanged
 */
const UPLOAD_BASE =
  (import.meta.env.VITE_UPLOAD_BASE as string | undefined)?.replace(/\/$/, "") ||
  (import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
      "http://localhost:5000"
    : "https://rental-car-production.up.railway.app");

export function mediaUrl(src?: string | null): string {
  if (!src) return "";
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }
  // Same-origin API media (persisted in Postgres)
  if (src.startsWith("/api/media/")) {
    return import.meta.env.DEV ? `${UPLOAD_BASE}${src}` : src;
  }
  if (src.startsWith("/uploads/")) {
    return `${UPLOAD_BASE}${src}`;
  }
  return src;
}
