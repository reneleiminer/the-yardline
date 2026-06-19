import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export const AuthContext = createContext();

const SESSION_KEY = "yardline_user_session";
const OWNER_EMAIL = "itsleimiro@gmail.com";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "ReneRicardo19";
const DEFAULT_ADMIN_EMAIL = "admin@the-yardline.internal";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

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
    game_of_the_week: "gotw",
    media: "gotw",
    media_partner: "gotw",
    photographer: "photographer",
    fotograf: "photographer",
    gameday_shots: "photographer",
    podcast: "podcast",
    podcast_partner: "podcast",
    news: "news",
    newsroom: "news",
    redaktion: "news",
    journalist: "news",
    creator: "news",
    dataeditor: "data_editor",
    data_editor: "data_editor",
    daten_editor: "data_editor",
    dateneditor: "data_editor",
    club: "fan",
    verein: "fan",
    league: "fan",
    liga: "fan",
    moderator: "fan",
    official_media: "fan",
  };

  return legacyMap[normalized] || normalized;
}

function isOwnerEmail(email) {
  return normalizeEmail(email) === OWNER_EMAIL;
}

function isDeletedOrBlocked(appUser) {
  return (
    appUser?.deletionStatus === "pending" ||
    appUser?.deletionStatus === "completed" ||
    appUser?.status === "deleted" ||
    appUser?.status === "blocked_deleted" ||
    appUser?.status === "banned" ||
    appUser?.status === "blocked" ||
    appUser?.status === "inactive"
  );
}

function isInternalRole(appUser) {
  const featureAccess = appUser?.featureAccess || appUser?.permissions || appUser?.extraAccess;
  const hasInternalFeature = Array.isArray(featureAccess)
    ? featureAccess.length > 0
    : typeof featureAccess === "string"
      ? featureAccess.trim().length > 0
      : featureAccess && typeof featureAccess === "object"
        ? Object.values(featureAccess).some(Boolean)
        : false;

  return ["admin", "gotw", "photographer", "podcast", "news", "data_editor"].includes(normalizeRole(appUser?.roleSlug || appUser?.role)) || hasInternalFeature;
}

function getStoredSessionId() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    return parsed?.appUserId || "";
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return "";
  }
}

function storeSession(appUser) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      appUserId: appUser.id,
      createdAtUtc: new Date().toISOString(),
    })
  );
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

function normalizePublicAppUser(appUser) {
  if (!appUser) return null;

  const roleSlug = normalizeRole(appUser.roleSlug || appUser.role || "fan") || "fan";
  const onboardingCompleted = appUser.onboardingCompleted === true;

  return {
    ...appUser,
    roleSlug,
    role: appUser.role || "Fan",
    isInternalUser: false,
    needsOnboarding: roleSlug === "fan" && !onboardingCompleted,
  };
}

function normalizeSessionAppUser(appUser) {
  if (!appUser) return null;

  const roleSlug = normalizeRole(appUser.roleSlug || appUser.role || "fan") || "fan";

  if (isInternalRole({ ...appUser, roleSlug }) || appUser.isInternalUser === true) {
    return {
      ...appUser,
      roleSlug,
      role: appUser.role || getInternalRoleLabel(roleSlug),
      isInternalUser: true,
      needsOnboarding: false,
    };
  }

  return normalizePublicAppUser(appUser);
}

function getInternalRoleLabel(roleSlug) {
  if (roleSlug === "admin") return "Admin";
  if (roleSlug === "gotw") return "GOTW";
  if (roleSlug === "photographer") return "Fotograf";
  if (roleSlug === "podcast") return "Podcast";
  if (roleSlug === "news") return "News";
  if (roleSlug === "data_editor") return "Dateneditor";
  return "Intern";
}

async function ensureDefaultAdmin() {
  const existingByUsername = await base44.entities.AppUser.filter({
    username: DEFAULT_ADMIN_USERNAME,
  });

  const existingByInternalUsername = await base44.entities.AppUser.filter({
    internalUsername: DEFAULT_ADMIN_USERNAME,
  });

  const candidates = [...existingByUsername, ...existingByInternalUsername];
  const uniqueCandidates = Array.from(
    new Map(candidates.map(item => [item.id || item.username, item])).values()
  );

  const existingAdmin = uniqueCandidates.find(user =>
    normalizeUsername(user.username || user.internalUsername) === DEFAULT_ADMIN_USERNAME
  );

  if (existingAdmin) {
    const needsUpdate =
      existingAdmin.email !== DEFAULT_ADMIN_EMAIL ||
      existingAdmin.roleSlug !== "admin" ||
      existingAdmin.role !== "Admin" ||
      existingAdmin.status !== "active" ||
      existingAdmin.internalPassword !== DEFAULT_ADMIN_PASSWORD ||
      existingAdmin.isInternalUser !== true ||
      existingAdmin.isOwner !== true ||
      existingAdmin.verified !== true ||
      existingAdmin.needsOnboarding === true;

    if (!needsUpdate) return existingAdmin;

    return base44.entities.AppUser.update(existingAdmin.id, {
      email: existingAdmin.email || DEFAULT_ADMIN_EMAIL,
      username: DEFAULT_ADMIN_USERNAME,
      internalUsername: DEFAULT_ADMIN_USERNAME,
      displayName: existingAdmin.displayName || "Admin",
      roleSlug: "admin",
      role: "Admin",
      status: "active",
      internalPassword: existingAdmin.internalPassword || DEFAULT_ADMIN_PASSWORD,
      verified: true,
      isInternalUser: true,
      isOwner: true,
      needsOnboarding: false,
      updatedAtUtc: new Date().toISOString(),
    });
  }

  return base44.entities.AppUser.create({
    email: DEFAULT_ADMIN_EMAIL,
    username: DEFAULT_ADMIN_USERNAME,
    internalUsername: DEFAULT_ADMIN_USERNAME,
    displayName: "Admin",
    roleSlug: "admin",
    role: "Admin",
    status: "active",
    internalPassword: DEFAULT_ADMIN_PASSWORD,
    verified: true,
    isInternalUser: true,
    isOwner: true,
    needsOnboarding: false,
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
  });
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [appUserSnapshot, setAppUserSnapshot] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);
      setAppPublicSettings(null);

      const sessionId = getStoredSessionId();

      if (!sessionId) {
        setUser(null);
        setAppUserSnapshot(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }

      const appUser = normalizeSessionAppUser(await base44.entities.AppUser.get(sessionId));

      if (!appUser || isDeletedOrBlocked(appUser)) {
        clearStoredSession();
        setUser(null);
        setAppUserSnapshot(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }

      setUser({
        id: appUser.id,
        username: appUser.username,
        full_name: appUser.displayName || appUser.username,
        name: appUser.displayName || appUser.username,
        email: appUser.email || "",
      });
      setAppUserSnapshot(appUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setAuthChecked(true);
    } catch (error) {
      console.warn("Auth bootstrap failed:", error);

      clearStoredSession();
      setUser(null);
      setAppUserSnapshot(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setAuthChecked(true);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
  };

  const setPublicSession = (appUser) => {
    const normalizedAppUser = normalizePublicAppUser(appUser);

    storeSession(normalizedAppUser);

    const publicUser = {
      id: normalizedAppUser.id,
      username: normalizedAppUser.username,
      full_name: normalizedAppUser.displayName || normalizedAppUser.username,
      name: normalizedAppUser.displayName || normalizedAppUser.username,
      email: normalizedAppUser.email || "",
    };

    setUser(publicUser);
    setAppUserSnapshot(normalizedAppUser);
    setIsAuthenticated(true);
    setAuthError(null);
    setAuthChecked(true);

    return {
      ok: true,
      user: publicUser,
      appUser: normalizedAppUser,
    };
  };

  const registerUser = async ({
    username,
    displayName,
    birthDate,
    email,
    password,
    passwordConfirm,
  }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanUsername = normalizeUsername(username);
      const cleanDisplayName = String(displayName || "").trim();
      const cleanBirthDate = String(birthDate || "").trim();
      const cleanEmail = normalizeEmail(email);
      const cleanPassword = String(password || "");
      const cleanPasswordConfirm = String(passwordConfirm || "");

      if (!cleanUsername || cleanUsername.length < 3) {
        throw new Error("Der Benutzername braucht mindestens 3 Zeichen.");
      }

      if (!cleanDisplayName) {
        throw new Error("Bitte gib deinen Namen ein.");
      }

      if (!cleanBirthDate) {
        throw new Error("Bitte gib dein Geburtsdatum ein.");
      }

      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Bitte gib eine gültige E-Mail ein.");
      }

      if (cleanPassword.length < 6) {
        throw new Error("Das Passwort braucht mindestens 6 Zeichen.");
      }

      if (cleanPassword !== cleanPasswordConfirm) {
        throw new Error("Die Passwörter stimmen nicht überein.");
      }

      const existingByUsername = await base44.entities.AppUser.filter({
        username: cleanUsername,
      });

      if (existingByUsername.length > 0) {
        throw new Error("Dieser Benutzername ist bereits vergeben.");
      }

      const existingByEmail = await base44.entities.AppUser.filter({
        email: cleanEmail,
      });

      if (existingByEmail.length > 0) {
        throw new Error("Für diese E-Mail gibt es bereits ein Konto.");
      }

      const now = new Date().toISOString();
      const created = await base44.entities.AppUser.create({
        username: cleanUsername,
        displayName: cleanDisplayName,
        email: cleanEmail,
        internalPassword: cleanPassword,
        isInternalUser: false,
        role: "Fan",
        roleSlug: "fan",
        verified: false,
        status: "active",
        birthDate: cleanBirthDate,
        onboardingCompleted: false,
        createdAtUtc: now,
        updatedAtUtc: now,
      });

      return setPublicSession(created);
    } catch (error) {
      const authFailure = {
        type: "register_failed",
        message: error.message || "Registrierung fehlgeschlagen.",
      };

      setAuthError(authFailure);

      return {
        ok: false,
        error: authFailure,
      };
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const requestPasswordReset = async ({ email }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Bitte gib deine E-Mail ein.");
      }

      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Reset-E-Mail konnte nicht gesendet werden.");
      }

      return {
        ok: true,
        email: cleanEmail,
        message: data.message || "Wenn die E-Mail bekannt ist, wurde ein Code gesendet.",
      };
    } catch (error) {
      const authFailure = {
        type: "password_reset_failed",
        message: error.message || "Reset-E-Mail konnte nicht gesendet werden.",
      };

      setAuthError(authFailure);

      return {
        ok: false,
        error: authFailure,
      };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const confirmPasswordReset = async ({ email, code, password, passwordConfirm }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanEmail = normalizeEmail(email);
      const cleanCode = String(code || "").trim();
      const cleanPassword = String(password || "");
      const cleanPasswordConfirm = String(passwordConfirm || "");

      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("Bitte gib deine E-Mail ein.");
      }

      if (!cleanCode) {
        throw new Error("Bitte gib den Code aus der E-Mail ein.");
      }

      if (cleanPassword.length < 6) {
        throw new Error("Das neue Passwort braucht mindestens 6 Zeichen.");
      }

      if (cleanPassword !== cleanPasswordConfirm) {
        throw new Error("Die Passwörter stimmen nicht überein.");
      }

      const response = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          password: cleanPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Passwort konnte nicht zurückgesetzt werden.");
      }

      return {
        ok: true,
        message: data.message || "Passwort wurde aktualisiert.",
      };
    } catch (error) {
      const authFailure = {
        type: "password_reset_failed",
        message: error.message || "Passwort konnte nicht zurückgesetzt werden.",
      };

      setAuthError(authFailure);

      return {
        ok: false,
        error: authFailure,
      };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginUser = async ({ login, password }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanLogin = String(login || "").trim().toLowerCase();
      const cleanPassword = String(password || "");

      if (!cleanLogin || !cleanPassword) {
        throw new Error("Bitte Login und Passwort eingeben.");
      }

      const byEmail = cleanLogin.includes("@")
        ? await base44.entities.AppUser.filter({ email: cleanLogin })
        : [];
      const byUsername = await base44.entities.AppUser.filter({ username: cleanLogin });
      const candidates = [...byEmail, ...byUsername];
      const uniqueCandidates = Array.from(
        new Map(candidates.map(item => [item.id || item.username, item])).values()
      );

      const appUser = uniqueCandidates.find(item => {
        const emailMatch = normalizeEmail(item.email) === cleanLogin;
        const usernameMatch = normalizeUsername(item.username) === cleanLogin;

        return (emailMatch || usernameMatch) && !item.isInternalUser;
      });

      if (!appUser || isDeletedOrBlocked(appUser)) {
        throw new Error("Benutzername, E-Mail oder Passwort ist falsch.");
      }

      const storedPassword =
        appUser.internalPassword ||
        appUser.password ||
        appUser.loginPassword ||
        appUser.temporaryPassword ||
        "";

      if (String(storedPassword) !== cleanPassword) {
        throw new Error("Benutzername, E-Mail oder Passwort ist falsch.");
      }

      return setPublicSession(appUser);
    } catch (error) {
      const authFailure = {
        type: "login_failed",
        message: error.message || "Login fehlgeschlagen.",
      };

      setAuthError(authFailure);

      return {
        ok: false,
        error: authFailure,
      };
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const completeOnboarding = async () => {
    if (!appUserSnapshot?.id) return;

    const updated = await base44.entities.AppUser.update(appUserSnapshot.id, {
      onboardingCompleted: true,
      updatedAtUtc: new Date().toISOString(),
    });

    setPublicSession(updated);
  };

  const updatePublicUser = async (updates = {}) => {
    if (!appUserSnapshot?.id) {
      throw new Error("Du bist nicht angemeldet.");
    }

    const updated = await base44.entities.AppUser.update(appUserSnapshot.id, {
      ...updates,
      updatedAtUtc: new Date().toISOString(),
    });

    const normalizedUpdated = normalizeSessionAppUser(updated);

    if (isInternalRole(normalizedUpdated) || normalizedUpdated?.isInternalUser === true) {
      setInternalSession(normalizedUpdated);
    } else {
      setPublicSession(normalizedUpdated);
    }

    return normalizedUpdated;
  };

  const resolveAppUserForAuth = async (base44User) => {
    const email = normalizeEmail(base44User?.email);

    if (!email) {
      throw new Error("Login ohne E-Mail konnte keinem Konto zugeordnet werden.");
    }

    const owner = isOwnerEmail(email);
    const appUsers = await base44.entities.AppUser.filter({ email });

    if (appUsers.length === 0) {
      if (owner) {
        return base44.entities.AppUser.create({
          email,
          username: "admin",
          internalUsername: "admin",
          displayName: "Admin",
          roleSlug: "admin",
          role: "Admin",
          isOwner: true,
          isInternalUser: true,
          status: "active",
          verified: true,
          needsOnboarding: false,
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        });
      }

      return {
        email,
        username: email.split("@")[0],
        displayName: base44User.full_name || base44User.name || email,
        roleSlug: "fan",
        role: "Fan",
        status: "no_internal_access",
        needsOnboarding: false,
        isVirtualRegistrationUser: true,
      };
    }

    const appUser = appUsers[0];

    if (owner) {
      const needsOwnerFix =
        appUser.roleSlug !== "admin" ||
        appUser.role !== "Admin" ||
        appUser.status !== "active" ||
        appUser.isOwner !== true ||
        appUser.verified !== true ||
        appUser.needsOnboarding === true;

      if (needsOwnerFix) {
        return base44.entities.AppUser.update(appUser.id, {
          roleSlug: "admin",
          role: "Admin",
          status: "active",
          isOwner: true,
          isInternalUser: true,
          verified: true,
          needsOnboarding: false,
          updatedAtUtc: new Date().toISOString(),
        });
      }

      return appUser;
    }

    if (appUser.isOwner) {
      return base44.entities.AppUser.update(appUser.id, {
        isOwner: false,
        roleSlug: "fan",
        role: "Fan",
        verified: false,
        needsOnboarding: false,
        updatedAtUtc: new Date().toISOString(),
      });
    }

    return {
      ...appUser,
      roleSlug: appUser.roleSlug || "fan",
      role: appUser.role || "Fan",
      needsOnboarding: false,
    };
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await base44.auth.me();
      const email = normalizeEmail(currentUser?.email);

      if (!email) {
        throw new Error("Login ohne E-Mail konnte keinem Konto zugeordnet werden.");
      }

      const appUser = await resolveAppUserForAuth(currentUser);

      setUser(currentUser);
      setAppUserSnapshot(appUser);
      setIsAuthenticated(true);

      if (isDeletedOrBlocked(appUser)) {
        setAuthError({
          type: "account_blocked",
          message: "Dieses interne Konto ist gesperrt oder gelöscht.",
          appUser,
        });
      } else if (!isInternalRole(appUser)) {
        setAuthError({
          type: "not_internal",
          message: "Dieses Konto hat keinen internen Zugriff.",
          appUser,
        });
      } else {
        setAuthError(null);
      }
    } catch (error) {
      console.warn("User auth check failed:", error);

      setUser(null);
      setAppUserSnapshot(null);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError(null);
      } else {
        setAuthError({
          type: "unknown",
          message: error.message || "Login konnte nicht geprüft werden.",
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const setInternalSession = (appUser) => {
    const roleSlug = normalizeRole(appUser.roleSlug || appUser.role);
    const normalizedAppUser = {
      ...appUser,
      roleSlug,
      role: appUser.role || getInternalRoleLabel(roleSlug),
      isInternalUser: true,
      needsOnboarding: false,
    };

    const internalUser = {
      id: normalizedAppUser.id,
      username: normalizedAppUser.username || normalizedAppUser.internalUsername,
      full_name: normalizedAppUser.displayName || normalizedAppUser.username,
      name: normalizedAppUser.displayName || normalizedAppUser.username,
      email: normalizedAppUser.email || "",
      isInternalSession: true,
    };

    storeSession(normalizedAppUser);

    setUser(internalUser);
    setAppUserSnapshot(normalizedAppUser);
    setIsAuthenticated(true);
    setAuthError(null);

    return {
      ok: true,
      user: internalUser,
      appUser: normalizedAppUser,
    };
  };

  const internalLogin = async ({ username, password }) => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const cleanUsername = normalizeUsername(username);
      const cleanPassword = String(password || "").trim();

      if (!cleanUsername || !cleanPassword) {
        const error = {
          type: "login_failed",
          message: "Bitte Benutzername und Passwort eingeben.",
        };

        setAuthError(error);
        return { ok: false, error };
      }

      if (
        cleanUsername === DEFAULT_ADMIN_USERNAME &&
        cleanPassword === DEFAULT_ADMIN_PASSWORD
      ) {
        const defaultAdmin = await ensureDefaultAdmin();
        return setInternalSession(defaultAdmin);
      }

      const byUsername = await base44.entities.AppUser.filter({
        username: cleanUsername,
      });

      const byInternalUsername = await base44.entities.AppUser.filter({
        internalUsername: cleanUsername,
      });

      const candidates = [...byUsername, ...byInternalUsername];
      const uniqueCandidates = Array.from(
        new Map(candidates.map(item => [item.id || item.username, item])).values()
      );

      const appUser = uniqueCandidates.find(item => {
        const usernameMatch =
          normalizeUsername(item.username) === cleanUsername ||
          normalizeUsername(item.internalUsername) === cleanUsername;

        return usernameMatch && isInternalRole(item);
      });

      if (!appUser) {
        const error = {
          type: "login_failed",
          message: "Benutzername oder Passwort ist falsch.",
        };

        setAuthError(error);
        return { ok: false, error };
      }

      if (isDeletedOrBlocked(appUser)) {
        const error = {
          type: "account_blocked",
          message: "Dieses interne Konto ist gesperrt oder inaktiv.",
          appUser,
        };

        setAuthError(error);
        return { ok: false, error };
      }

      const storedPassword =
        appUser.internalPassword ||
        appUser.password ||
        appUser.loginPassword ||
        appUser.temporaryPassword ||
        "";

      if (String(storedPassword) !== cleanPassword) {
        const error = {
          type: "login_failed",
          message: "Benutzername oder Passwort ist falsch.",
        };

        setAuthError(error);
        return { ok: false, error };
      }

      return setInternalSession(appUser);
    } catch (error) {
      console.error("Internal login failed:", error);

      const authFailure = {
        type: "login_failed",
        message: error.message || "Login fehlgeschlagen.",
      };

      setUser(null);
      setAppUserSnapshot(null);
      setIsAuthenticated(false);
      setAuthError(authFailure);

      return {
        ok: false,
        error: authFailure,
      };
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = (shouldRedirect = true) => {
    clearStoredSession();
    setUser(null);
    setAppUserSnapshot(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (shouldRedirect) {
      window.location.href = "/";
      return;
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin("/");
  };

  const refreshAuth = async () => {
    await checkUserAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUserSnapshot,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        loginUser,
        registerUser,
        requestPasswordReset,
        confirmPasswordReset,
        completeOnboarding,
        updatePublicUser,
        internalLogin,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
