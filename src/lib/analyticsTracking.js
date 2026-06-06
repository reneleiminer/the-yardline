import { base44 } from "@/api/base44Client";

const ANALYTICS_VERSION = "analytics_event";
const VISITOR_KEY = "yardline_visitor_id";
const SESSION_KEY = "yardline_session_id";
const SESSION_LAST_SEEN_KEY = "yardline_session_last_seen";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PAGE_THROTTLE_MS = 30 * 60 * 1000;

const INTERNAL_PREFIXES = [
  "/admin",
  "/data-editor",
  "/podcast",
  "/settings",
  "/support",
  "/legal",
];

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function getOrCreateStorageValue(key, prefix) {
  if (!canUseStorage()) return "";

  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function getVisitorId() {
  return getOrCreateStorageValue(VISITOR_KEY, "visitor");
}

function getSessionId(nowMs) {
  if (!canUseStorage()) return "";

  const lastSeen = Number(window.localStorage.getItem(SESSION_LAST_SEEN_KEY) || 0);
  let sessionId = window.localStorage.getItem(SESSION_KEY);

  if (!sessionId || nowMs - lastSeen > SESSION_TIMEOUT_MS) {
    sessionId = `session_${nowMs}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }

  window.localStorage.setItem(SESSION_LAST_SEEN_KEY, String(nowMs));
  return sessionId;
}

function shouldTrackPath(pathname) {
  if (!pathname) return false;
  return !INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getDeviceType() {
  if (typeof window === "undefined") return "unknown";

  const width = window.innerWidth || 0;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function getRouteGroup(pathname) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/game/")) return "game_detail";
  if (pathname.startsWith("/spiele")) return "games";
  if (pathname.startsWith("/tabellen")) return "tables";
  if (pathname.startsWith("/wettbewerbe")) return "competitions";
  if (pathname.startsWith("/team/")) return "team";
  if (pathname.startsWith("/club/")) return "club";
  if (pathname.startsWith("/league/")) return "league";
  if (pathname.startsWith("/highlights")) return "highlights";
  if (pathname.startsWith("/feed") || pathname.startsWith("/post/")) return "feed";
  return "other";
}

function getReferrerHost() {
  if (typeof document === "undefined" || !document.referrer) return "direct";

  try {
    const referrer = new URL(document.referrer);
    return referrer.hostname || "direct";
  } catch {
    return "direct";
  }
}

function wasRecentlyTracked(pageKey, nowMs) {
  if (!canUseStorage()) return true;

  const key = `yardline_last_pageview_${pageKey}`;
  const lastTracked = Number(window.localStorage.getItem(key) || 0);

  if (nowMs - lastTracked < PAGE_THROTTLE_MS) return true;

  window.localStorage.setItem(key, String(nowMs));
  return false;
}

export async function trackPageView(location) {
  const pathname = location?.pathname || "/";
  const search = location?.search || "";

  if (!shouldTrackPath(pathname)) return;

  const nowMs = Date.now();
  const pageKey = `${pathname}${search}`;

  if (wasRecentlyTracked(pageKey, nowMs)) return;

  const now = new Date(nowMs);
  const createdAt = now.toISOString();
  const visitorId = getVisitorId();
  const sessionId = getSessionId(nowMs);

  try {
    await base44.entities.AppUpdate.create({
      title: "Analytics Event",
      version: ANALYTICS_VERSION,
      isActive: false,
      showAsPopup: false,
      imageUrl: "",
      message: JSON.stringify({
        type: "page_view",
        visitor_id: visitorId,
        session_id: sessionId,
        path: pathname,
        search,
        full_path: pageKey,
        route_group: getRouteGroup(pathname),
        referrer_host: getReferrerHost(),
        device_type: getDeviceType(),
        viewport_width: window.innerWidth || null,
        viewport_height: window.innerHeight || null,
        user_agent: navigator.userAgent || "",
        created_at: createdAt,
        date: createdAt.slice(0, 10),
      }),
      createdAtUtc: createdAt,
      updatedAtUtc: createdAt,
    });
  } catch (error) {
    console.error("ANALYTICS PAGE VIEW ERROR:", error);
  }
}
