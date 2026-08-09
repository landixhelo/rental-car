const KEY = "autorent-flash";

export type FlashPayload = {
  title: string;
  message: string;
};

export function setFlash(payload: FlashPayload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function consumeFlash(): FlashPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as FlashPayload;
    if (!parsed?.title || !parsed?.message) return null;
    return parsed;
  } catch {
    return null;
  }
}
