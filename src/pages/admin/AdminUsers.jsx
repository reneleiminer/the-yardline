import React, { useMemo, useState } from "react";
import useSetHeader from "@/hooks/useSetHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Newspaper,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const EMPTY_USER = {
  username: "",
  displayName: "",
  roleSlug: "data_editor",
  connectedTeamId: "",
  internalPassword: "",
  status: "active",
};

const ROLE_LABELS = {
  admin: "Admin",
  data_editor: "DataEditor",
  media_partner: "Media",
  club: "Verein",
};

const ROLE_DISPLAY_LABELS = {
  admin: "Admin",
  data_editor: "Dateneditor",
  media_partner: "Media",
  club: "Verein",
};

const INTERNAL_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "data_editor", label: "Dateneditor" },
  { value: "media_partner", label: "Media" },
  { value: "club", label: "Verein" },
];

const STATUS_LABELS = {
  active: "Aktiv",
  inactive: "Inaktiv",
  blocked: "Gesperrt",
};

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function getInternalEmail(username, roleSlug = "data_editor") {
  const cleanUsername = normalizeUsername(username).replace(/[^a-z0-9._-]/g, "-");

  const prefixByRole = {
    admin: "admin",
    data_editor: "data-editor",
    media_partner: "media",
    club: "verein",
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
  return normalizeRole(user?.roleSlug || user?.role);
}

function isInternalLogin(user) {
  const roleSlug = getRoleSlug(user);

  return (
    roleSlug === "admin" ||
    roleSlug === "data_editor" ||
    roleSlug === "media_partner" ||
    roleSlug === "club"
  );
}

function isAdmin(user) {
  return getRoleSlug(user) === "admin";
}

function isDataEditor(user) {
  return getRoleSlug(user) === "data_editor";
}

function isMediaPartner(user) {
  return getRoleSlug(user) === "media_partner";
}

function isClubAccount(user) {
  return getRoleSlug(user) === "club";
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

function getTeamName(teams, teamId) {
  if (!teamId) return "";

  const team = teams.find(item => item.id === teamId);

  return team?.name || team?.displayName || team?.shortName || "";
}

function RoleBadge({ user }) {
  const roleSlug = getRoleSlug(user);
  const admin = roleSlug === "admin";
  const media = roleSlug === "media_partner";
  const club = roleSlug === "club";

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        admin
          ? "bg-blue-500/15 text-blue-400"
          : media
          ? "bg-pink-500/15 text-pink-400"
          : club
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-primary/15 text-primary"
      }`}
    >
      {ROLE_DISPLAY_LABELS[roleSlug] || "Dateneditor"}
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

function UserForm({ title, initial, teams = [], onSave, onCancel, isSaving, submitLabel }) {
  const isExistingProtected = initial?.id && isProtectedAccount(initial);

  const [form, setForm] = useState({
    ...EMPTY_USER,
    ...initial,
    username: initial?.username || initial?.internalUsername || "",
    roleSlug: initial?.roleSlug || "data_editor",
    connectedTeamId:
      initial?.connectedTeamId ||
      initial?.connectedClubId ||
      initial?.linkedClubId ||
      "",
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
    const roleSlug = normalizeRole(form.roleSlug || "data_editor");

    if (!["admin", "data_editor", "media_partner", "club"].includes(roleSlug)) {
      toast.error("Bitte eine gültige Account-Art auswählen.");
      return;
    }

    if (roleSlug === "club" && !form.connectedTeamId) {
      toast.error("Bitte einen Verein verbinden.");
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

    if (!initial?.id && !form.internalPassword.trim()) {
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
      connectedTeamId: roleSlug === "club" ? form.connectedTeamId : "",
      connectedClubId: roleSlug === "club" ? form.connectedTeamId : "",
      linkedClubId: roleSlug === "club" ? form.connectedTeamId : "",
      status: form.status || "active",
      internalPassword: form.internalPassword.trim(),
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
            Login für Admin, Dateneditor, Media oder Vereinszugänge
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
              connectedTeamId: nextRole === "club" ? current.connectedTeamId : "",
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

      {form.roleSlug === "club" && (
        <select
          value={form.connectedTeamId}
          onChange={event => set("connectedTeamId", event.target.value)}
          disabled={isExistingProtected}
          className="h-10 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground disabled:opacity-60"
        >
          <option value="">Verein verbinden...</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name || team.displayName || team.shortName || "Unbenannter Verein"}
            </option>
          ))}
        </select>
      )}

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
    title: "Interne Logins",
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

  const { data: teams = [] } = useQuery({
    queryKey: ["adminUsersTeams"],
    queryFn: () => base44.entities.Team.list("name"),
  });

  const internalUsers = useMemo(() => {
    return users.filter(isInternalLogin);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return internalUsers.filter(user => {
      const matchesRole =
        selectedRole === "all" ||
        getRoleSlug(user) === selectedRole;

      if (!matchesRole) return false;
      if (!query) return true;

      return (
        user.username?.toLowerCase().includes(query) ||
        user.internalUsername?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
      );
    });
  }, [internalUsers, searchTerm, selectedRole]);

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
        role: ROLE_LABELS[data.roleSlug] || "DataEditor",
        connectedTeamId: data.roleSlug === "club" ? data.connectedTeamId : "",
        connectedClubId: data.roleSlug === "club" ? data.connectedTeamId : "",
        linkedClubId: data.roleSlug === "club" ? data.connectedTeamId : "",
        status: data.status || "active",
        internalPassword: data.internalPassword,
        verified: true,
        isInternalUser: true,
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
        role: ROLE_LABELS[data.roleSlug] || "DataEditor",
        connectedTeamId: data.roleSlug === "club" ? data.connectedTeamId : "",
        connectedClubId: data.roleSlug === "club" ? data.connectedTeamId : "",
        linkedClubId: data.roleSlug === "club" ? data.connectedTeamId : "",
        status: data.status || "active",
        isInternalUser: true,
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

      return base44.entities.AppUser.delete(user.id);
    },
    onSuccess: () => {
      invalidateUsers();
      setDeleteTarget(null);
      toast.success("Interner Login gelöscht");
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
            Interner Zugriff
          </p>

          <h1 className="text-xl font-black mt-1">
            Interne Logins
          </h1>

          <p className="text-xs text-muted-foreground mt-1">
            Hier verwaltest du Admin-, Dateneditor-, Media- und Vereinszugänge. Dein Owner-Account ist geschützt.
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-blue-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isAdmin).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Admin</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <UserCog className="w-4 h-4 text-primary mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isDataEditor).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Dateneditoren</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Newspaper className="w-4 h-4 text-pink-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isMediaPartner).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Media</div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Building2 className="w-4 h-4 text-emerald-400 mb-2" />
          <div className="text-xl font-black">
            {internalUsers.filter(isClubAccount).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Vereine</div>
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
            teams={teams}
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
            title="Internen Login bearbeiten"
            initial={editingUser}
            teams={teams}
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
            placeholder="Login suchen..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Alle" },
            { key: "admin", label: "Admin" },
            { key: "data_editor", label: "Dateneditoren" },
            { key: "media_partner", label: "Media" },
            { key: "club", label: "Vereine" },
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
            Erstelle den ersten Zugang für Admin, Dateneditor, Media oder Verein.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => {
            const passwordSet = !!getInternalPassword(user);
            const protectedAccount = isProtectedAccount(user);
            const manageable = canManageTarget(user);
            const media = isMediaPartner(user);
            const club = isClubAccount(user);
            const connectedTeamName = getTeamName(
              teams,
              user.connectedTeamId || user.connectedClubId || user.linkedClubId
            );

            return (
              <div
                key={user.id}
                className="bg-card border border-border/50 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    {isAdmin(user) ? (
                      <ShieldCheck className="w-5 h-5 text-blue-400" />
                    ) : media ? (
                      <Newspaper className="w-5 h-5 text-pink-400" />
                    ) : club ? (
                      <Building2 className="w-5 h-5 text-emerald-400" />
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

                    {club && (
                      <p className="text-[11px] text-emerald-300 mt-1">
                        Verein: {connectedTeamName || "Nicht verbunden"}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-1">
                      Erstellt: {user.createdAtUtc || user.created_date || "unbekannt"}
                    </p>
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