import type { NextFunction, Request, Response } from "express";
import type { HelmetOptions } from "helmet";
import { isProd } from "../config/env.js";

/**
 * Permissions-Policy for the public site (Vercel) and API.
 * publickey-credentials-get / -create stay enabled: passkey login + register.
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

/**
 * SPA CSP — keep in sync with client/vercel.json and client/securityHeaders.ts.
 * Hosts from the live app: Google Fonts, GA4, Meta Pixel, Maps embed,
 * Railway media, FCM / browser push.
 * img-src https: — fleet/marketplace allow arbitrary HTTPS image URLs.
 * style-src-attr: React style={{ }} (static Vite build has no per-request nonce).
 * No 'unsafe-eval', no script-src 'unsafe-inline', no 'strict-dynamic'
 * (the last would ignore 'self' without a nonce and block the Vite bundle).
 */
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

export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" },
  noSniff: true,
  originAgentCluster: true,
  xDnsPrefetchControl: { allow: false },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  hidePoweredBy: true,
  strictTransportSecurity: isProd
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false,
      }
    : false,
};

export function applyExtraHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
  next();
}
