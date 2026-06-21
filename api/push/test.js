import {
  configureWebPush,
  normalizeSubscription,
  readBody,
  sendJson,
} from "../_push.js";

const BRAND_ICON = "/yardline-icon-192.png";
const BRAND_BADGE = "/yardline-icon-180.png";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const subscription = normalizeSubscription(body.subscription);

    if (!subscription) {
      return sendJson(res, 400, {
        error: "Keine gültige Push-Subscription vom Gerät erhalten.",
      });
    }

    const sender = configureWebPush();

    await sender.sendNotification(
      subscription,
      JSON.stringify({
        title: "THE YARDLINE | Push Test",
        body: "Wenn du diese Nachricht siehst, funktioniert Push auf diesem Gerät.",
        icon: BRAND_ICON,
        badge: BRAND_BADGE,
        tag: `yardline_push_test:${Date.now()}`,
        url: "/settings",
        actionUrl: "/settings",
        timestamp: Date.now(),
        vibrate: [160, 80, 160],
        requireInteraction: false,
        data: {
          url: "/settings",
          actionUrl: "/settings",
        },
        actions: [
          {
            action: "open",
            title: "Öffnen",
          },
        ],
      })
    );

    return sendJson(res, 200, {
      status: "success",
      sent: 1,
    });
  } catch (error) {
    console.error("PUSH TEST ERROR:", error);
    return sendJson(res, 500, {
      error: error.message || "Push-Test fehlgeschlagen.",
      statusCode: error.statusCode || null,
      body: error.body || null,
    });
  }
}
