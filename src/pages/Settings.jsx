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
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

import useSetHeader from "@/hooks/useSetHeader";
import { useAuth } from "@/lib/AuthContext";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { useI18n } from "@/lib/i18n";
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSettingsState,
  isPushSupported,
  syncPushSubscriptionMetadata,
} from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getRoleSlug } from "@/lib/roleDefinitions";
import { APP_VERSION } from "@/lib/appVersion";
import { getImageUrl } from "@/lib/imageUtils";

function normalizeRole(value) {
  return getRoleSlug(value || "fan");
}

function getLoginTitle() {
  return "Interner Login";
}

function getTargetRouteForRole(roleSlug) {
  if (roleSlug === "admin") return "/admin";
  if (roleSlug === "gotw") return "/gotw";
  if (roleSlug === "photographer") return "/photographer";
  if (roleSlug === "podcast") return "/podcast";
  if (roleSlug === "news") return "/news-dashboard";

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
            Ein Login für Admin, GOTW, Fotografen und Podcast.
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
  const { appUserSnapshot, logout, updatePublicUser } = useAuth();

  const displayName =
    appUserSnapshot?.displayName ||
    appUserSnapshot?.username ||
    "Konto";

  const isInternalAccount = appUserSnapshot?.isInternalUser === true;
  const roleSlug = normalizeRole(appUserSnapshot?.roleSlug || appUserSnapshot?.role);
  const currentUsername = appUserSnapshot?.internalUsername || appUserSnapshot?.username || "";
  const storedPassword =
    appUserSnapshot?.internalPassword ||
    appUserSnapshot?.password ||
    appUserSnapshot?.loginPassword ||
    appUserSnapshot?.temporaryPassword ||
    "";

  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    displayName,
    username: currentUsername,
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  React.useEffect(() => {
    if (!editing) {
      setForm({
        displayName,
        username: currentUsername,
        currentPassword: "",
        newPassword: "",
        newPasswordConfirm: "",
      });
    }
  }, [currentUsername, displayName, editing]);

  const updateField = (field, value) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async event => {
    event.preventDefault();

    if (!appUserSnapshot?.id) {
      toast.error("Du bist nicht angemeldet.");
      return;
    }

    const cleanDisplayName = String(form.displayName || "").trim();
    const cleanUsername = normalizeUsername(form.username);
    const currentPassword = String(form.currentPassword || "").trim();
    const newPassword = String(form.newPassword || "").trim();
    const newPasswordConfirm = String(form.newPasswordConfirm || "").trim();

    if (!cleanDisplayName) {
      toast.error("Bitte gib einen Namen ein.");
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      toast.error("Der Benutzername braucht mindestens 3 Zeichen.");
      return;
    }

    if (newPassword || newPasswordConfirm) {
      if (isInternalAccount && storedPassword && String(storedPassword) !== currentPassword) {
        toast.error("Das aktuelle Passwort ist falsch.");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("Das neue Passwort braucht mindestens 6 Zeichen.");
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        toast.error("Die neuen Passwörter stimmen nicht überein.");
        return;
      }
    }

    setSaving(true);

    try {
      if (cleanUsername !== normalizeUsername(currentUsername)) {
        const [byUsername, byInternalUsername] = await Promise.all([
          base44.entities.AppUser.filter({ username: cleanUsername }),
          base44.entities.AppUser.filter({ internalUsername: cleanUsername }),
        ]);

        const usernameTaken = [...byUsername, ...byInternalUsername].some(
          user => user.id !== appUserSnapshot.id
        );

        if (usernameTaken) {
          throw new Error("Dieser Benutzername ist bereits vergeben.");
        }
      }

      const updates = {
        displayName: cleanDisplayName,
        username: cleanUsername,
      };

      if (isInternalAccount) {
        updates.internalUsername = cleanUsername;
        updates.isInternalUser = true;
        updates.roleSlug = roleSlug;
        updates.role = appUserSnapshot.role || getRoleSlug(roleSlug);
        updates.status = appUserSnapshot.status || "active";
      }

      if (newPassword) {
        if (isInternalAccount) {
          updates.internalPassword = newPassword;
        } else {
          updates.password = newPassword;
        }
      }

      await updatePublicUser(updates);

      toast.success("Login-Daten gespeichert");
      setEditing(false);
      setForm(current => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        newPasswordConfirm: "",
      }));
    } catch (error) {
      toast.error(error.message || "Login-Daten konnten nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UserCircle className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">
            {displayName}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {isInternalAccount
              ? `Interner Login · ${getRoleSlug(roleSlug).toUpperCase()}`
              : "Konto und Anmeldung"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(value => !value)}
          className="rounded-full px-3 text-xs font-black"
        >
          {editing ? "Schließen" : "Bearbeiten"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => logout(true)}
          className="rounded-full border border-white/10 bg-black/40 px-3 text-xs font-black text-white hover:bg-red-600 hover:text-white"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          Abmelden
        </Button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="space-y-3 border-t border-border/30 px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Name
              </p>
              <Input
                value={form.displayName}
                onChange={event => updateField("displayName", event.target.value)}
                placeholder="Anzeigename"
                disabled={saving}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Benutzername
              </p>
              <Input
                value={form.username}
                onChange={event => updateField("username", event.target.value)}
                placeholder="Benutzername"
                autoComplete="username"
                disabled={saving}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3">
            <p className="text-xs font-black">
              Passwort ändern
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Leer lassen, wenn das Passwort gleich bleiben soll.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3">
              {isInternalAccount && storedPassword && (
                <Input
                  type="password"
                  value={form.currentPassword}
                  onChange={event => updateField("currentPassword", event.target.value)}
                  placeholder="Aktuelles Passwort"
                  autoComplete="current-password"
                  disabled={saving}
                />
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="password"
                  value={form.newPassword}
                  onChange={event => updateField("newPassword", event.target.value)}
                  placeholder="Neues Passwort"
                  autoComplete="new-password"
                  disabled={saving}
                />

                <Input
                  type="password"
                  value={form.newPasswordConfirm}
                  onChange={event => updateField("newPasswordConfirm", event.target.value)}
                  placeholder="Neues Passwort wiederholen"
                  autoComplete="new-password"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full"
          >
            {saving ? "Speichert..." : "Login-Daten speichern"}
          </Button>
        </form>
      )}
    </div>
  );
}

function FavoriteTeamSettings() {
  const { appUserSnapshot, updatePublicUser } = useAuth();
  const { teams = [], leaguesById } = useGlobalData();
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const favoriteTeamId = appUserSnapshot?.favoriteTeamId || "";
  const favoriteTeam = teams.find(team => team.id === favoriteTeamId) || null;
  const query = search.trim().toLowerCase();

  const filteredTeams = React.useMemo(() => {
    return [...teams]
      .filter(team => {
        if (!query) return true;
        const league = leaguesById?.get?.(team.leagueId);
        return [team.name, team.shortName, team.city, league?.name, league?.shortName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"))
      .slice(0, 18);
  }, [leaguesById, query, teams]);

  const chooseTeam = async (teamId) => {
    setSaving(true);

    try {
      await updatePublicUser({ favoriteTeamId: teamId || "" });
      await syncPushSubscriptionMetadata({
        appUserId: appUserSnapshot?.id || "",
        favoriteTeamId: teamId || "",
      });
      toast.success(teamId ? "Favoritenteam gespeichert" : "Favoritenteam entfernt");
    } catch (error) {
      toast.error(error.message || "Favoritenteam konnte nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
          {favoriteTeam?.logo ? (
            <img src={getImageUrl(favoriteTeam.logo)} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Favoritenteam</h2>
          <p className="truncate text-xs text-muted-foreground">
            {favoriteTeam ? favoriteTeam.name : "Ein Team wählen und Team-Pushs vorbereiten"}
          </p>
        </div>
        {favoriteTeam && (
          <Button type="button" size="sm" variant="outline" onClick={() => chooseTeam("")} disabled={saving}>
            Entfernen
          </Button>
        )}
      </div>

      <div className="space-y-3 p-3">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Team oder Liga suchen"
        />

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredTeams.map(team => {
            const active = team.id === favoriteTeamId;
            const league = leaguesById?.get?.(team.leagueId);

            return (
              <button
                key={team.id}
                type="button"
                onClick={() => chooseTeam(team.id)}
                disabled={saving}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10"
                    : "border-border/40 bg-secondary/20 hover:bg-secondary/50"
                }`}
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black p-1.5">
                  {team.logo ? (
                    <img src={getImageUrl(team.logo)} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs font-black text-white">{(team.shortName || team.name || "T").slice(0, 2)}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{team.name || team.shortName}</span>
                  <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                    {league?.shortName || league?.name || "Ohne Liga"}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PushNotificationSettings() {
  const { appUserSnapshot } = useAuth();
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
        await enablePushNotifications({
          appUserId: appUserSnapshot?.id || "",
          favoriteTeamId: appUserSnapshot?.favoriteTeamId || "",
        });
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
        <FavoriteTeamSettings />
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
