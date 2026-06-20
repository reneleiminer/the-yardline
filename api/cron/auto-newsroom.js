import { sendJson } from "../_push.js";

function getSecret(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return req.headers["x-auto-newsroom-secret"] || req.query?.secret || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  const configuredSecret = process.env.AUTO_NEWSROOM_SECRET || process.env.CRON_SECRET || "";
  if (!configuredSecret || getSecret(req) !== configuredSecret) {
    return sendJson(res, 401, { ok: false, error: "Unauthorized" });
  }

  return sendJson(res, 200, {
    ok: true,
    mode: "manual-ready",
    message: "Auto Newsroom cron endpoint is protected and ready for scheduled generation.",
  });
}
