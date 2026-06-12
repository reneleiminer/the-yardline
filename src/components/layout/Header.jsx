import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Headphones,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useHeaderConfig } from "@/lib/HeaderContext";
import { getImageUrl } from "@/lib/imageUtils";
import { useAuth } from "@/lib/AuthContext";

const APP_BRANDING_VERSION = "app_branding";

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeBranding(item) {
  const meta = parseMessage(item?.message);

  return {
    header_icon_url: meta.header_icon_url || item?.imageUrl || "",
    app_name_top: meta.app_name_top || "THE",
    app_name_bottom: meta.app_name_bottom || "YARDLINE",
  };
}

function useAppBranding() {
  const { data: branding = null } = useQuery({
    queryKey: ["app-branding"],
    queryFn: async () => {
      const items = await base44.entities.AppUpdate.filter({
        version: APP_BRANDING_VERSION,
      });

      const item = items[0];

      return item ? normalizeBranding(item) : null;
    },
    staleTime: 1000 * 60 * 10,
  });

  return branding || {
    header_icon_url: "",
    app_name_top: "THE",
    app_name_bottom: "YARDLINE",
  };
}

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector("main");
    if (!el) return undefined;

    const onScroll = () => setScrolled(el.scrollTop > threshold);
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => el.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

function getBackFallback(pathname) {
  if (pathname.startsWith("/game/")) return "/match-center";
  if (pathname.startsWith("/team/")) return "/";
  if (pathname.startsWith("/club/")) return "/";
  if (pathname.startsWith("/league/")) return "/";
  if (pathname.startsWith("/tabellen/")) return "/match-center";
  if (pathname.startsWith("/wettbewerbe/")) return "/match-center";

  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname === "/admin") return "/";
  if (pathname === "/data-editor") return "/";
  if (pathname === "/podcast") return "/";

  if (pathname.startsWith("/legal/")) return "/legal";
  if (pathname === "/settings") return "/";
  if (pathname === "/support") return "/";
  if (pathname === "/legal") return "/";
  if (pathname === "/updates") return "/";

  return "/";
}

function shouldUseFallback(location) {
  const search = location.search || "";

  return (
    search.includes("login=") ||
    location.pathname === "/settings" ||
    location.pathname === "/support" ||
    location.pathname === "/legal" 
  );
}

function BrandLogo({ centered = false }) {
  const branding = useAppBranding();
  const logoUrl = branding.header_icon_url || "/yardline-logo.png";

  return (
    <Link
      to="/"
      className={
        centered
          ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
          : "flex items-center justify-center"
      }
      aria-label="The Yardline Home"
    >
      {logoUrl ? (
        <img
          src={getImageUrl(logoUrl)}
          alt="The Yardline"
          className="h-[46px] max-w-[24vw] sm:max-w-[150px] w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.26)]"
          loading="eager"
        />
      ) : (
        <span className="text-xl font-black uppercase tracking-wide text-white">
          Yardline
        </span>
      )}
    </Link>
  );
}

function HeaderSlogan() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center px-2">
      <span
        className="whitespace-nowrap text-[15px] leading-none text-white min-[390px]:text-[17px] sm:text-[24px]"
        style={{
          fontFamily: "var(--font-script)",
        }}
      >
        Where Football Lives
      </span>
    </div>
  );
}

function DefaultContent() {
  return (
    <>
      <BrandLogo />
      <HeaderSlogan />
    </>
  );
}

function BackButton({ onBack, backTo }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (backTo) {
      navigate(backTo, { replace: true });
      return;
    }

    const fallback = getBackFallback(location.pathname);

    if (shouldUseFallback(location) || window.history.length <= 1) {
      navigate(fallback, { replace: true });
      return;
    }

    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex-shrink-0 flex items-center justify-center rounded-xl transition-colors hover:bg-black/5 active:bg-black/10"
      style={{ width: 40, height: 40 }}
      aria-label="Zurueck"
    >
      <ArrowLeft className="w-5 h-5 text-white" />
    </button>
  );
}

function BackContent({ title, onBack, backTo }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
      <BackButton onBack={onBack} backTo={backTo} />

      {title && (
        <span className="text-sm font-bold text-white truncate">
          {title}
        </span>
      )}
    </div>
  );
}

function DashboardContent({ title }) {
  const { logout } = useAuth();

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <span className="truncate text-sm font-black uppercase tracking-wide text-white">
        {title || "Dashboard"}
      </span>
      <button
        type="button"
        onClick={() => logout(true)}
        className="flex-shrink-0 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white/70 transition-colors hover:bg-white/14 hover:text-white"
      >
        Abmelden
      </button>
    </div>
  );
}

function LeagueContent({ league, onBack, backTo }) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
      <BackButton onBack={onBack} backTo={backTo} />

      {league?.logo ? (
        <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-white/10 flex items-center justify-center p-1">
          <img
            src={league.logo}
            alt={league.name || ""}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
          {league?.shortName?.[0] || league?.name?.[0] || "L"}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate leading-tight">
          {league?.name || "..."}
        </p>

        {(league?.season || league?.country) && (
          <p className="text-[10px] text-white/65 truncate leading-tight">
            {[league?.country, league?.season].filter(Boolean).join(" - ")}
          </p>
        )}
      </div>
    </div>
  );
}

function ClubContent({ club, onBack, backTo }) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
      <BackButton onBack={onBack} backTo={backTo} />

      {club?.logo ? (
        <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-white/10 flex items-center justify-center p-1">
          <img
            src={club.logo}
            alt={club.name || ""}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
          {club?.name?.[0] || "V"}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate leading-tight">
          {club?.name || "..."}
        </p>

        {club?.city && (
          <p className="text-[10px] text-white/65 truncate leading-tight">
            {club.city}
          </p>
        )}
      </div>
    </div>
  );
}

function HeaderMenu({ open, onClose }) {
  const navigate = useNavigate();

  const items = [
    {
      label: "Einstellungen",
      icon: Settings,
      route: "/settings",
    },
    {
      label: "Support",
      icon: Headphones,
      route: "/support",
    },
    {
      label: "Rechtliches",
      icon: FileText,
      route: "/legal",
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#030305] text-white">
      <div
        className="relative flex items-center h-[68px] px-2 sm:px-3 w-full border-b border-red-500/25 bg-black/50 backdrop-blur-xl"
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <BrandLogo />
        <HeaderSlogan />

        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-11 h-11 rounded-full border border-red-500/30 bg-black/55 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Menue schliessen"
        >
          <X className="w-6 h-6 text-red-500" />
        </button>
      </div>

      <div className="px-4 pt-5 pb-8 overflow-y-auto max-h-[calc(100dvh-68px-env(safe-area-inset-top))]">
        <div className="rounded-2xl overflow-hidden border border-red-500/25 bg-black/60 shadow-[0_0_34px_rgba(239,0,31,0.10)] backdrop-blur-xl">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  onClose();
                  navigate(item.route);
                }}
                className="w-full min-h-[58px] flex items-center gap-3 px-4 text-left border-b border-red-500/15 last:border-0 active:bg-red-500/10 transition-colors"
              >
                <Icon className="w-5 h-5 text-red-500 flex-shrink-0" />

                <span className="text-sm font-bold text-white flex-1">
                  {item.label}
                </span>

                <ChevronRight className="w-4 h-4 text-white/35 flex-shrink-0" />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function Header() {
  const { config } = useHeaderConfig();
  const location = useLocation();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      setMenuOpen(false);
    }
  }, [location.pathname]);

  const requestedMode = config?.mode || "default";
  const defaultHeaderRoutes = ["/", "/feed", "/match-center", "/highlights", "/settings"];
  const mode = defaultHeaderRoutes.includes(location.pathname) ? "default" : requestedMode;

  const hideMenuButton = [
    "/support",
    "/legal",
  ].includes(location.pathname);

  const contextPrimary =
    mode === "league"
      ? config?.league?.primaryColor
      : mode === "club"
      ? config?.club?.primaryColor
      : null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300"
        style={{
          height: "calc(68px + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
          background: "#000000",
          boxShadow: scrolled
            ? "0 1px 0 rgba(255,255,255,0.12), 0 18px 55px rgba(0,0,0,0.38)"
            : "0 1px 0 rgba(255,255,255,0.18)",
        }}
      >
        <div className="relative flex items-center h-[68px] px-2 sm:px-3 w-full">
          {mode === "default" ? (
            <>
              <DefaultContent />

              {!hideMenuButton && (
                <Link
                  to="/settings"
                  className="ml-auto flex h-11 w-11 items-center justify-center rounded-full active:bg-black/5 transition-colors"
                  aria-label="Konto und Einstellungen"
                  title="Konto und Einstellungen"
                >
                  <UserCircle className="h-8 w-8 text-white" strokeWidth={2.1} />
                </Link>
              )}
            </>
          ) : (
            <div className="flex-1 min-w-0 flex items-center">
              {mode === "back" && (
                <BackContent
                  title={config?.title}
                  onBack={config?.onBack}
                  backTo={config?.backTo}
                />
              )}

              {mode === "dashboard" && (
                <DashboardContent title={config?.title} />
              )}

              {mode === "league" && (
                <LeagueContent
                  league={config?.league}
                  onBack={config?.onBack}
                  backTo={config?.backTo}
                />
              )}

              {mode === "club" && (
                <ClubContent
                  club={config?.club}
                  onBack={config?.onBack}
                  backTo={config?.backTo}
                />
              )}

              {mode === "game" && (
                <BackContent
                  title="Spiel"
                  onBack={config?.onBack}
                  backTo={config?.backTo}
                />
              )}
            </div>
          )}
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: contextPrimary
              ? contextPrimary
              : "rgba(255,255,255,0.18)",
          }}
        />
      </header>

      {false && !hideMenuButton && (
        <HeaderMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      )}
    </>
  );
}
