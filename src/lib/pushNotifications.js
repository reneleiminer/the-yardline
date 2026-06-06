const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BBEzKWCamx2YA9lflqjmwmBu513-pMoJQRox0FcPuPnieJElG80NTG1BM448tWtrn_tKQrOaUqNn3hUS9tWxeVc";

const DISMISS_KEY = "yardline_push_prompt_dismissed";
const VISITOR_KEY = "yardline_visitor_id";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getVisitorId() {
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const next = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(VISITOR_KEY, next);
  return next;
}

export function wasPushPromptDismissed() {
  return window.localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissPushPrompt() {
  window.localStorage.setItem(DISMISS_KEY, "1");
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;

  return navigator.serviceWorker.register("/sw.js");
}

export async function getCurrentPushSubscription() {
  if (!isPushSupported()) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Push-Benachrichtigungen werden auf diesem Geraet nicht unterstuetzt.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht erlaubt.");
  }

  const registration = await registerServiceWorker();

  if (!registration) {
    throw new Error("Service Worker konnte nicht registriert werden.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      subscription,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Push-Abo konnte nicht gespeichert werden.");
  }

  return subscription;
}

export async function requestPushEventCheck(reason = "client_update") {
  try {
    await fetch(`/api/push/check?reason=${encodeURIComponent(reason)}`, {
      method: "POST",
    });
  } catch {
    // Push is best-effort; the app action itself must never fail because of it.
  }
}
