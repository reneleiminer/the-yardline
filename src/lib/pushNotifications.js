const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BBEzKWCamx2YA9lflqjmwmBu513-pMoJQRox0FcPuPnieJElG80NTG1BM448tWtrn_tKQrOaUqNn3hUS9tWxeVc";

const DISMISS_KEY = "yardline_push_prompt_dismissed";
const DISABLED_KEY = "yardline_push_disabled";
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

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer || []);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getVapidPublicKey() {
  try {
    const response = await fetch("/api/push/public-key", {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.publicKey) return data.publicKey;
    }
  } catch {
    // Fall back to the bundled key so older deployments keep working.
  }

  return VAPID_PUBLIC_KEY;
}

async function savePushSubscription(subscription) {
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
}

async function deactivatePushSubscription(subscription) {
  const response = await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Push-Abo konnte nicht deaktiviert werden.");
  }
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

export function arePushNotificationsDisabled() {
  return window.localStorage.getItem(DISABLED_KEY) === "1";
}

export function allowPushNotificationsPrompt() {
  window.localStorage.removeItem(DISABLED_KEY);
  window.localStorage.removeItem(DISMISS_KEY);
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

  allowPushNotificationsPrompt();

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht erlaubt.");
  }

  const registration = await registerServiceWorker();

  if (!registration) {
    throw new Error("Service Worker konnte nicht registriert werden.");
  }

  const publicKey = await getVapidPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let existing = await registration.pushManager.getSubscription();

  const existingKey = existing?.options?.applicationServerKey
    ? arrayBufferToBase64Url(existing.options.applicationServerKey)
    : "";

  if (existing && existingKey && existingKey !== publicKey) {
    await existing.unsubscribe();
    existing = null;
  }

  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    }));

  await savePushSubscription(subscription);

  return subscription;
}

export async function syncExistingPushSubscription() {
  if (
    !isPushSupported() ||
    arePushNotificationsDisabled() ||
    Notification.permission !== "granted"
  ) {
    return null;
  }

  return enablePushNotifications();
}

export async function disablePushNotifications() {
  if (!isPushSupported()) {
    window.localStorage.setItem(DISABLED_KEY, "1");
    dismissPushPrompt();
    return false;
  }

  const registration = await registerServiceWorker();
  const existing = registration
    ? await registration.pushManager.getSubscription()
    : null;

  if (existing) {
    await deactivatePushSubscription(existing);
    await existing.unsubscribe();
  }

  window.localStorage.setItem(DISABLED_KEY, "1");
  dismissPushPrompt();
  return true;
}

export async function getPushSettingsState() {
  if (!isPushSupported()) {
    return {
      supported: false,
      enabled: false,
      permission: "unsupported",
      disabledByUser: true,
    };
  }

  const existing = await getCurrentPushSubscription();

  return {
    supported: true,
    enabled: Notification.permission === "granted" && !!existing && !arePushNotificationsDisabled(),
    permission: Notification.permission,
    disabledByUser: arePushNotificationsDisabled(),
  };
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
