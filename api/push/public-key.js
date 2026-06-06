import { sendJson } from "../_push.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!VAPID_PUBLIC_KEY) {
    return sendJson(res, 500, { error: "Missing VAPID public key." });
  }

  return sendJson(res, 200, { publicKey: VAPID_PUBLIC_KEY });
}
