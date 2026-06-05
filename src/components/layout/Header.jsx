import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  FileText,
  Headphones,
  Menu,
  Send,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useHeaderConfig } from "@/lib/HeaderContext";
import { getImageUrl } from "@/lib/imageUtils";

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
      const all = await base44.entities.AppUpdate.list("-created_date");
      const item = all.find(entry => entry.version === APP_BRANDING_VERSION);

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
  if (pathname.startsWith("/game/")) return "/spiele";
  if (pathname.startsWith("/team/")) return "/";
  if (pathname.startsWith("/club/")) return "/";
  if (pathname.startsWith("/league/")) return "/";
  if (pathname.startsWith("/tabellen/")) return "/tabellen";
  if (pathname.startsWith("/wettbewerbe/")) return "/wettbewerbe";

  if (pathname.startsWith("/admin/")) return "/admin";
  if (pathname === "/admin") return "/";
  if (pathname === "/data-editor") return "/";

  if (pathname.startsWith("/legal/")) return "/legal";
  if (pathname === "/settings") return "/";
  if (pathname === "/support") return "/";
  if (pathname === "/legal") return "/";
  if (pathname === "/updates") return "/";
  if (pathname === "/clip-einsenden") return "/";

  return "/";
}

function shouldUseFallback(location) {
  const search = location.search || "";

  return (
    search.includes("login=") ||
    location.pathname === "/settings" ||
    location.pathname === "/support" ||
    location.pathname === "/legal" ||
    location.pathname === "/clip-einsenden"
  );
}

function BrandLogo({ centered = false }) {
  const branding = useAppBranding();
  const logoUrl = branding.header_icon_url;

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
          className="h-[52px] max-w-[76vw] w-auto object-contain"
          loading="eager"
        />
      ) : null}
    </Link>
  );
}

function DefaultContent() {
  return <BrandLogo centered />;
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
      className="flex-shrink-0 flex items-center justify-center rounded-xl transition-colors hover:bg-white/8 active:bg-white/14"
      style={{ width: 40, height: 40 }}
      aria-label="Zurueck"
    >
      <ArrowLeft className="w-5 h-5 text-white/80" />
    </button>
  );
}

function BackContent({ title, onBack, backTo }) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
      <BackButton onBack={onBack} backTo={backTo} />

      {title && (
        <span className="text-sm font-bold text-foreground truncate">
          {title}
        </span>
      )}
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
        <p className="text-sm font-bold truncate leading-tight">
          {league?.name || "..."}
        </p>

        {(league?.season || league?.country) && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
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
        <p className="text-sm font-bold truncate leading-tight">
          {club?.name || "..."}
        </p>

        {club?.city && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
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
      label: "Clip einsenden",
      icon: Send,
      route: "/clip-einsenden",
    },
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

  const internalItems = [
    {
      label: "Admin",
      icon: ShieldCheck,
      route: "/settings?login=admin",
    },
    {
      label: "Dateneditor",
      icon: Database,
      route: "/settings?login=data_editor",
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#050608] overflow-hidden">
      <div
  className="relative flex items-center h-[68px] px-2 sm:px-3 w-full border-b border-white/10"
  style={{
    paddingTop: "env(safe-area-inset-top)",
  }}
>
        <BrandLogo centered />

        <button
          type="button"
          onClick={onClose}
          className="ml-auto w-11 h-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Menue schliessen"
        >
          <X className="w-6 h-6 text-white/80" />
        </button>
      </div>

      <div className="px-4 pt-5 pb-8 overflow-y-auto max-h-[calc(100dvh-68px-env(safe-area-inset-top))]">
        <div className="rounded-2xl overflow-hidden bg-[#1f1e22] border border-white/8">
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
                className="w-full min-h-[58px] flex items-center gap-3 px-4 text-left border-b border-white/8 last:border-0 active:bg-white/8 transition-colors"
              >
                <Icon className="w-5 h-5 text-white/72 flex-shrink-0" />

                <span className="text-sm font-bold text-white flex-1">
                  {item.label}
                </span>

                <ChevronRight className="w-4 h-4 text-white/45 flex-shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-[#1f1e22] border border-white/8 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-white/8">
            {internalItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(item.route);
                  }}
                  className="h-20 flex flex-col items-center justify-center gap-2 active:bg-white/8 transition-colors"
                  aria-label={`${item.label} Login`}
                  title={`${item.label} Login`}
                >
                  <Icon className="w-6 h-6 text-primary" />

                  <span className="text-[10px] font-bold text-white/70">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
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
  const mode = location.pathname === "/" ? "default" : requestedMode;

  const hideMenuButton = [
    "/settings",
    "/support",
    "/legal",
    "/clip-einsenden",
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
          background: contextPrimary
            ? `linear-gradient(180deg, ${contextPrimary}22 0%, #000 100%)`
            : "linear-gradient(180deg, #030712 0%, #000 100%)",
          boxShadow: scrolled
            ? "0 4px 32px rgba(0,0,0,0.75), 0 1px 0 rgba(0,91,255,0.20)"
            : "0 1px 0 rgba(0,91,255,0.18)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="relative flex items-center h-[68px] px-2 sm:px-3 w-full">
          {mode === "default" ? (
            <>
              <DefaultContent />

              {!hideMenuButton && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(current => !current)}
                  className="ml-auto w-11 h-11 flex items-center justify-center rounded-lg active:bg-white/10 transition-colors"
                  aria-label="Menue"
                  aria-expanded={menuOpen}
                >
                  <Menu className="w-6 h-6 text-white" strokeWidth={2.2} />
                </button>
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
              ? `linear-gradient(to right, transparent, ${contextPrimary}70, transparent)`
              : "linear-gradient(to right, transparent, rgba(0,91,255,0.55), transparent)",
          }}
        />
      </header>

      {!hideMenuButton && (
        <HeaderMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      )}
    </>
  );
}