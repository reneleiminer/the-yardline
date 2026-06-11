import crypto from "node:crypto";
import { getAdminClient, readBody, sendJson } from "../_push.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const code = String(body.code || "").trim();
    const password = String(body.password || "");

    if (!email || !email.includes("@")) {
      return sendJson(res, 400, { error: "Bitte gib deine E-Mail ein." });
    }

    if (!code) {
      return sendJson(res, 400, { error: "Bitte gib den Code aus der E-Mail ein." });
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: "Das neue Passwort braucht mindestens 6 Zeichen." });
    }

    const supabase = getAdminClient();
    const { data: users, error } = await supabase
      .from("app_users")
      .select("id,email,is_internal_user,status,legacy_data")
      .eq("email", email)
      .eq("is_internal_user", false)
      .limit(1);

    if (error) throw error;

    const user = users?.[0];
    const reset = user?.legacy_data?.passwordReset;
    const isBlocked = ["deleted", "blocked_deleted", "banned", "blocked", "inactive"].includes(user?.status);

    if (!user || isBlocked || !reset?.codeHash || !reset?.expiresAtUtc) {
      return sendJson(res, 400, { error: "Der Reset-Code ist ungültig oder abgelaufen." });
    }

    if (new Date(reset.expiresAtUtc).getTime() < Date.now()) {
      return sendJson(res, 400, { error: "Der Reset-Code ist abgelaufen." });
    }

    if (hashCode(code) !== reset.codeHash) {
      return sendJson(res, 400, { error: "Der Reset-Code ist falsch." });
    }

    const legacyData = {
      ...(user.legacy_data && typeof user.legacy_data === "object" ? user.legacy_data : {}),
      passwordReset: null,
    };

    const { error: updateError } = await supabase
      .from("app_users")
      .update({
        password_hash: password,
        legacy_data: legacyData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    return sendJson(res, 200, {
      message: "Passwort wurde aktualisiert.",
    });
  } catch (error) {
    console.error("PASSWORD RESET CONFIRM ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Passwort konnte nicht zurückgesetzt werden." });
  }
}
