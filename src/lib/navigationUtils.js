/**
 * Navigation utilities - ensure all routes are correct and types match
 */

/**
 * Get profile route
 */
export const getProfileRoute = (username) => {
  if (!username) return '/profile';
  return `/profile/${encodeURIComponent(username)}`;
};

/**
 * Get club detail route
 */
export const getClubRoute = (clubId) => {
  if (!clubId) return '/';
  return `/club/${encodeURIComponent(clubId)}`;
};

/**
 * Get league detail route
 */
export const getLeagueRoute = (leagueId) => {
  if (!leagueId) return '/';
  return `/league/${encodeURIComponent(leagueId)}`;
};

/**
 * Get standings route for league
 */
export const getStandingsRoute = (leagueId) => {
  if (!leagueId) return '/tabellen';
  return `/tabellen/${encodeURIComponent(leagueId)}`;
};

/**
 * Get post detail route
 */
export const getPostRoute = (postId) => {
  if (!postId) return '/';
  return `/post/${encodeURIComponent(postId)}`;
};

/**
 * Get game detail route (when implemented)
 */
export const getGameRoute = (gameId) => {
  if (!gameId) return '/spiele';
  return `/spiele/${encodeURIComponent(gameId)}`;
};

/**
 * Get admin dashboard route
 */
export const getAdminRoute = () => '/admin';

/**
 * Get admin users route
 */
export const getAdminUsersRoute = () => '/admin/users';

/**
 * Get admin partners route
 */
export const getAdminPartnersRoute = () => '/admin/partners';

/**
 * Get admin legal route
 */
export const getAdminLegalRoute = () => '/admin/legal';

/**
 * Get create menu route
 */
export const getCreateRoute = () => '/create';

/**
 * Get specific create route by type
 */
export const getCreateTypeRoute = (type) => {
  const routes = {
    community: '/create/community',
    announcement: '/create/announcement',
    news: '/create/news',
    transfer: '/create/transfer',
    photo: '/create/photo',
  };
  return routes[type] || '/create';
};

/**
 * Get legal page route
 */
export const getLegalRoute = (slug) => {
  const routes = {
    impressum: '/impressum',
    datenschutz: '/datenschutz',
    nutzungsbedingungen: '/nutzungsbedingungen',
    'community-guidelines': '/community-guidelines',
  };
  return routes[slug] || '/';
};

/**
 * Get announcement detail route
 */
export const getAnnouncementRoute = (id) => {
  if (!id) return '/announcements';
  return `/announcement/${encodeURIComponent(id)}`;
};

/**
 * Get all main navigation routes
 */
export const mainRoutes = {
  home: '/',
  games: '/spiele',
  tables: '/tabellen',
  tournaments: '/turniere',
  create: '/create',
  profile: '/profile',
  settings: '/settings',
  announcements: '/announcements',
};

/**
 * Get all legal routes
 */
export const legalRoutes = {
  impressum: '/impressum',
  datenschutz: '/datenschutz',
  nutzungsbedingungen: '/nutzungsbedingungen',
  communityGuidelines: '/community-guidelines',
};

/**
 * Get all admin routes
 */
export const adminRoutes = {
  dashboard: '/admin',
  users: '/admin/users',
  partners: '/admin/partners',
  legal: '/admin/legal',
};

/**
 * All app routes for reference
 */
export const allRoutes = {
  ...mainRoutes,
  ...legalRoutes,
  ...adminRoutes,
};