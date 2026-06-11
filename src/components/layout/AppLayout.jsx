import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2, LogIn, UserPlus } from "lucide-react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";
import { trackPageView } from "@/lib/analyticsTracking";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function AuthScreen() {
  const {
    loginUser,
    registerUser,
    isLoadingAuth,
    authError,
  } = useAuth();

  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    birthDate: "",
    email: "",
    password: "",
    login: "",
  });
  const [localError, setLocalError] = useState("");

  const updateForm = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    const result = mode === "register"
      ? await registerUser(form)
      : await loginUser({
        login: form.login,
        password: form.password,
      });

    if (!result.ok) {
      setLocalError(result.error?.message || "Das hat nicht geklappt.");
    }
  };

  const errorMessage = localError || authError?.message || "";

  return (
    <div className="min-h-dvh bg-[#f1f4f8] text-black">
      <div className="min-h-dvh bg-[linear-gradient(135deg,rgba(0,91,255,0.18),transparent_34%),linear-gradient(315deg,rgba(188,18,34,0.18),transparent_32%)] px-5 py-6">
        <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-md flex-col">
          <div className="flex items-center justify-between">
            <img
              src="/yardline-logo.png"
              alt="The Yardline"
              className="h-12 w-auto object-contain"
            />
            <span className="rounded-full bg-blue-700 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
              Europa
            </span>
          </div>

          <div className="mt-8 rounded-[28px] bg-blue-800 p-5 text-white shadow-[0_22px_70px_rgba(0,38,105,0.28)]">
            <div className="min-h-[260px] rounded-[24px] bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(145deg,#005bff,#06163c_70%)] p-6">
              <p className="yardline-script text-[30px] leading-none text-red-300">
                Welcome
              </p>
              <h1 className="mt-5 text-[42px] font-black uppercase leading-[0.9] tracking-tight">
                American<br />Football
              </h1>
              <p className="mt-4 max-w-[250px] text-sm font-semibold leading-relaxed text-white/80">
                Die Zentrale fuer Scores, News, Highlights und Football aus Europa.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] bg-white p-4 shadow-[0_16px_48px_rgba(13,24,48,0.12)]">
            <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setLocalError("");
                }}
                className={`rounded-xl py-2 text-sm font-black transition-colors ${
                  mode === "register"
                    ? "bg-red-700 text-white"
                    : "text-black/55"
                }`}
              >
                Registrieren
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setLocalError("");
                }}
                className={`rounded-xl py-2 text-sm font-black transition-colors ${
                  mode === "login"
                    ? "bg-blue-700 text-white"
                    : "text-black/55"
                }`}
              >
                Einloggen
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {mode === "register" ? (
                <>
                  <Input
                    value={form.username}
                    onChange={event => updateForm("username", event.target.value)}
                    placeholder="Benutzername"
                    autoComplete="username"
                    className="bg-slate-50 text-black"
                  />
                  <Input
                    value={form.displayName}
                    onChange={event => updateForm("displayName", event.target.value)}
                    placeholder="Normaler Name"
                    autoComplete="name"
                    className="bg-slate-50 text-black"
                  />
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={event => updateForm("birthDate", event.target.value)}
                    aria-label="Geburtsdatum"
                    className="bg-slate-50 text-black"
                  />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={event => updateForm("email", event.target.value)}
                    placeholder="E-Mail"
                    autoComplete="email"
                    className="bg-slate-50 text-black"
                  />
                </>
              ) : (
                <Input
                  value={form.login}
                  onChange={event => updateForm("login", event.target.value)}
                  placeholder="Benutzername oder E-Mail"
                  autoComplete="username"
                  className="bg-slate-50 text-black"
                />
              )}

              <Input
                type="password"
                value={form.password}
                onChange={event => updateForm("password", event.target.value)}
                placeholder="Passwort"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="bg-slate-50 text-black"
              />

              {errorMessage && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {errorMessage}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoadingAuth}
                className="h-12 w-full rounded-2xl bg-blue-700 text-sm font-black text-white hover:bg-blue-800"
              >
                {isLoadingAuth ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : mode === "register" ? (
                  <UserPlus className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {mode === "register" ? "Konto erstellen" : "Einloggen"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    eyebrow: "The Yardline",
    title: "American Football Zentrale in Europa",
    text: "Entdecke Spiele, Wettbewerbe, Teams und alles, was rund um Football in Europa passiert.",
  },
  {
    eyebrow: "Match Center",
    title: "Scores, Termine und Game Details",
    text: "Verfolge kommende Spiele, Ergebnisse, Streams, Statistiken und Game of the Week an einem Ort.",
  },
  {
    eyebrow: "Highlights",
    title: "News, Videos und Podcast",
    text: "Bleib nah dran mit Game Highlights, News, Gameday Shots und neuen Podcast-Folgen.",
  },
];

function OnboardingScreen() {
  const { completeOnboarding, isLoadingAuth } = useAuth();
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];
  const lastSlide = index === ONBOARDING_SLIDES.length - 1;

  const next = async () => {
    if (!lastSlide) {
      setIndex(current => current + 1);
      return;
    }

    await completeOnboarding();
  };

  return (
    <div className="min-h-dvh bg-[#f1f4f8] px-5 py-6 text-black">
      <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <img
            src="/yardline-logo.png"
            alt="The Yardline"
            className="h-12 w-auto object-contain"
          />
          <span className="text-xs font-black uppercase tracking-wide text-red-700">
            Schritt {index + 1}/{ONBOARDING_SLIDES.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.title}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="mt-8 flex-1 rounded-[32px] bg-white p-5 shadow-[0_20px_70px_rgba(13,24,48,0.12)]"
          >
            <div className="flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,0.30),transparent_25%),linear-gradient(150deg,#0048d9,#0a1d4a_58%,#b51222)] p-6 text-white">
              <p className="yardline-script text-[30px] leading-none text-red-200">
                {slide.eyebrow}
              </p>
              <h1 className="mt-5 text-[38px] font-black uppercase leading-[0.92] tracking-tight">
                {slide.title}
              </h1>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/82">
                {slide.text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-2">
            {ONBOARDING_SLIDES.map((item, dotIndex) => (
              <span
                key={item.title}
                className={`h-2 rounded-full transition-all ${
                  dotIndex === index ? "w-8 bg-red-700" : "w-2 bg-black/20"
                }`}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={next}
            disabled={isLoadingAuth}
            className="h-12 rounded-2xl bg-blue-700 px-5 font-black text-white hover:bg-blue-800"
          >
            {lastSlide ? "Verstanden" : "Weiter"}
            {!lastSlide && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isLoadingAuth,
    appUserSnapshot,
  } = useAuth();
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

  if (isLoadingAuth && !appUserSnapshot) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
      </div>
    );
  }

  if (!isAuthenticated || !appUserSnapshot) {
    return <AuthScreen />;
  }

  if (appUserSnapshot.needsOnboarding) {
    return <OnboardingScreen />;
  }

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
