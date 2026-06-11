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

function MainPageTabs({ activeIndex, onNavigate }) {
  if (activeIndex < 0) return null;

  const activeTab = MAIN_TABS[activeIndex];

  return (
    <div className="w-full bg-white px-4 pt-4">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="flex min-w-0 justify-end gap-4 overflow-hidden">
          {MAIN_TABS.slice(0, activeIndex).map((tab, index) => (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={() => onNavigate(index)}
              className="truncate pb-3 text-[20px] font-black leading-none text-black/30"
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <Link
          to={activeTab.path}
          className="relative px-2 pb-3 text-center leading-none"
        >
          <span className="yardline-script whitespace-nowrap text-[38px] text-blue-700">
            {activeTab.label}
          </span>
          <span className="absolute bottom-0 left-2 right-2 h-1 rounded-full bg-blue-700" />
        </Link>

        <div className="flex min-w-0 justify-start gap-4 overflow-hidden">
          {MAIN_TABS.slice(activeIndex + 1).map((tab, offset) => {
            const index = activeIndex + 1 + offset;

            return (
              <Link
                key={tab.path}
                to={tab.path}
                onClick={() => onNavigate(index)}
                className="truncate pb-3 text-[20px] font-black leading-none text-black/30"
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const previousIndexRef = useRef(getMainTabIndex(location.pathname));
  const activeIndex = getMainTabIndex(location.pathname);
  const previousIndex = previousIndexRef.current;
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
  const renderDirection =
    activeIndex >= 0 && previousIndex >= 0 && activeIndex !== previousIndex
      ? activeIndex > previousIndex ? 1 : -1
      : direction;

  const pageMotion = useMemo(() => ({
    initial: { opacity: 0, x: renderDirection >= 0 ? 96 : -96, scale: 0.985 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: renderDirection >= 0 ? -96 : 96, scale: 0.985 },
  }), [renderDirection]);

  const handleDragEnd = (_event, info) => {
    if (!canSwipeMainPages) return;

    const threshold = 80;
    if (info.offset.x <= -threshold && activeIndex < MAIN_TABS.length - 1) {
      setDirection(1);
      navigate(MAIN_TABS[activeIndex + 1].path);
    }
    if (info.offset.x >= threshold && activeIndex > 0) {
      setDirection(-1);
      navigate(MAIN_TABS[activeIndex - 1].path);
    }
  };

  const handleTopTabNavigate = (nextIndex) => {
    if (nextIndex === activeIndex) return;
    setDirection(nextIndex > activeIndex ? 1 : -1);
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
        <MainPageTabs activeIndex={activeIndex} onNavigate={handleTopTabNavigate} />

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={location.pathname}
            initial={pageMotion.initial}
            animate={pageMotion.animate}
            exit={pageMotion.exit}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
