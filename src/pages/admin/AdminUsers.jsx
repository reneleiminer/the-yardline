import React, { useMemo, useState } from "react";
import useSetHeader from "@/hooks/useSetHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Newspaper,
  Pencil,
  Plus,
  Camera,
  Radio,
  RotateCcw,
  Search,
  Star,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const EMPTY_USER = {
  username: "",
  displayName: "",
  roleSlug: "gotw",
  connectedTeamId: "",
  internalPassword: "",
  status: "active",
};

const ROLE_LABELS = {
  fan: "Fan",
  admin: "Admin",
  gotw: "GOTW",
  photographer: "Fotograf",
  podcast: "Podcast",
  news: "News",
};

const ROLE_DISPLAY_LABELS = {
  fan: "Nutzer",
  admin: "Admin",
  gotw: "GOTW",
  photographer: "Fotograf",
  podcast: "Podcast",
  news: "News",
};

const INTERNAL_ROLE_OPTIONS = [
  { value: "fan", label: "Nutzer" },
  { value: "admin", label: "Admin" },
  { value: "gotw", label: "GOTW" },
  { value: "photographer", label: "Fotograf" },
  { value: "podcast", label: "Podcast" },
  { value: "news", label: "News" },
];

const STATUS_LABELS = {
  active: "Aktiv",
  inactive: "Inaktiv",
  blocked: "Gesperrt",
};

const FEATURE_OPTIONS = [
  {
    key: "gotw",
    label: "GOTW",
    description: "Game of the Week setzen",
  },
  {
    key: "gameday_shots",
    label: "GameDay Shots",
    description: "Fotografen-Bilder verwalten",
  },
  {
    key: "podcast",
    label: "Podcast",
    description: "Podcast-Karte bearbeiten",
  },
  {
    key: "news",
    label: "News",
    description: "News und Transfers erstellen",
  },
  {
    key: "live_results",
    label: "Live-Ergebnisse",
    description: "Scores live/final eintragen",
  },
];

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const legacyMap = {
    fan: "fan",
    nutzer: "fan",
    admin: "admin",
    gotw: "gotw",
    media: "gotw",
    media_partner: "gotw",
    game_of_the_week: "gotw",
    photographer: "photographer",
    fotograf: "photographer",
    podcast: "podcast",
    podcast_partner: "podcast",
    news: "news",
    newsroom: "news",
    redaktion: "news",
    journalist: "news",
    data_editor: "fan",
    club: "fan",
    verein: "fan",
    league: "fan",
    journalist: "fan",
    creator: "fan",
    moderator: "fan",
    official_media: "fan",
  };

  return legacyMap[normalized] || normalized;
}

function getInternalEmail(username, roleSlug = "gotw") {
  const cleanUsername = normalizeUsername(username).replace(/[^a-z0-9._-]/g, "-");

  const prefixByRole = {
    admin: "admin",
    gotw: "gotw",
    photographer: "fotograf",
    podcast: "podcast",
    news: "news",
  };

  const prefix = prefixByRole[roleSlug] || "internal";

  return `${cleanUsername || prefix}@the-yardline.internal`;
}

function getInternalPassword(user) {
  return (
    user?.internalPassword ||
    user?.password ||
    user?.loginPassword ||
    user?.temporaryPassword ||
    ""
  );
}

function getRoleSlug(user) {
  return normalizeRole(user?.roleSlug || user?.role || "fan") || "fan";
}

function parseFeatureAccess(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
  }
  return [];
}

function getBaseFeaturesForRole(roleSlug) {
  if (roleSlug === "admin") return FEATURE_OPTIONS.map(option => option.key);
  if (roleSlug === "gotw") return ["gotw"];
  if (roleSlug === "photographer") return ["gameday_shots"];
  if (roleSlug === "podcast") return ["podcast"];
  if (roleSlug === "news") return ["news"];
  return [];
}

function getUserFeatures(user) {
  return Array.from(new Set([
    ...getBaseFeaturesForRole(getRoleSlug(user)),
    ...parseFeatureAccess(user?.featureAccess || user?.permissions || user?.extraAccess),
  ]));
}

function isInternalLogin(user) {
  const roleSlug = getRoleSlug(user);
  const hasInternalFeature = parseFeatureAccess(user?.featureAccess || user?.permissions || user?.extraAccess).length > 0;

  return (
    hasInternalFeature ||
    roleSlug === "admin" ||
    roleSlug === "gotw" ||
    roleSlug === "photographer" ||
    roleSlug === "podcast" ||
    roleSlug === "news"
  );
}

function isAdmin(user) {
  return getRoleSlug(user) === "admin";
}

function isGotw(user) {
  return getRoleSlug(user) === "gotw";
}

function isPhotographer(user) {
  return getRoleSlug(user) === "photographer";
}

function isPodcast(user) {
  return getRoleSlug(user) === "podcast";
}

function isNews(user) {
  return getRoleSlug(user) === "news";
}

function isInactive(user) {
  return user?.status === "inactive" || user?.status === "blocked";
}

function isProtectedAccount(user) {
  if (!user) return true;

  return user.isOwner || isAdmin(user);
}

function canManageTarget(user) {
  return !!user && !isProtectedAccount(user);
}

function RoleBadge({ user }) {
  const roleSlug = getRoleSlug(user);
  const admin = roleSlug === "admin";
  const gotw = roleSlug === "gotw";
  const photographer = roleSlug === "photographer";
  const podcast = roleSlug === "podcast";
  const news = roleSlug === "news";

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        admin
          ? "bg-blue-500/15 text-blue-400"
          : gotw
          ? "bg-pink-500/15 text-pink-400"
          : photographer
          ? "bg-emerald-500/15 text-emerald-400"
          : podcast
          ? "bg-violet-500/15 text-violet-300"
          : news
          ? "bg-red-500/15 text-red-300"
          : "bg-primary/15 text-primary"
      }`}
    >
      {ROLE_DISPLAY_LABELS[roleSlug] || "Nutzer"}
    </span>
  );
}

function StatusBadge({ user }) {
  const inactive = isInactive(user);

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        inactive
          ? "bg-yellow-500/15 text-yellow-400"
          : "bg-green-500/15 text-green-400"
      }`}
    >
      {STATUS_LABELS[user.status] || "Aktiv"}
    </span>
  );
}

function UserForm({ title, initial, onSave, onCancel, isSaving, submitLabel }) {
  const isExistingProtected = initial?.id && isProtectedAccount(initial);

  const [form, setForm] = useState({
    ...EMPTY_USER,
    ...initial,
    username: initial?.username || initial?.internalUsername || "",
    roleSlug: getRoleSlug(initial || EMPTY_USER),
    connectedTeamId: initial?.connectedTeamId || "",
    featureAccess: parseFeatureAccess(initial?.featureAccess || initial?.permissions || initial?.extraAccess),
    internalPassword: "",
  });

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (isExistingProtected) {
      toast.error("Admin- und Owner-Accounts sind geschützt.");
      return;
    }

    const username = normalizeUsername(form.username);
    const roleSlug = normalizeRole(form.roleSlug || "gotw");

    if (!["fan", "admin", "gotw", "photographer", "podcast", "news"].includes(roleSlug)) {
      toast.error("Bitte eine gültige Account-Art auswählen.");
      return;
    }

    if (!username) {
      toast.error("Bitte Benutzername eingeben");
      return;
    }

    if (!form.displayName.trim()) {
      toast.error("Bitte Anzeigenamen eingeben");
      return;
    }

    const featureAccess = Array.from(new Set(form.featureAccess || []));
    const isInternalAccount = roleSlug !== "fan" || featureAccess.length > 0;

    if (!initial?.id && isInternalAccount && !form.internalPassword.trim()) {
      toast.error("Bitte Passwort vergeben");
      return;
    }

    onSave({
      ...form,
      username,
      internalUsername: username,
      displayName: form.displayName.trim(),
      roleSlug,
      role: ROLE_LABELS[roleSlug],
      featureAccess,
      connectedTeamId: "",
      connectedClubId: "",
      linkedClubId: "",
      status: form.status || "active",
      internalPassword: isInternalAccount ? form.internalPassword.trim() : "",
    });
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">
            {title}
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Login für Admin, GOTW, Fotografen, Podcast oder normale Nutzer
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isExistingProtected && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
          <p className="text-xs font-bold text-yellow-400">
            Geschützter Account
          </p>

          <p className="text-[11px] text-muted-foreground mt-0.5">
            Admin- und Owner-Accounts können hier nicht bearbeitet, gesperrt oder gelöscht werden.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={form.username}
          onChange={event => set("username", event.target.value)}
          placeholder="Benutzername"
          autoComplete="off"
          disabled={isExistingProtected}
        />

        <Input
          value={form.displayName}
          onChange={event => set("displayName", event.target.value)}
          placeholder="Anzeigename"
          autoComplete="off"
          disabled={isExistingProtected}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={form.roleSlug}
          onChange={event => {
            const nextRole = event.target.value;

            setForm(current => ({
              ...current,
              roleSlug: nextRole,
              connectedTeamId: "",
            }));
          }}
          disabled={isExistingProtected}
          className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground disabled:opacity-60"
        >
          {INTERNAL_ROLE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={form.status}
          onChange={event => set("status", event.target.value)}
          disabled={isExistingProtected}
          className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground disabled:opacity-60"
        >
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
          <option value="blocked">Gesperrt</option>
        </select>
      </div>

      {form.roleSlug === "photographer" && (
        <p className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
          Fotografen werden nicht mehr fest mit einem Verein verbunden. Die Zuordnung passiert pro GameDay Shot beim Hochladen.
        </p>
      )}

      <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3">
        <div className="mb-2">
          <p className="text-xs font-bold">
            Zusatzfunktionen
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Die Rolle hat ihre Basisfunktion automatisch. Alles hier ist extra freigeschaltet.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURE_OPTIONS.map(option => {
            const roleFeatures = getBaseFeaturesForRole(form.roleSlug);
            const includedByRole = roleFeatures.includes(option.key);
            const checked = includedByRole || (form.featureAccess || []).includes(option.key);

            return (
              <label
                key={option.key}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  checked
                    ? "border-primary/45 bg-primary/10"
                    : "border-border/50 bg-background/40"
                } ${isExistingProtected ? "opacity-60" : "cursor-pointer"}`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isExistingProtected || includedByRole}
                    onChange={event => {
                      const nextChecked = event.target.checked;
                      setForm(current => {
                        const currentAccess = new Set(current.featureAccess || []);
                        if (nextChecked) currentAccess.add(option.key);
                        else currentAccess.delete(option.key);
                        return {
                          ...current,
                          featureAccess: Array.from(currentAccess),
                        };
                      });
                    }}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">
                      {option.label}
                      {includedByRole && (
                        <span className="ml-1 text-[10px] text-primary">Rolle</span>
                      )}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <Input
        type="password"
        value={form.internalPassword}
        onChange={event => set("internalPassword", event.target.value)}
        placeholder={initial?.id ? "Neues Passwort optional" : "Passwort"}
        autoComplete="new-password"
        disabled={isExistingProtected}
      />

      {initial?.id && (
        <p className="text-[11px] text-muted-foreground">
          Passwort leer lassen, wenn es nicht geändert werden soll.
        </p>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={isSaving || isExistingProtected}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <CheckCircle2 className="w-4 h-4 mr-2" />
        )}
        {submitLabel}
      </Button>
    </div>
  );
}

export default function AdminUsers() {
  useSetHeader({
    mode: "back",
    title: "Nutzer & Logins",
  });

  const queryClient = useQueryClient();
  const { appUserSnapshot } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => base44.entities.AppUser.list("-created_date"),
  });

  const internalUsers = useMemo(() => {
    return users.filter(isInternalLogin);
  }, [users]);

  const publicUsers = useMemo(() => {
    return users.filter(user => !isInternalLogin(user));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter(user => {
      const matchesRole =
        selectedRole === "all" ||
        (selectedRole === "fan" && !isInternalLogin(user)) ||
        getRoleSlug(user) === selectedRole;

      if (!matchesRole) return false;
      if (!query) return true;

      return (
        user.username?.toLowerCase().includes(query) ||
        user.internalUsername?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm, selectedRole]);

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const createMutation = useMutation({
    mutationFn: async data => {
      const existingByUsername = await base44.entities.AppUser.filter({
        username: data.username,
      });

      if (existingByUsername.length > 0) {
        throw new Error("Dieser Benutzername ist bereits vergeben.");
      }

      return base44.entities.AppUser.create({
        username: data.username,
        internalUsername: data.internalUsername,
        email: getInternalEmail(data.username, data.roleSlug),
        displayName: data.displayName,
        roleSlug: data.roleSlug,
        role: ROLE_LABELS[data.roleSlug] || "Fan",
        featureAccess: data.featureAccess || [],
        connectedTeamId: "",
        connectedClubId: "",
        linkedClubId: "",
        status: data.status || "active",
        internalPassword: data.internalPassword,
        verified: true,
        isInternalUser: data.roleSlug !== "fan" || (data.featureAccess || []).length > 0,
        isOwner: false,
        needsOnboarding: false,
        createdByAdminId: appUserSnapshot?.id || "",
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: (_, data) => {
      invalidateUsers();
      setShowCreate(false);
      toast.success(`${ROLE_DISPLAY_LABELS[data.roleSlug] || "Interner"}-Login erstellt`);
    },
    onError: error => {
      toast.error(error.message || "Login konnte nicht erstellt werden");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ user, data }) => {
      if (isProtectedAccount(user)) {
        throw new Error("Admin- und Owner-Accounts können nicht bearbeitet werden.");
      }

      const payload = {
        username: data.username,
        internalUsername: data.internalUsername,
        email: user.email || getInternalEmail(data.username, data.roleSlug),
        displayName: data.displayName,
        roleSlug: data.roleSlug,
        role: ROLE_LABELS[data.roleSlug] || "Fan",
        featureAccess: data.featureAccess || [],
        connectedTeamId: "",
        connectedClubId: "",
        linkedClubId: "",
        status: data.status || "active",
        isInternalUser: data.roleSlug !== "fan" || (data.featureAccess || []).length > 0,
        needsOnboarding: false,
        updatedAtUtc: new Date().toISOString(),
      };

      if (data.internalPassword) {
        payload.internalPassword = data.internalPassword;
      }

      return base44.entities.AppUser.update(user.id, payload);
    },
    onSuccess: (_, variables) => {
      invalidateUsers();
      setEditingUser(null);
      toast.success(`${ROLE_DISPLAY_LABELS[variables.data.roleSlug] || "Interner"}-Login aktualisiert`);
    },
    onError: error => {
      toast.error(error.message || "Login konnte nicht aktualisiert werden");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ user, status }) => {
      if (isProtectedAccount(user)) {
        throw new Error("Admin- und Owner-Accounts können nicht deaktiviert oder gesperrt werden.");
      }

      return base44.entities.AppUser.update(user.id, {
        status,
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateUsers();
      toast.success("Status aktualisiert");
    },
    onError: error => {
      toast.error(error.message || "Status konnte nicht aktualisiert werden");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ user, password }) => {
      if (isProtectedAccount(user)) {
        throw new Error("Passwort von Admin- oder Owner-Accounts kann hier nicht geändert werden.");
      }

      if (!password.trim()) {
        throw new Error("Bitte neues Passwort eingeben.");
      }

      return base44.entities.AppUser.update(user.id, {
        internalPassword: password.trim(),
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateUsers();
      toast.success("Passwort aktualisiert");
    },
    onError: error => {
      toast.error(error.message || "Passwort konnte nicht aktualisiert werden");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async user => {
      if (isProtectedAccount(user)) {
        throw new Error("Admin- und Owner-Accounts können nicht gelöscht werden.");
      }

      const now = new Date().toISOString();
      const cleanUsername = normalizeUsername(user.username || user.internalUsername || "");
      const relatedPosts = [];

      try {
        if (user.id) {
          relatedPosts.push(...await base44.entities.Post.filter({ authorId: user.id }));
        }

        if (cleanUsername) {
          const byUsername = await base44.entities.Post.filter({ authorUsername: cleanUsername });
          relatedPosts.push(...byUsername);
        }
      } catch (error) {
        console.warn("DELETE USER RELATED POSTS LOOKUP ERROR:", error);
      }

      const uniquePosts = Array.from(
        new Map(relatedPosts.filter(Boolean).map(post => [post.id, post])).values()
      );

      await Promise.allSettled(
        uniquePosts.map(post =>
          base44.entities.Post.update(post.id, {
            isDeleted: true,
            isHidden: true,
            updatedAtUtc: now,
          })
        )
      );

      return base44.entities.AppUser.delete(user.id);
    },
    onSuccess: () => {
      invalidateUsers();
      queryClient.invalidateQueries({ queryKey: ["home-overview-news"] });
      queryClient.invalidateQueries({ queryKey: ["news-page-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setDeleteTarget(null);
      toast.success("Login gelöscht und zugehörige Beiträge ausgeblendet");
    },
    onError: error => {
      toast.error(error.message || "Login konnte nicht gelöscht werden");
    },
  });

  const handlePasswordReset = user => {
    if (isProtectedAccount(user)) {
      toast.error("Passwort von Admin- oder Owner-Accounts kann hier nicht geändert werden.");
      return;
    }

    const password = window.prompt(`Neues Passwort für ${user.username || user.displayName}:`);

    if (password == null) return;

    resetPasswordMutation.mutate({
      user,
      password,
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-xs text-muted-foreground">
            Interne Logins werden geladen...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-24">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Kontenverwaltung
          </p>

          <h1 className="text-xl font-black mt-1">
            Nutzer & Logins
          </h1>

          <p className="text-xs text-muted-foreground mt-1">
            Hier verwaltest du Admin-, GOTW-, Fotografen-, Podcast-, News- und Nutzerkonten. Admin-Accounts sind geschuetzt.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setShowCreate(true);
            setEditingUser(null);
          }}
          className="gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Neu
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 mb-5">
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <UserCog className="w-4 h-4 text-white mb-2" />
          <div className="text-xl font-black">
            {publicUsers.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Nutzer</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-blue-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isAdmin).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Admin</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Star className="w-4 h-4 text-pink-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isGotw).length}
          </div>
          <div className="text-[10px] text-muted-foreground">GOTW</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Camera className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isPhotographer).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Fotografen</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Radio className="w-4 h-4 text-violet-300 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isPodcast).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Podcast</div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Newspaper className="w-4 h-4 text-red-300 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isNews).length}
          </div>
          <div className="text-[10px] text-muted-foreground">News</div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Lock className="w-4 h-4 text-yellow-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isInactive).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Inaktiv</div>
        </div>
      </div>

      {showCreate && (
        <div className="mb-5">
          <UserForm
            title="Internen Login erstellen"
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setShowCreate(false)}
            isSaving={createMutation.isPending}
            submitLabel="Login erstellen"
          />
        </div>
      )}

      {editingUser && (
        <div className="mb-5">
          <UserForm
            title={isInternalLogin(editingUser) ? "Internen Login bearbeiten" : "Nutzerkonto bearbeiten"}
            initial={editingUser}
            onSave={data => updateMutation.mutate({ user: editingUser, data })}
            onCancel={() => setEditingUser(null)}
            isSaving={updateMutation.isPending}
            submitLabel="Änderungen speichern"
          />
        </div>
      )}

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            placeholder="Nutzer oder Login suchen..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Alle" },
            { key: "fan", label: "Nutzer" },
            { key: "admin", label: "Admin" },
            { key: "gotw", label: "GOTW" },
            { key: "photographer", label: "Fotografen" },
            { key: "podcast", label: "Podcast" },
            { key: "news", label: "News" },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedRole(item.key)}
              className={`px-3 h-8 rounded-full text-xs font-medium transition-all ${
                selectedRole === item.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/50 text-foreground hover:bg-secondary"
              }`}
            >
              {item.label}
            </button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["adminUsers"] })}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserCog className="w-8 h-8 text-primary/50" />
          </div>

          <h3 className="text-base font-semibold">
            Keine internen Logins gefunden
          </h3>

          <p className="text-xs text-muted-foreground mt-1">
            Erstelle den ersten Zugang für Admin, GOTW, Fotograf, Podcast, News oder Nutzer.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => {
            const passwordSet = !!getInternalPassword(user);
            const protectedAccount = isProtectedAccount(user);
            const manageable = canManageTarget(user);
            const gotw = isGotw(user);
            const photographer = isPhotographer(user);
            const podcast = isPodcast(user);
            const news = isNews(user);

            return (
              <div
                key={user.id}
                className="bg-card border border-border/50 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    {isAdmin(user) ? (
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                    ) : gotw ? (
                      <Star className="w-5 h-5 text-pink-400" />
                    ) : photographer ? (
                      <Camera className="w-5 h-5 text-emerald-400" />
                    ) : podcast ? (
                      <Radio className="w-5 h-5 text-violet-300" />
                    ) : news ? (
                      <Newspaper className="w-5 h-5 text-red-300" />
                    ) : (
                      <UserCog className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold truncate">
                        {user.displayName || user.username}
                      </h2>

                      <RoleBadge user={user} />
                      <StatusBadge user={user} />

                      {!passwordSet && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                          Kein Passwort
                        </span>
                      )}

                      {user.isOwner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                          Owner
                        </span>
                      )}

                      {protectedAccount && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                          Geschützt
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      @{user.internalUsername || user.username}
                    </p>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      Erstellt: {user.createdAtUtc || user.created_date || "unbekannt"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getUserFeatures(user).map(featureKey => {
                        const option = FEATURE_OPTIONS.find(item => item.key === featureKey);
                        if (!option) return null;

                        return (
                          <span
                            key={featureKey}
                            className="rounded-full border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                          >
                            {option.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 justify-end">
                  {manageable ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setEditingUser(user);
                          setShowCreate(false);
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Bearbeiten
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handlePasswordReset(user)}
                      >
                        <KeyRound className="w-3 h-3 mr-1" />
                        Passwort
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          statusMutation.mutate({
                            user,
                            status: isInactive(user) ? "active" : "inactive",
                          });
                        }}
                      >
                        {isInactive(user) ? "Aktivieren" : "Deaktivieren"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-red-400 hover:text-red-300 hover:border-red-500/40"
                        onClick={() => setDeleteTarget(user)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Löschen
                      </Button>
                    </>
                  ) : (
                    <div className="text-[11px] text-muted-foreground rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
                      Admin-/Owner-Account geschützt
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full">
            <h2 className="text-lg font-bold">
              Internen Login löschen?
            </h2>

            <p className="text-sm text-muted-foreground mt-2">
              {deleteTarget.displayName || deleteTarget.username} wird gelöscht und kann sich danach nicht mehr intern anmelden.
            </p>

            <div className="flex gap-2 mt-5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => deleteMutation.mutate(deleteTarget)}
                disabled={deleteMutation.isPending || isProtectedAccount(deleteTarget)}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Löschen"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
