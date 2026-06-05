export const ROLE_SLUGS = {
  FAN: 'fan',
  JOURNALIST: 'journalist',
  PHOTOGRAPHER: 'photographer',
  CREATOR: 'creator',
  OFFICIAL_MEDIA: 'official_media',
  CLUB: 'club',
  LEAGUE: 'league',
  MODERATOR: 'moderator',
  DATA_EDITOR: 'data_editor',
  MEDIA_PARTNER: 'media_partner',
  ADMIN: 'admin',

  FOTOGRAF: 'fotograf',
  VEREIN: 'verein',
  LIGA: 'liga',
};

export const ROLES = {
  FAN: 'Fan',
  CREATOR: 'Creator',
  FOTOGRAF: 'Fotograf',
  JOURNALIST: 'Journalist',
  VEREIN: 'Verein',
  LIGA: 'Liga',
  OFFICIAL_MEDIA: 'official_media',
  MODERATOR: 'Moderator',
  DATA_EDITOR: 'DataEditor',
  MEDIA_PARTNER: 'Media',
  ADMIN: 'Admin',
};

export const ROLE_LABELS = {
  fan: 'Fan',
  journalist: 'Journalist',
  photographer: 'Fotograf',
  creator: 'Creator',
  official_media: 'Offizielle Medien',
  club: 'Verein',
  league: 'Liga',
  moderator: 'Moderator',
  data_editor: 'Daten-Editor',
  media_partner: 'Media',
  admin: 'Admin',

  Fan: 'Fan',
  Creator: 'Creator',
  Fotograf: 'Fotograf',
  Journalist: 'Journalist',
  Verein: 'Verein',
  Liga: 'Liga',
  Moderator: 'Moderator',
  DataEditor: 'Daten-Editor',
  Media: 'Media',
  Admin: 'Admin',

  fotograf: 'Fotograf',
  verein: 'Verein',
  liga: 'Liga',
};

export const ADMIN_ROLE_SLUGS = ['admin'];
export const MODERATOR_ROLE_SLUGS = ['moderator', 'admin'];
export const DATA_EDITOR_ROLE_SLUGS = ['data_editor', 'admin'];
export const GAME_OF_WEEK_ROLE_SLUGS = ['media_partner', 'admin'];

export const PROFESSIONAL_ROLE_SLUGS = [
  'journalist',
  'photographer',
  'creator',
  'fotograf',
];

export const OFFICIAL_ROLE_SLUGS = [
  'official_media',
  'club',
  'league',
  'verein',
  'liga',
];

export const VOLUNTEER_ROLE_SLUGS = [
  'moderator',
  'data_editor',
];

export const ADMIN_ROLES = [ROLES.ADMIN];
export const MODERATOR_ROLES = [ROLES.MODERATOR, ROLES.ADMIN];
export const DATA_EDITOR_ROLES = [ROLES.DATA_EDITOR, ROLES.ADMIN];
export const GAME_OF_WEEK_ROLES = [ROLES.MEDIA_PARTNER, ROLES.ADMIN];

export const PROFESSIONAL_ROLES = [
  ROLES.CREATOR,
  ROLES.FOTOGRAF,
  ROLES.JOURNALIST,
];

export const OFFICIAL_ROLES = [
  ROLES.VEREIN,
  ROLES.LIGA,
  ROLES.OFFICIAL_MEDIA,
];

export const VOLUNTEER_ROLES = [
  ROLES.MODERATOR,
  ROLES.DATA_EDITOR,
];

export const getRoleSlug = role => {
  if (!role) return 'fan';

  const normalized = String(role)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const legacyMap = {
    fan: 'fan',
    admin: 'admin',
    creator: 'creator',
    fotograf: 'photographer',
    photographer: 'photographer',
    journalist: 'journalist',
    verein: 'club',
    club: 'club',
    liga: 'league',
    league: 'league',
    moderator: 'moderator',
    dataeditor: 'data_editor',
    data_editor: 'data_editor',
    daten_editor: 'data_editor',
    media: 'media_partner',
    media_partner: 'media_partner',
    medienpartner: 'media_partner',
    eurofbshow: 'media_partner',
    euro_fb_show: 'media_partner',
    eurofb: 'media_partner',
    official_media: 'official_media',
    offizielle_medien: 'official_media',
    organisation: 'official_media',
  };

  return legacyMap[normalized] || normalized;
};

export const getRoleDisplayLabel = role => {
  if (!role) return 'Fan';

  const slug = getRoleSlug(role);

  return (
    ROLE_LABELS[role] ||
    ROLE_LABELS[slug] ||
    role
  );
};

export const isAdminBySlug = slug => ADMIN_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isModeratorBySlug = slug => MODERATOR_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isDataEditorBySlug = slug => DATA_EDITOR_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isGameOfWeekEditorBySlug = slug => GAME_OF_WEEK_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isProfessionalBySlug = slug => PROFESSIONAL_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isOrganizationBySlug = slug => OFFICIAL_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isVolunteerBySlug = slug => VOLUNTEER_ROLE_SLUGS.includes(getRoleSlug(slug));

export const isAdmin = role => isAdminBySlug(role);
export const isModerator = role => isModeratorBySlug(role);
export const isDataEditor = role => isDataEditorBySlug(role);
export const isGameOfWeekEditor = role => isGameOfWeekEditorBySlug(role);
export const isProfessional = role => isProfessionalBySlug(role);
export const isOrganization = role => isOrganizationBySlug(role);
export const isVolunteer = role => isVolunteerBySlug(role);

export const showBadge = role => {
  const slug = getRoleSlug(role);

  return [
    'journalist',
    'photographer',
    'creator',
    'official_media',
    'club',
    'league',
    'media_partner',
  ].includes(slug);
};

export const CREATE_PERMISSIONS = {
  fan: [],
  journalist: ['community', 'news', 'transfer'],
  photographer: ['community'],
  creator: ['community'],
  official_media: ['community', 'announcement', 'news'],
  club: ['community', 'announcement', 'transfer'],
  league: ['community', 'announcement', 'news'],
  moderator: [],
  data_editor: [],
  media_partner: [],
  admin: ['community', 'announcement', 'news', 'transfer', 'game', 'tournament', 'app-update'],

  Creator: ['community'],
  Fotograf: ['community'],
  Journalist: ['community', 'news', 'transfer'],
  Verein: ['community', 'announcement', 'transfer'],
  Liga: ['community', 'announcement', 'news'],
  Moderator: [],
  DataEditor: [],
  Media: [],
  Admin: ['community', 'announcement', 'news', 'transfer', 'game', 'tournament', 'app-update'],
};

export const canCreate = (role, contentType) => {
  const slug = getRoleSlug(role);

  return (
    CREATE_PERMISSIONS[slug] ||
    CREATE_PERMISSIONS[role] ||
    []
  ).includes(contentType);
};

export const canEditTeam = (appUser, teamId) => {
  if (!appUser || !teamId) return false;

  const slug = getRoleSlug(appUser.roleSlug || appUser.role);

  if (slug === 'admin') return true;

  return slug === 'club' && appUser.connectedTeamId === teamId;
};

export const canEditLeague = (appUser, leagueId) => {
  if (!appUser || !leagueId) return false;

  const slug = getRoleSlug(appUser.roleSlug || appUser.role);

  if (slug === 'admin') return true;

  return slug === 'league' && appUser.linkedLeagueId === leagueId;
};

export const APPLICANT_ROLES = [
  'journalist',
  'photographer',
  'creator',
  'official_media',
  'club',
  'league',
  'moderator',
  'data_editor',
  'media_partner',

  'Journalist',
  'Fotograf',
  'Creator',
  'Verein',
  'Liga',
  'Moderator',
  'DataEditor',
  'Media',
];