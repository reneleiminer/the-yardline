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
];

function normalizeRole(role) {
  return getRoleSlug(role || "fan");
}

function getUserRole(userOrRole) {
  if (!userOrRole) return "fan";
  if (typeof userOrRole === "string") return userOrRole;
  return userOrRole.roleSlug || userOrRole.role || "fan";
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
  const role = getUserRole(user);
  return isAdminRole(role) || isGotwRole(role);
};

export const canManagePodcast = user => {
  const role = getUserRole(user);
  return isAdminRole(role) || isPodcastRole(role);
};

export const canSubmitStream = user => isAdminRole(getUserRole(user));
export const canApproveStreams = user => isAdminRole(getUserRole(user));
export const canTogglePredictions = user => isAdminRole(getUserRole(user));
export const canResetPredictions = user => isAdminRole(getUserRole(user));
export const canDeletePredictions = user => isAdminRole(getUserRole(user));

export const canManageGameDayShots = user => {
  const role = getUserRole(user);
  return isAdminRole(role) || isPhotographerRole(role);
};

export const canManageNews = user => {
  const role = getUserRole(user);
  return isAdminRole(role) || isNewsRole(role);
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

  if (!INTERNAL_ROUTES.some(prefix => normalizedRoute.startsWith(prefix))) {
    return true;
  }

  if (normalizedRoute.startsWith("/admin")) return isAdminRole(userRole);
  if (normalizedRoute.startsWith("/gotw")) return isGotwRole(userRole) || isAdminRole(userRole);
  if (normalizedRoute.startsWith("/photographer")) return isPhotographerRole(userRole) || isAdminRole(userRole);
  if (normalizedRoute.startsWith("/podcast")) return isPodcastRole(userRole) || isAdminRole(userRole);
  if (normalizedRoute.startsWith("/news-dashboard")) return isNewsRole(userRole) || isAdminRole(userRole);

  return false;
};
