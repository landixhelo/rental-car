import { useEffect, useState } from "react";
import {
  analyticsAllowed,
  getCookieConsent,
  type CookieConsentValue,
} from "../lib/cookieConsent";

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
const META_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
  }
}

function injectAnalytics() {
  if (GA_ID && !document.getElementById("ga4-script")) {
    const s = document.createElement("script");
    s.id = "ga4-script";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  if (META_ID && !document.getElementById("meta-pixel")) {
    const fbq = function (...args: unknown[]) {
      (fbq.queue = fbq.queue || []).push(args);
    } as Window["fbq"] & { queue: unknown[] };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;

    const s = document.createElement("script");
    s.id = "meta-pixel";
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    window.fbq("init", META_ID);
    window.fbq("track", "PageView");
  }
}

/** Inject GA4 + Meta Pixel only after cookie analytics consent. */
export default function Analytics() {
  const [consent, setConsent] = useState<CookieConsentValue>(() =>
    typeof window === "undefined" ? null : getCookieConsent()
  );

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentValue>).detail;
      setConsent(detail ?? getCookieConsent());
    };
    window.addEventListener("autorent-cookie-consent", onChange);
    return () => window.removeEventListener("autorent-cookie-consent", onChange);
  }, []);

  useEffect(() => {
    if (analyticsAllowed(consent)) injectAnalytics();
  }, [consent]);

  return null;
}
