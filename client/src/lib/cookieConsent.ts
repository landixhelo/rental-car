export type CookieConsentValue = "accepted" | "necessary" | null;

const STORAGE_KEY = "autorent-cookie-consent";

export function getCookieConsent(): CookieConsentValue {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "necessary") return v;
  } catch {
    // ignore
  }
  return null;
}

export function setCookieConsent(value: "accepted" | "necessary") {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
  window.dispatchEvent(
    new CustomEvent("autorent-cookie-consent", { detail: value })
  );
}

export function analyticsAllowed(consent: CookieConsentValue = getCookieConsent()) {
  return consent === "accepted";
}
