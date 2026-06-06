import {
  getAdminClient,
  normalizeSubscription,
  readBody,
  sendJson,
} from "../_push.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const subscription = normalizeSubscription(body.subscription);

    if (!subscription) {
      return sendJson(res, 400, { error: "Invalid push subscription." });
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          subscription,
          visitor_id: body.visitorId || null,
          user_agent: req.headers["user-agent"] || "",
          active: true,
          updated_at: now,
        },
        { onConflict: "endpoint" }
      );

    if (error) throw error;

    return sendJson(res, 200, { status: "success" });
  } catch (error) {
    console.error("PUSH SUBSCRIBE ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Push subscription failed." });
  }
}
