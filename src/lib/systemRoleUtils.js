// System role avatar - Yardline logo
const YARDLINE_LOGO = '';

const SYSTEM_ROLES = ['admin', 'moderator', 'data_editor', 'Admin', 'Moderator', 'DataEditor'];

export const isSystemRole = (roleSlug) => {
  if (!roleSlug) return false;
  const normalized = String(roleSlug).toLowerCase();
  return SYSTEM_ROLES.includes(normalized) || SYSTEM_ROLES.map(r => r.toLowerCase()).includes(normalized);
};

export const getAvatarForRole = (user) => {
  // System roles always use Yardline logo
  if (isSystemRole(user?.roleSlug || user?.role)) {
    return YARDLINE_LOGO;
  }
  // Otherwise return user's own avatar
  return user?.avatar;
};

export const YARDLINE_LOGO_URL = YARDLINE_LOGO;
