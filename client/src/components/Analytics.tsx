import { useEffect } from "react";

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

/** Inject GA4 + Meta Pixel when env IDs are set on Vercel. */
export default function Analytics() {
  useEffect(() => {
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
      window.gtag("config", GA_ID);
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
  }, []);

  return null;
}
