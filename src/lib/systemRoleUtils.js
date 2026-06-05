// System role avatar - Yardline logo
const YARDLINE_LOGO = 'https://media.base44.com/images/public/user_69d59a0ad9a169daad84be11/1b3508e30_D9398B29-052B-4005-8FE0-FB6E02445472.png';

const SYSTEM_ROLES = [
  'admin',
  'moderator',
  'data_editor',
  'media_partner',
  'podcast_partner',
  'Admin',
  'Moderator',
  'DataEditor',
  'Media',
  'Podcast',
];

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
