import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, KeyRound, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";
import { trackPageView } from "@/lib/analyticsTracking";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getImageUrl } from "@/lib/imageUtils";

const MAIN_TABS = [
  { path: "/", label: "Home" },
  { path: "/feed", label: "News" },
  { path: "/match-center", label: "Match Center" },
  { path: "/highlights", label: "Game Highlights" },
  { path: "/settings", label: "Einstellungen" },
];

function getMainTabIndex(pathname) {
  return MAIN_TABS.findIndex((tab) =>
    tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path)
  );
}

function getTargetRouteForInternalRole(roleSlug) {
  if (roleSlug === "admin") return "/admin";
  if (roleSlug === "data_editor") return "/data-editor";
  if (roleSlug === "media_partner") return "/data-editor";
  if (roleSlug === "podcast_partner") return "/podcast";
  if (roleSlug === "club") return "/data-editor";
  return "/";
}

function AuthScreen() {
  const {
    loginUser,
    registerUser,
    requestPasswordReset,
    confirmPasswordReset,
    internalLogin,
    isLoadingAuth,
    authError,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("register");
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    birthDate: "",
    email: "",
    password: "",
    passwordConfirm: "",
    login: "",
    resetCode: "",
  });
  const [localError, setLocalError] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  const updateForm = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");
    setLocalMessage("");

    if (mode === "forgot") {
      const result = await requestPasswordReset({ email: form.email });

      if (!result.ok) {
        setLocalError(result.error?.message || "Reset-E-Mail konnte nicht gesendet werden.");
        return;
      }

      setLocalMessage(result.message || "Wenn die E-Mail bekannt ist, wurde ein Code gesendet.");
      setMode("reset");
      return;
    }

    if (mode === "reset") {
      const result = await confirmPasswordReset({
        email: form.email,
        code: form.resetCode,
        password: form.password,
        passwordConfirm: form.passwordConfirm,
      });

      if (!result.ok) {
        setLocalError(result.error?.message || "Passwort konnte nicht zurückgesetzt werden.");
        return;
      }

      setLocalMessage("Passwort wurde aktualisiert. Du kannst dich jetzt einloggen.");
      setForm(current => ({ ...current, password: "", passwordConfirm: "", resetCode: "", login: current.email }));
      setMode("login");
      return;
    }

    const result = mode === "register"
      ? await registerUser(form)
      : mode === "internal"
        ? await internalLogin({
          username: form.login,
          password: form.password,
        })
        : await loginUser({
          login: form.login,
          password: form.password,
        });

    if (!result.ok) {
      setLocalError(result.error?.message || "Das hat nicht geklappt.");
      return;
    }

    if (mode === "internal") {
      const roleSlug = String(result.appUser?.roleSlug || result.appUser?.role || "").toLowerCase();
      navigate(getTargetRouteForInternalRole(roleSlug), { replace: true });
    }
  };

  const errorMessage = localError || authError?.message || "";

  return (
    <div className="min-h-dvh bg-[#08101f] text-white">
      <div className="relative min-h-dvh overflow-hidden">
        <img
          src="/yardline-launch.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061126]/10 via-[#061126]/42 to-[#061126]" />
        <div className="absolute inset-x-0 bottom-0 h-[54dvh] bg-gradient-to-t from-[#061126] via-[#061126]/96 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <img
              src="/yardline-logo.png"
              alt="The Yardline"
              className="h-11 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
            />
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
              Europe
            </span>
          </div>

          <div className="mt-auto">
            <div className="mb-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
                The Yardline
              </p>
              <h1 className="mt-2 text-[46px] font-black uppercase italic leading-[0.86] tracking-tight">
                American<br />
                <span className="text-[#c20f1a]">Football</span>
              </h1>
              <p className="mt-3 max-w-[320px] text-sm font-semibold leading-relaxed text-white/76">
                All leagues in one app. News, Match Center, Highlights und Football aus Europa.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-[#071329]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="grid grid-cols-3 rounded-2xl bg-white/7 p-1">
                {[
                  { key: "register", label: "Registrieren" },
                  { key: "login", label: "Login" },
                  { key: "internal", label: "Intern" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setMode(item.key);
                      setLocalError("");
                      setLocalMessage("");
                    }}
                    className={`rounded-xl py-2 text-[11px] font-black uppercase tracking-wide transition-colors ${
                      mode === item.key
                        ? "bg-[#c20f1a] text-white"
                        : "text-white/48"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {mode === "register" ? (
                <>
                  <Input
                    value={form.username}
                    onChange={event => updateForm("username", event.target.value)}
                    placeholder="Benutzername"
                    autoComplete="username"
                    className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                  />
                  <Input
                    value={form.displayName}
                    onChange={event => updateForm("displayName", event.target.value)}
                    placeholder="Normaler Name"
                    autoComplete="name"
                    className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                  />
                  <label className="block">
                    <span className="mb-1 block px-1 text-[10px] font-black uppercase tracking-wide text-white/52">
                      Geburtsdatum
                    </span>
                    <Input
                      type="date"
                      value={form.birthDate}
                      onChange={event => updateForm("birthDate", event.target.value)}
                      aria-label="Geburtsdatum"
                      className="h-12 min-w-0 rounded-2xl border-white/10 bg-white/10 text-white [color-scheme:dark]"
                    />
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={event => updateForm("email", event.target.value)}
                    placeholder="E-Mail"
                    autoComplete="email"
                    className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                  />
                </>
              ) : mode === "forgot" || mode === "reset" ? (
                <>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={event => updateForm("email", event.target.value)}
                    placeholder="E-Mail"
                    autoComplete="email"
                    className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                  />
                  {mode === "reset" && (
                    <Input
                      value={form.resetCode}
                      onChange={event => updateForm("resetCode", event.target.value)}
                      placeholder="Code aus der E-Mail"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                    />
                  )}
                </>
              ) : (
                <Input
                  value={form.login}
                  onChange={event => updateForm("login", event.target.value)}
                  placeholder={mode === "internal" ? "Interner Benutzername" : "Benutzername oder E-Mail"}
                  autoComplete="username"
                  className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                />
              )}

              {mode !== "forgot" && (
                <Input
                  type="password"
                  value={form.password}
                  onChange={event => updateForm("password", event.target.value)}
                  placeholder={mode === "reset" ? "Neues Passwort" : "Passwort"}
                  autoComplete={mode === "register" || mode === "reset" ? "new-password" : "current-password"}
                  className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                />
              )}

              {(mode === "register" || mode === "reset") && (
                <Input
                  type="password"
                  value={form.passwordConfirm}
                  onChange={event => updateForm("passwordConfirm", event.target.value)}
                  placeholder="Passwort bestätigen"
                  autoComplete="new-password"
                  className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                />
              )}

              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setLocalError("");
                    setLocalMessage("");
                  }}
                  className="text-xs font-black text-white/70 underline decoration-[#005bff] decoration-2 underline-offset-4 transition-colors hover:text-white"
                >
                  Passwort vergessen?
                </button>
              )}

              {errorMessage && (
                <p className="rounded-2xl border border-red-400/30 bg-red-500/14 px-3 py-2 text-xs font-bold text-red-100">
                  {errorMessage}
                </p>
              )}

              {localMessage && (
                <p className="rounded-2xl border border-blue-400/30 bg-blue-500/14 px-3 py-2 text-xs font-bold text-blue-50">
                  {localMessage}
                </p>
              )}

              <Button
                type="submit"
                disabled={isLoadingAuth}
                className="h-[52px] w-full rounded-2xl bg-[#c20f1a] text-sm font-black uppercase tracking-wide text-white shadow-[0_12px_34px_rgba(194,15,26,0.35)] hover:bg-[#a90d16]"
              >
                {mode === "register" ? (
                  <UserPlus className="mr-2 h-4 w-4" />
                ) : mode === "forgot" ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : mode === "reset" ? (
                  <KeyRound className="mr-2 h-4 w-4" />
                ) : mode === "internal" ? (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isLoadingAuth
                  ? "Bitte warten"
                  : mode === "register"
                    ? "Get Started"
                    : mode === "forgot"
                      ? "Reset-Code senden"
                      : mode === "reset"
                        ? "Passwort speichern"
                    : "Einloggen"}
              </Button>

              {(mode === "forgot" || mode === "reset") && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setLocalError("");
                    setLocalMessage("");
                  }}
                  className="w-full text-center text-xs font-black uppercase tracking-wide text-white/55 transition-colors hover:text-white"
                >
                  Zurück zum Login
                </button>
              )}
            </form>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/support"
                className="inline-flex items-center justify-center text-xs font-black uppercase tracking-wide text-white/70 underline decoration-[#005bff] decoration-2 underline-offset-4 transition-colors hover:text-white"
              >
                Support Formular
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    kind: "leagues",
    eyebrow: "The Yardline",
    title: "American Football",
    accent: "Football",
    text: "All leagues in one app. News, Spiele, Tabellen, Highlights und Football ohne Umwege.",
    image: "/onboarding/intro-player-run.jpg",
  },
  {
    eyebrow: "Match Center",
    title: "Live Games",
    accent: "Games",
    text: "Spiele, Ergebnisse, Game of the Week und Detailseiten direkt in der App.",
    image: "/onboarding/intro-kickoff-night.jpg",
  },
  {
    eyebrow: "Tables",
    title: "Teams & Ligen",
    accent: "Ligen",
    text: "Tabellen nach Gruppen, Teams nach Liga und Wettbewerbe klar sortiert.",
    image: "/onboarding/intro-helmet-day.jpg",
  },
  {
    eyebrow: "Media",
    title: "Highlights",
    accent: "Highlights",
    text: "Game Highlights, Podcast, GameDay Shots und News ohne Umwege.",
    image: "/onboarding/intro-touchdown.jpg",
  },
  {
    eyebrow: "Community",
    title: "Stay Updated",
    accent: "Updated",
    text: "Pushs, Support und App-Updates halten dich nah am Football.",
    image: "/onboarding/intro-field-night.jpg",
  },
];

function resolveOnboardingImage(url, fallback = "/onboarding/intro-player-run.jpg") {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (value.startsWith("/")) return value;
  return getImageUrl(value, fallback);
}

function getIntroLeagues(leagues = []) {
  const selected = leagues
    .filter(league => league.showInOnboarding)
    .sort((a, b) => {
      const orderA = Number(a.onboardingOrder || 99);
      const orderB = Number(b.onboardingOrder || 99);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  const fallback = [...leagues]
    .sort((a, b) => {
      const levelA = Number(a.level ?? 99);
      const levelB = Number(b.level ?? 99);
      if (levelA !== levelB) return levelA - levelB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  return (selected.length > 0 ? selected : fallback).slice(0, 4);
}

function OnboardingScreen() {
  const { completeOnboarding, isLoadingAuth } = useAuth();
  const [index, setIndex] = useState(0);
  const { data: leagues = [] } = useQuery({
    queryKey: ["onboarding-leagues"],
    queryFn: () => base44.entities.League.list(),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
  const introLeagues = useMemo(() => getIntroLeagues(leagues), [leagues]);
  const slides = useMemo(() => {
    return ONBOARDING_SLIDES.map((item, itemIndex) => {
      if (itemIndex !== 0) return item;
      return {
        ...item,
        leagues: introLeagues,
      };
    });
  }, [introLeagues]);
  const slide = slides[index];
  const lastSlide = index === slides.length - 1;

  const next = async () => {
    if (!lastSlide) {
      setIndex(current => current + 1);
      return;
    }

    await completeOnboarding();
  };

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="relative min-h-dvh overflow-hidden">
        <img
          src={resolveOnboardingImage(slide.image)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/88" />
        <div className="absolute inset-x-0 bottom-0 h-[58dvh] bg-gradient-to-t from-black via-black/82 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <img
              src="/yardline-logo.png"
              alt="The Yardline"
              className="h-12 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
            />
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
              {index + 1}/{slides.length}
            </span>
          </div>

          <div className="mt-auto pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.title}
                initial={{ opacity: 0, x: 44 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -44 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/78">
                  {slide.eyebrow}
                </p>
                <h1 className="mt-2 max-w-[360px] text-[48px] font-black uppercase leading-[0.86] tracking-normal">
                  {slide.title.replace(slide.accent, "").trim()}{" "}
                  <span className="text-[#c20f1a]">{slide.accent}</span>
                </h1>
                <p className="mt-4 max-w-[330px] text-sm font-semibold leading-relaxed text-white/78">
                  {slide.text}
                </p>

                {slide.kind === "leagues" && slide.leagues?.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {slide.leagues.map(league => (
                      <div
                        key={league.id}
                        className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/52 p-2.5 backdrop-blur"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white">
                          {league.logo ? (
                            <img
                              src={getImageUrl(league.logo)}
                              alt=""
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-xs font-black text-black">
                              {(league.shortName || league.name || "L").slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-white">
                            {league.shortName || league.name}
                          </p>
                          <p className="truncate text-[9px] font-bold uppercase text-white/48">
                            {league.country || league.season || "League"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-7 flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((item, dotIndex) => (
              <span
                key={item.title}
                className={`h-2 rounded-full transition-all ${
                  dotIndex === index ? "w-9 bg-[#c20f1a]" : "w-2 bg-white/24"
                }`}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={next}
            disabled={isLoadingAuth}
            className="h-[52px] rounded-2xl bg-[#c20f1a] px-6 font-black uppercase tracking-wide text-white shadow-[0_12px_34px_rgba(194,15,26,0.35)] hover:bg-[#a90d16]"
          >
            {lastSlide ? "Get Started" : "Weiter"}
            {!lastSlide && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
            </div>
          </div>
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
  const roleSlug = String(appUserSnapshot?.roleSlug || appUserSnapshot?.role || "").toLowerCase();
  const isInternalSession =
    appUserSnapshot?.isInternalUser === true ||
    ["admin", "data_editor", "media_partner", "podcast_partner", "club"].includes(roleSlug);

  const footerVisibleRoutes = [
    "/",
    "/match-center",
    "/team",
    "/club",
    "/league",
  ];

  const hideBottomNavRoutes = [
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
  const showPageFooter = showFooter;

  useEffect(() => {
    trackPageView(location);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !appUserSnapshot || !isInternalSession) return;

    const isInternalRoute =
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/data-editor") ||
      location.pathname.startsWith("/podcast");

    if (!isInternalRoute) {
      navigate(getTargetRouteForInternalRole(roleSlug), { replace: true });
    }
  }, [
    appUserSnapshot,
    isAuthenticated,
    isInternalSession,
    isLoadingAuth,
    location.pathname,
    navigate,
    roleSlug,
  ]);

  useEffect(() => {
    const previous = previousIndexRef.current;
    if (activeIndex >= 0 && previous >= 0 && activeIndex !== previous) {
      setDirection(activeIndex > previous ? 1 : -1);
    } else {
      setDirection(0);
    }
    previousIndexRef.current = activeIndex;
  }, [activeIndex]);

  const isMainPage = activeIndex >= 0;
  const canSwipeMainPages = isMainPage && !isDetailLikePage;
  const renderDirection =
    activeIndex >= 0 && previousIndex >= 0 && activeIndex !== previousIndex
      ? activeIndex > previousIndex ? 1 : -1
      : direction;

  const pageMotion = useMemo(() => ({
    initial: { opacity: 1, x: renderDirection >= 0 ? "100%" : "-100%" },
    animate: { opacity: 1, x: 0 },
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

  useEffect(() => {
    if (!canSwipeMainPages) return undefined;

    let startX = 0;
    let startY = 0;
    let edgeSwipe = false;

    const onTouchStart = (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;

      startX = touch.clientX;
      startY = touch.clientY;
      edgeSwipe = startX <= 28;
    };

    const onTouchMove = (event) => {
      if (!edgeSwipe) return;

      const touch = event.touches?.[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (dx > 18 && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [canSwipeMainPages]);

  if (isLoadingAuth && !appUserSnapshot) {
    return (
      <div className="min-h-dvh bg-[#061126]" />
    );
  }

  if (!isAuthenticated || !appUserSnapshot) {
    return <AuthScreen />;
  }

  if (appUserSnapshot.needsOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <div className="yardline-app-shell flex flex-col min-h-dvh w-screen max-w-full overflow-x-hidden">
      <Header />

      <main
        className={`yardline-main-scroll relative z-10 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto pt-[calc(68px+env(safe-area-inset-top))] ${
          showBottomNav
            ? "pb-[calc(92px+env(safe-area-inset-bottom))]"
            : "pb-[env(safe-area-inset-bottom)]"
        }`}
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          overflowAnchor: "none",
          overscrollBehaviorX: isMainPage ? "contain" : "auto",
        }}
      >
        <motion.div
          key={location.pathname}
          initial={pageMotion.initial}
          animate={pageMotion.animate}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          drag={canSwipeMainPages ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.04}
          dragDirectionLock
          onDragEnd={handleDragEnd}
          className="min-h-[calc(100dvh-128px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] bg-transparent"
        >
          <Outlet />
        </motion.div>

        {showPageFooter && <Footer />}
      </main>

      {showBottomNav && <PushPermissionPrompt />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
