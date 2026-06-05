import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Database,
  Globe2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import useSetHeader from "@/hooks/useSetHeader";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  import.meta.env.VITE_VERSION ||
  "0.0.0";

const LANGUAGE_OPTIONS = [
  { key: "de", label: "Deutsch" },
  { key: "en", label: "English" },
];

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function getLoginTitle(loginTarget) {
  if (loginTarget === "admin") return "Admin Login";
  if (loginTarget === "data_editor") return "Dateneditor Login";
  return "Interner Login";
}

function getTargetRoute(loginTarget) {
  if (loginTarget === "admin") return "/admin";
  if (loginTarget === "data_editor") return "/data-editor";
  return "/";
}

function InternalLoginBox({ loginTarget = "" }) {
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

    if (loginTarget === "admin" && roleSlug !== "admin") {
      setLocalError("Dieses Konto hat keinen Admin-Zugang.");
      return;
    }

    if (loginTarget === "data_editor" && roleSlug !== "data_editor") {
      setLocalError("Dieses Konto hat keinen Dateneditor-Zugang.");
      return;
    }

    navigate(getTargetRoute(loginTarget), { replace: true });
  };

  const Icon = loginTarget === "admin" ? ShieldCheck : Database;

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div>
          <h2 className="text-sm font-bold">
            {getLoginTitle(loginTarget)}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bitte immer neu einloggen.
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
  const language = localStorage.getItem("yardline-language") || "de";

  return (
    <div className="bg-card/60 border border-border/50 rounded-2xl overflow-hidden opacity-60">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <Globe2 className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold">
            Sprache
          </h2>
          <p className="text-xs text-muted-foreground">
            Sprachwechsel ist noch in Arbeit
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-secondary/70 border border-border/50 px-2.5 py-1">
          <Lock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground">
            Bald
          </span>
        </div>
      </div>

      <div className="p-2 pointer-events-none select-none">
        {LANGUAGE_OPTIONS.map(option => {
          const active = language === option.key;

          return (
            <button
              key={option.key}
              type="button"
              disabled
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left cursor-not-allowed ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-sm font-semibold">
                {option.label}
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

export default function Settings() {
  const [searchParams] = useSearchParams();

  const loginTarget = useMemo(() => {
    const value = searchParams.get("login");

    if (value === "admin") return "admin";
    if (value === "data_editor") return "data_editor";

    return "";
  }, [searchParams]);

  useSetHeader({
    mode: "back",
    title: loginTarget ? getLoginTitle(loginTarget) : "Einstellungen",
  });

  if (loginTarget) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-4 pt-4 pb-24">
        <InternalLoginBox loginTarget={loginTarget} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-68px)] w-full max-w-full overflow-x-hidden px-4 pt-4 pb-24 flex flex-col">
      <div className="space-y-3">
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