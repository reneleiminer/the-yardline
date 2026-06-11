import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, KeyRound, LogIn, Mail, ShieldCheck, UserPlus } from "lucide-react";
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

function isInternalRoleSlug(roleSlug) {
  return ["admin", "data_editor", "media_partner", "podcast_partner", "club"].includes(roleSlug);
}

function isInternalDashboardPath(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/data-editor") ||
    pathname.startsWith("/podcast")
  );
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
  const [birthDateFocused, setBirthDateFocused] = useState(false);
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
                  <Input
                    type={birthDateFocused || form.birthDate ? "date" : "text"}
                    value={form.birthDate}
                    onFocus={() => setBirthDateFocused(true)}
                    onBlur={() => {
                      if (!form.birthDate) setBirthDateFocused(false);
                    }}
                    onChange={event => updateForm("birthDate", event.target.value)}
                    placeholder="Geburtsdatum"
                    aria-label="Geburtsdatum"
                    className="h-12 min-w-0 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                  />
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
          </div>
        </div>
      </div>
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    eyebrow: "The Yardline",
    title: "American Football",
    text: "Die Zentrale fuer American Football in Europa. Alle Ligen, Teams und Stories in einer App.",
  },
  {
    eyebrow: "Match Center",
    title: "All leagues in one app",
    text: "Scores, Termine, Tabellen, Wettbewerbe und Game Details sauber an einem Ort.",
  },
  {
    eyebrow: "Highlights",
    title: "Watch. Read. Follow.",
    text: "News, Game Highlights, Podcast und Gameday Shots halten dich nah am Football.",
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
    <div className="min-h-dvh bg-[#061126] text-white">
      <div className="relative min-h-dvh overflow-hidden">
        <img
          src="/yardline-launch.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#061126]/20 to-[#061126]" />
        <div className="absolute inset-x-0 bottom-0 h-[48dvh] bg-gradient-to-t from-[#061126] via-[#061126]/96 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <img
              src="/yardline-logo.png"
              alt="The Yardline"
              className="h-12 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
            />
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
              {index + 1}/{ONBOARDING_SLIDES.length}
            </span>
          </div>

          <div className="mt-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.title}
                initial={{ opacity: 0, x: 44 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -44 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
                  {slide.eyebrow}
                </p>
                <h1 className="mt-2 text-[46px] font-black uppercase italic leading-[0.86] tracking-tight">
                  {slide.title.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-[#c20f1a]">
                    {slide.title.split(" ").slice(-1)}
                  </span>
                </h1>
                <p className="mt-4 max-w-[330px] text-sm font-semibold leading-relaxed text-white/78">
                  {slide.text}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-7 flex items-center justify-between">
          <div className="flex gap-2">
            {ONBOARDING_SLIDES.map((item, dotIndex) => (
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

  const roleSlug = String(appUserSnapshot.roleSlug || appUserSnapshot.role || "").toLowerCase();
  if (isInternalRoleSlug(roleSlug) && !isInternalDashboardPath(location.pathname)) {
    return <Navigate to={getTargetRouteForInternalRole(roleSlug)} replace />;
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
      </main>

      {showPageFooter && <Footer />}
      {showBottomNav && <PushPermissionPrompt />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
