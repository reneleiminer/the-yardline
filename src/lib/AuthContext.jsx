import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext();

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
  return String(value || "").trim().toLowerCase();
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
  return ["admin", "data_editor"].includes(normalizeRole(appUser?.roleSlug || appUser?.role));
}

function getInternalRoleLabel(roleSlug) {
  if (roleSlug === "admin") return "Admin";
  if (roleSlug === "data_editor") return "Daten-Editor";
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
      setAuthError(null);
      setAppPublicSettings(null);

      setUser(null);
      setAppUserSnapshot(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.warn("Auth bootstrap failed:", error);

      setUser(null);
      setAppUserSnapshot(null);
      setIsAuthenticated(false);
      setAuthError(null);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    }
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
    const wasInternalSession = user?.isInternalSession;

    setUser(null);
    setAppUserSnapshot(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (wasInternalSession) {
      if (shouldRedirect) {
        window.location.href = "/";
      }

      return;
    }

    if (shouldRedirect) {
      base44.auth.logout("/");
      return;
    }

    base44.auth.logout();
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
