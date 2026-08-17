import { api } from "./api";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration() {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register("/sw.js");
  }
  return navigator.serviceWorker.ready;
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  if (!pushSupported()) {
    throw new Error("unsupported");
  }
  const { enabled, key } = await api.pushVapidKey();
  if (!enabled || !key) throw new Error("disabled");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await getRegistration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe().catch(() => {});
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("invalid");
  }
  await api.pushSubscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
}

export async function disablePush() {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function syncPushIfGranted() {
  if (!pushSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    await enablePush();
  } catch {
    // ignore — user can retry from settings
  }
}
