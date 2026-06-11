import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Database,
  Globe2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import useSetHeader from "@/hooks/useSetHeader";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSettingsState,
  isPushSupported,
} from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  import.meta.env.VITE_VERSION ||
  "0.0.0";

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function getLoginTitle() {
  return "Interner Login";
}

function getTargetRouteForRole(roleSlug) {
  if (roleSlug === "admin") return "/admin";
  if (roleSlug === "data_editor") return "/data-editor";
  if (roleSlug === "media_partner") return "/data-editor";
  if (roleSlug === "podcast_partner") return "/podcast";
  if (roleSlug === "club") return "/";

  return "/";
}

function InternalLoginBox() {
  const navigate = useNavigate();

  const {
    internalLogin,
    isLoadingAuth,
    authError,
  } = useAuth();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [localError, setLocalError] = React.useState("");

  const handleSubmit = async event => {
    event.preventDefault();
    setLocalError("");

    const result = await internalLogin({
      username,
      password,
    });

    if (!result.ok) {
      setLocalError(result.error?.message || "Login fehlgeschlagen.");
      return;
    }

    const roleSlug = normalizeRole(result.appUser?.roleSlug || result.appUser?.role);
    navigate(getTargetRouteForRole(roleSlug), { replace: true });
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database className="w-5 h-5 text-primary" />
        </div>

        <div>
          <h2 className="text-sm font-bold">
            Interner Login
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ein Login für Admin, Dateneditor, Media, Podcast und Vereine.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="Benutzername"
          autoComplete="username"
        />

        <Input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="Passwort"
          autoComplete="current-password"
        />

        {(localError || authError?.type === "login_failed") && (
          <p className="text-xs text-red-400">
            {localError || authError?.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoadingAuth || !username.trim() || !password}
          className="w-full"
        >
          {isLoadingAuth ? "Wird geprüft..." : "Einloggen"}
        </Button>
      </form>
    </div>
  );
}

function LanguageSettings() {
  const {
    language,
    languages,
    mode,
    setLanguage,
    t,
  } = useI18n();

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <Globe2 className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">
            {t("Sprache")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === "auto" ? t("Handy-Sprache übernehmen") : languages.find(item => item.code === language)?.nativeLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(language, mode === "auto" ? "manual" : "auto")}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
            mode === "auto"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/50 bg-secondary/70 text-muted-foreground"
          }`}
        >
          <Check className="w-3 h-3" />
          <span className="text-[10px] font-bold text-muted-foreground">
            {t("Automatisch")}
          </span>
        </button>
      </div>

      <div className="p-2">
        {languages.map(option => {
          const active = language === option.code && mode !== "auto";

          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code, "manual")}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-sm font-semibold">
                {option.nativeLabel}
              </span>

              {active && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppInfoSettings() {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => navigate("/updates")}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/60 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">
            App Updates
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            Neue Funktionen und Änderungen ansehen
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
    </div>
  );
}

function AccountSettings() {
  const { appUserSnapshot, logout } = useAuth();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <span className="text-sm font-black uppercase">
            {(appUserSnapshot?.displayName || appUserSnapshot?.username || "Y").slice(0, 1)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-black">
            {appUserSnapshot?.displayName || appUserSnapshot?.username || "Dein Konto"}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {appUserSnapshot?.email || "Angemeldet"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => logout(true)}
          className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}

function PushNotificationSettings() {
  const [state, setState] = React.useState({
    supported: false,
    enabled: false,
    permission: "default",
    disabledByUser: false,
  });
  const [saving, setSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!isPushSupported()) {
      setState({
        supported: false,
        enabled: false,
        permission: "unsupported",
        disabledByUser: true,
      });
      return;
    }

    setState(await getPushSettingsState());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async (checked) => {
    setSaving(true);

    try {
      if (checked) {
        await enablePushNotifications();
        toast.success("Benachrichtigungen aktiviert");
      } else {
        await disablePushNotifications();
        toast.success("Benachrichtigungen ausgeschaltet");
      }

      await refresh();
    } catch (error) {
      toast.error(error.message || "Benachrichtigungen konnten nicht geändert werden");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const blocked = state.permission === "denied";
  const disabled = saving || !state.supported || blocked;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          {state.enabled ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">
            Benachrichtigungen
          </h2>
          <p className="text-xs text-muted-foreground">
            {blocked
              ? "Im Browser blockiert"
              : state.supported
                ? "Live-Spiele, Game of the Week, Podcast und Highlights"
                : "Auf diesem Gerät nicht verfügbar"}
          </p>
        </div>

        <Switch
          checked={state.enabled}
          disabled={disabled}
          onCheckedChange={handleToggle}
          aria-label="Benachrichtigungen umschalten"
        />
      </div>

      {blocked && (
        <div className="border-t border-border/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Du hast Benachrichtigungen im Browser blockiert. Das kannst du nur in den Website-Einstellungen deines Browsers wieder erlauben.
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const showInternalLogin = false;

  useSetHeader({
    mode: "back",
    title: "Einstellungen",
  });

  if (showInternalLogin) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-4 pt-4 pb-24">
        <InternalLoginBox />
      </div>
    );
  }
  return (
    <div className="min-h-[calc(100dvh-68px)] w-full max-w-full overflow-x-hidden px-4 pt-4 pb-24 flex flex-col">
      <div className="space-y-3">
        <AccountSettings />
        <PushNotificationSettings />
        <LanguageSettings />
        <AppInfoSettings />
      </div>

      <div className="mt-auto pt-10 text-center">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          The Yardline
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Version {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
