import crypto from "node:crypto";
import { getAdminClient, readBody, sendJson } from "../_push.js";

const RESET_TTL_MINUTES = 20;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const PASSWORD_RESET_FROM =
  process.env.PASSWORD_RESET_FROM ||
  process.env.RESEND_FROM ||
  "The Yardline <no-reply@the-yardline.com>";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function createCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendResetEmail(email, code) {
  if (!RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: PASSWORD_RESET_FROM,
      to: email,
      subject: "The Yardline Passwort zurücksetzen",
      text: `Dein The Yardline Reset-Code lautet: ${code}\n\nDer Code ist ${RESET_TTL_MINUTES} Minuten gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren.`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#050506;color:#ffffff;padding:24px">
          <h1 style="margin:0 0 12px;color:#ffffff">The Yardline</h1>
          <p style="margin:0 0 16px">Mit diesem Code kannst du dein Passwort zurücksetzen:</p>
          <div style="font-size:28px;font-weight:900;letter-spacing:4px;background:#111827;border:1px solid #1d4ed8;border-radius:14px;padding:16px;text-align:center">${code}</div>
          <p style="margin:16px 0 0;color:#b8c0cc">Der Code ist ${RESET_TTL_MINUTES} Minuten gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Reset-E-Mail konnte nicht gesendet werden.");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);

    if (!email || !email.includes("@")) {
      return sendJson(res, 400, { error: "Bitte gib deine E-Mail ein." });
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
    const isBlocked = ["deleted", "blocked_deleted", "banned", "blocked", "inactive"].includes(user?.status);

    if (!user || isBlocked) {
      return sendJson(res, 200, {
        message: "Wenn die E-Mail bekannt ist, wurde ein Code gesendet.",
      });
    }

    const code = createCode();
    const now = Date.now();
    const reset = {
      codeHash: hashCode(code),
      expiresAtUtc: new Date(now + RESET_TTL_MINUTES * 60 * 1000).toISOString(),
      requestedAtUtc: new Date(now).toISOString(),
    };
    const legacyData = {
      ...(user.legacy_data && typeof user.legacy_data === "object" ? user.legacy_data : {}),
      passwordReset: reset,
    };

    const { error: updateError } = await supabase
      .from("app_users")
      .update({
        legacy_data: legacyData,
        updated_at: new Date(now).toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    await sendResetEmail(email, code);

    return sendJson(res, 200, {
      message: "Wenn die E-Mail bekannt ist, wurde ein Code gesendet.",
    });
  } catch (error) {
    console.error("PASSWORD RESET REQUEST ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Reset-E-Mail konnte nicht gesendet werden." });
  }
}
