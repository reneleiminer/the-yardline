import {
  isAdmin,
  isDataEditor,
  isAdminBySlug,
  isDataEditorBySlug,
  isGameOfWeekEditorBySlug,
  isPodcastPartnerBySlug,
  getRoleSlug,
} from "./roleDefinitions";

const INTERNAL_ROUTES = [
  "/admin",
  "/data-editor",
  "/podcast",
];

function normalizeRole(role) {
  return getRoleSlug(role || "fan");
}

function isAdminRole(role) {
  const slug = normalizeRole(role);

  return (
    slug === "admin" ||
    isAdmin(slug) ||
    isAdminBySlug(slug)
  );
}

function isDataEditorRole(role) {
  const slug = normalizeRole(role);

  return (
    slug === "data_editor" ||
    isDataEditor(slug) ||
    isDataEditorBySlug(slug)
  );
}

function isGameOfWeekEditorRole(role) {
  const slug = normalizeRole(role);

  return (
    slug === "media_partner" ||
    isGameOfWeekEditorBySlug(slug)
  );
}

function isPodcastPartnerRole(role) {
  const slug = normalizeRole(role);

  return (
    slug === "podcast_partner" ||
    isPodcastPartnerBySlug(slug)
  );
}

function getUserRole(userOrRole) {
  if (!userOrRole) return "fan";

  if (typeof userOrRole === "string") {
    return userOrRole;
  }

  return userOrRole.roleSlug || userOrRole.role || "fan";
}

/**
 * Teams & Ligen
 * Nur Admin, weil Teams/Ligen Grundstruktur der App sind.
 */
export const canEditTeam = user => {
  return isAdminRole(getUserRole(user));
};

export const canEditLeague = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageClub = userOrRole => {
  return isAdminRole(getUserRole(userOrRole));
};

export const canManageLeague = userOrRole => {
  return isAdminRole(getUserRole(userOrRole));
};

/**
 * Spiele & Ergebnisse
 * Admin und Dateneditor dürfen Spieldaten pflegen.
 */
export const canEditResults = user => {
  const role = getUserRole(user);

  return isAdminRole(role) || isDataEditorRole(role);
};

export const canEditGames = user => {
  return canEditResults(user);
};

export const canEditData = userOrRole => {
  const role = getUserRole(userOrRole);

  return isAdminRole(role) || isDataEditorRole(role);
};

/**
 * Game of the Week
 * Media-Partner dürfen nur das Game of the Week auswählen und den sichtbaren Text setzen.
 */
export const canSelectGameOfTheWeek = userOrRole => {
  const role = getUserRole(userOrRole);

  return isAdminRole(role) || isGameOfWeekEditorRole(role);
};

export const canManagePodcast = userOrRole => {
  const role = getUserRole(userOrRole);

  return isAdminRole(role) || isPodcastPartnerRole(role);
};

/**
 * Streams
 * Dateneditor darf Streams eintragen/bearbeiten.
 * Freigabe kann ebenfalls Dateneditor, falls du Streams als Spieldaten behandelst.
 */
export const canSubmitStream = user => {
  const role = getUserRole(user);

  return isAdminRole(role) || isDataEditorRole(role);
};

export const canApproveStreams = user => {
  const role = getUserRole(user);

  return isAdminRole(role) || isDataEditorRole(role);
};

/**
 * Tippspiel
 * Dateneditor darf Tippspiel pro Spiel aktivieren/deaktivieren.
 * Löschen/Zurücksetzen nur Admin.
 */
export const canTogglePredictions = user => {
  const role = getUserRole(user);

  return isAdminRole(role) || isDataEditorRole(role);
};

export const canResetPredictions = user => {
  return isAdminRole(getUserRole(user));
};

export const canDeletePredictions = user => {
  return isAdminRole(getUserRole(user));
};

/**
 * GameDay Shots
 * Dateneditor darf GameDay Shots bei Spielen pflegen.
 */
export const canManageGameDayShots = user => {
  const role = getUserRole(user);

  return isAdminRole(role) || isDataEditorRole(role);
};

/**
 * Admin-only Bereiche
 */
export const canApproveRoles = user => {
  return isAdminRole(getUserRole(user));
};

export const canModerate = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageUsers = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageLegal = user => {
  return isAdminRole(getUserRole(user));
};

export const canManagePartners = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageAppUpdates = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageAppBranding = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageAds = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageCompetitions = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageStandingsConfig = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageSupport = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageDeletionRequests = user => {
  return isAdminRole(getUserRole(user));
};

export const canManageOwnClub = user => {
  return canEditResults(user);
};

export const isOwnerProtected = user => {
  return !!user?.isOwner;
};

export const canCreateOfficialPost = () => false;
export const canCreateNews = () => false;
export const canCreateTransfer = () => false;

/**
 * Routen-Zugriff
 */
export const checkRouteAccess = (userRole, route) => {
  const normalizedRoute = route || "";

  if (!INTERNAL_ROUTES.some(prefix => normalizedRoute.startsWith(prefix))) {
    return true;
  }

  if (normalizedRoute.startsWith("/admin")) {
    return isAdminRole(userRole);
  }

  if (normalizedRoute.startsWith("/data-editor")) {
    return isDataEditorRole(userRole) || isGameOfWeekEditorRole(userRole) || isAdminRole(userRole);
  }

  if (normalizedRoute.startsWith("/podcast")) {
    return isPodcastPartnerRole(userRole) || isAdminRole(userRole);
  }

  return false;
};
