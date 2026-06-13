import {
  getRoleSlug,
  isAdminBySlug,
  isGameOfWeekEditorBySlug,
  isPhotographerBySlug,
  isPodcastPartnerBySlug,
  isNewsEditorBySlug,
} from "./roleDefinitions";

const INTERNAL_ROUTES = [
  "/admin",
  "/gotw",
  "/photographer",
  "/podcast",
  "/news-dashboard",
  "/live-games",
];

function normalizeRole(role) {
  return getRoleSlug(role || "fan");
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

function getUserRole(userOrRole) {
  if (!userOrRole) return "fan";
  if (typeof userOrRole === "string") return userOrRole;
  return userOrRole.roleSlug || userOrRole.role || "fan";
}

export function getFeatureAccess(userOrRole) {
  if (!userOrRole || typeof userOrRole === "string") return [];
  return parseFeatureAccess(userOrRole.featureAccess || userOrRole.permissions || userOrRole.extraAccess);
}

export function hasFeatureAccess(userOrRole, featureKey) {
  const role = getUserRole(userOrRole);
  if (isAdminRole(role)) return true;

  const feature = String(featureKey || "");
  const extra = getFeatureAccess(userOrRole);

  if (extra.includes(feature)) return true;
  if (feature === "gotw") return isGotwRole(role);
  if (feature === "gameday_shots") return isPhotographerRole(role);
  if (feature === "podcast") return isPodcastRole(role);
  if (feature === "news") return isNewsRole(role);

  return false;
}

function isAdminRole(role) {
  return isAdminBySlug(normalizeRole(role));
}

function isGotwRole(role) {
  return isGameOfWeekEditorBySlug(normalizeRole(role));
}

function isPhotographerRole(role) {
  return isPhotographerBySlug(normalizeRole(role));
}

function isPodcastRole(role) {
  return isPodcastPartnerBySlug(normalizeRole(role));
}

function isNewsRole(role) {
  return isNewsEditorBySlug(normalizeRole(role));
}

export const canEditTeam = user => isAdminRole(getUserRole(user));
export const canEditLeague = user => isAdminRole(getUserRole(user));
export const canManageClub = user => isAdminRole(getUserRole(user));
export const canManageLeague = user => isAdminRole(getUserRole(user));

export const canEditResults = user => isAdminRole(getUserRole(user));
export const canEditGames = user => isAdminRole(getUserRole(user));
export const canEditData = user => isAdminRole(getUserRole(user));

export const canSelectGameOfTheWeek = user => {
  return hasFeatureAccess(user, "gotw");
};

export const canManagePodcast = user => {
  return hasFeatureAccess(user, "podcast");
};

export const canSubmitStream = user => isAdminRole(getUserRole(user));
export const canApproveStreams = user => isAdminRole(getUserRole(user));
export const canTogglePredictions = user => isAdminRole(getUserRole(user));
export const canResetPredictions = user => isAdminRole(getUserRole(user));
export const canDeletePredictions = user => isAdminRole(getUserRole(user));

export const canManageGameDayShots = user => {
  return hasFeatureAccess(user, "gameday_shots");
};

export const canManageNews = user => {
  return hasFeatureAccess(user, "news");
};

export const canApproveRoles = user => isAdminRole(getUserRole(user));
export const canModerate = user => isAdminRole(getUserRole(user));
export const canManageUsers = user => isAdminRole(getUserRole(user));
export const canManageLegal = user => isAdminRole(getUserRole(user));
export const canManagePartners = user => isAdminRole(getUserRole(user));
export const canManageAppUpdates = user => isAdminRole(getUserRole(user));
export const canManageAppBranding = user => isAdminRole(getUserRole(user));
export const canManageAds = user => isAdminRole(getUserRole(user));
export const canManageCompetitions = user => isAdminRole(getUserRole(user));
export const canManageStandingsConfig = user => isAdminRole(getUserRole(user));
export const canManageSupport = user => isAdminRole(getUserRole(user));
export const canManageDeletionRequests = user => isAdminRole(getUserRole(user));
export const canManageOwnClub = user => isAdminRole(getUserRole(user));

export const isOwnerProtected = user => !!user?.isOwner;

export const canCreateOfficialPost = () => false;
export const canCreateNews = user => canManageNews(user);
export const canCreateTransfer = user => canManageNews(user);

export const checkRouteAccess = (userRole, route) => {
  const normalizedRoute = route || "";
  const role = getUserRole(userRole);

  if (!INTERNAL_ROUTES.some(prefix => normalizedRoute.startsWith(prefix))) {
    return true;
  }

  if (normalizedRoute.startsWith("/admin/game-result")) return isAdminRole(role) || hasFeatureAccess(userRole, "live_results");
  if (normalizedRoute.startsWith("/admin")) return isAdminRole(role);
  if (normalizedRoute.startsWith("/live-games")) return isAdminRole(role) || hasFeatureAccess(userRole, "live_results");
  if (normalizedRoute.startsWith("/gotw")) return hasFeatureAccess(userRole, "gotw");
  if (normalizedRoute.startsWith("/photographer")) return hasFeatureAccess(userRole, "gameday_shots");
  if (normalizedRoute.startsWith("/podcast")) return hasFeatureAccess(userRole, "podcast");
  if (normalizedRoute.startsWith("/news-dashboard")) return hasFeatureAccess(userRole, "news");

  return false;
};
