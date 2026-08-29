/**
 * Production security headers for the Vite SPA.
 * Keep the CSP string in sync with vercel.json and server/src/security/httpHeaders.ts.
 *
 * script-src has no 'unsafe-eval' / 'unsafe-inline' / 'strict-dynamic':
 * Vite emits external module scripts; GA4 + Meta Pixel are injected via
 * document.createElement('script') with src= (Analytics.tsx).
 * 'strict-dynamic' without a per-request nonce would ignore 'self' and
 * block the app. style-src-attr is required for React style={{ }}.
 */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "bluetooth=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=(self)",
  "publickey-credentials-create=(self)",
  "screen-wake-lock=()",
  "serial=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

export const FRONTEND_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' https://www.googletagmanager.com https://connect.facebook.net",
  "script-src-attr 'none'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-elem 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://www.landixhelo.me https://landixhelo.me https://rental-car-production.up.railway.app https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://fcm.googleapis.com https://fcmregistrations.googleapis.com https://android.googleapis.com https://updates.push.services.mozilla.com https://web.push.apple.com",
  "frame-src https://maps.google.com https://www.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": FRONTEND_CSP,
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": PERMISSIONS_POLICY,
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
};
