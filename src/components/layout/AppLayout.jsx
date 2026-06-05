import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { base44 } from "@/api/base44Client";

const ANALYTICS_VERSION = "analytics_event";

function getVisitorId() {
  const storageKey = "yardline_visitor_id";
  const existing = localStorage.getItem(storageKey);

  if (existing) return existing;

  const nextId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(storageKey, nextId);

  return nextId;
}

function shouldTrackPath(pathname) {
  if (!pathname) return false;

  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/data-editor")) return false;
  if (pathname.startsWith("/settings")) return false;

  return true;
}

async function trackPageView(location) {
  const pathname = location.pathname || "/";
  const search = location.search || "";

  if (!shouldTrackPath(pathname)) return;

  const visitorId = getVisitorId();
  const now = new Date().toISOString();

  const pageKey = `${pathname}${search}`;
  const throttleKey = `yardline_last_track_${pageKey}`;
  const lastTracked = Number(localStorage.getItem(throttleKey) || 0);
  const currentTime = Date.now();

  if (currentTime - lastTracked < 60 * 1000) return;

  localStorage.setItem(throttleKey, String(currentTime));

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
        path: pathname,
        search,
        full_path: `${pathname}${search}`,
        created_at: now,
        date: now.slice(0, 10),
      }),
      createdAtUtc: now,
      updatedAtUtc: now,
    });
  } catch (error) {
    console.error("ANALYTICS PAGE VIEW ERROR:", error);
  }
}

export default function AppLayout() {
  const location = useLocation();

  const footerVisibleRoutes = [
    "/",
    "/spiele",
    "/tabellen",
    "/turniere",
    "/wettbewerbe",
    "/team",
    "/club",
    "/league",
  ];

  const hideBottomNavRoutes = [
    "/settings",
    "/support",
    "/legal",
    "/admin",
    "/data-editor",
  ];

  useEffect(() => {
    trackPageView(location);
  }, [location.pathname, location.search]);

  const showFooter = footerVisibleRoutes.some((route) =>
    route === "/" ? location.pathname === "/" : location.pathname.startsWith(route)
  );

  const isDetailLikePage =
    location.pathname.startsWith("/game/") ||
    location.pathname.startsWith("/team/") ||
    location.pathname.startsWith("/club/") ||
    location.pathname.startsWith("/league/") ||
    location.pathname.startsWith("/wettbewerbe/");

  const hideBottomNav = hideBottomNavRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  const showBottomNav = !hideBottomNav;
  const showPageFooter = showFooter && !isDetailLikePage && showBottomNav;

  return (
    <div className="flex flex-col min-h-dvh w-screen max-w-full bg-background overflow-x-hidden">
      <Header />

      <main
        className={`pt-[calc(68px+env(safe-area-inset-top))] w-full max-w-full flex-1 overflow-y-scroll ${
          showBottomNav
            ? "pb-[calc(112px+env(safe-area-inset-bottom))]"
            : "pb-[env(safe-area-inset-bottom)]"
        }`}
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          overflowAnchor: "none",
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.12,
              ease: "easeOut",
            }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {showPageFooter && <Footer />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}