import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";

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
    "/podcast",
  ];

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
        <AnimatePresence initial={false} mode="wait">
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
      {showBottomNav && <PushPermissionPrompt />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
