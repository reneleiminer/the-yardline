import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";
import { trackPageView } from "@/lib/analyticsTracking";

const MAIN_TABS = [
  { path: "/", label: "Home" },
  { path: "/feed", label: "News" },
  { path: "/match-center", label: "Match Center" },
  { path: "/highlights", label: "Game Highlights" },
];

function getMainTabIndex(pathname) {
  return MAIN_TABS.findIndex((tab) =>
    tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path)
  );
}

function MainPageTabs({ activeIndex }) {
  if (activeIndex < 0) return null;

  return (
    <div className="w-full overflow-x-auto bg-white px-4 pt-4 hide-scrollbar">
      <div className="mx-auto flex w-full max-w-3xl items-end gap-6 whitespace-nowrap">
        {MAIN_TABS.map((tab, index) => {
          const active = index === activeIndex;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`relative pb-3 leading-none transition-colors ${
                active
                  ? "yardline-script text-[34px] text-red-700"
                  : "text-[22px] font-black text-black/35"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-red-700" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const previousIndexRef = useRef(getMainTabIndex(location.pathname));
  const activeIndex = getMainTabIndex(location.pathname);
  const [direction, setDirection] = useState(0);

  const footerVisibleRoutes = [
    "/",
    "/match-center",
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
  const showPageFooter = false;

  useEffect(() => {
    trackPageView(location);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const previous = previousIndexRef.current;
    if (activeIndex >= 0 && previous >= 0 && activeIndex !== previous) {
      setDirection(activeIndex > previous ? 1 : -1);
    } else {
      setDirection(0);
    }
    previousIndexRef.current = activeIndex;
  }, [activeIndex]);

  const canSwipeMainPages = activeIndex >= 0;
  const pageMotion = useMemo(() => ({
    initial: { opacity: 0, x: direction >= 0 ? 42 : -42 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction >= 0 ? -42 : 42 },
  }), [direction]);

  const handleDragEnd = (_event, info) => {
    if (!canSwipeMainPages) return;

    const threshold = 80;
    if (info.offset.x <= -threshold && activeIndex < MAIN_TABS.length - 1) {
      navigate(MAIN_TABS[activeIndex + 1].path);
    }
    if (info.offset.x >= threshold && activeIndex > 0) {
      navigate(MAIN_TABS[activeIndex - 1].path);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh w-screen max-w-full bg-white overflow-x-hidden">
      <Header />

      <main
        className={`yardline-main-scroll relative z-10 w-full max-w-full flex-1 overflow-y-auto pt-[calc(68px+env(safe-area-inset-top))] ${
          showBottomNav
            ? "pb-[calc(92px+env(safe-area-inset-bottom))]"
            : "pb-[env(safe-area-inset-bottom)]"
        }`}
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          overflowAnchor: "none",
        }}
      >
        <MainPageTabs activeIndex={activeIndex} />

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={location.pathname}
            initial={pageMotion.initial}
            animate={pageMotion.animate}
            exit={pageMotion.exit}
            transition={{ duration: 0.18, ease: "easeOut" }}
            drag={canSwipeMainPages ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
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
