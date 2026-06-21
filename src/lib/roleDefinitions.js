export const ROLE_SLUGS = {
  FAN: "fan",
  ADMIN: "admin",
  GOTW: "gotw",
  PHOTOGRAPHER: "photographer",
  PODCAST: "podcast",
  NEWS: "news",
  DATA_EDITOR: "data_editor",
};

export const ROLES = {
  FAN: "Nutzer",
  ADMIN: "Admin",
  GOTW: "GOTW",
  PHOTOGRAPHER: "Fotograf",
  PODCAST: "Podcast",
  NEWS: "News",
  DATA_EDITOR: "Dateneditor",
};

export const ROLE_LABELS = {
  fan: "Nutzer",
  admin: "Admin",
  gotw: "GOTW",
  photographer: "Fotograf",
  podcast: "Podcast",
  news: "News",
  data_editor: "Dateneditor",

  Nutzer: "Nutzer",
  Fan: "Nutzer",
  Admin: "Admin",
  GOTW: "GOTW",
  Media: "GOTW",
  Fotograf: "Fotograf",
  Podcast: "Podcast",
  News: "News",
};

export const INTERNAL_ROLE_SLUGS = ["admin", "gotw", "photographer", "podcast", "news", "data_editor"];
export const ADMIN_ROLE_SLUGS = ["admin"];
export const GAME_OF_WEEK_ROLE_SLUGS = ["gotw", "admin"];
export const PHOTOGRAPHER_ROLE_SLUGS = ["photographer", "admin"];
export const PODCAST_ROLE_SLUGS = ["podcast", "admin"];
export const NEWS_ROLE_SLUGS = ["news", "admin"];

export const getRoleSlug = role => {
  if (!role) return "fan";

  const normalized = String(role)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const legacyMap = {
    fan: "fan",
    nutzer: "fan",
    user: "fan",

    admin: "admin",
    owner: "admin",

    gotw: "gotw",
    game_of_the_week: "gotw",
    gameoftheweek: "gotw",
    media: "gotw",
    media_partner: "gotw",
    medienpartner: "gotw",
    eurofbshow: "gotw",
    euro_fb_show: "gotw",
    eurofb: "gotw",

    photographer: "photographer",
    fotograf: "photographer",
    gameday_shots: "photographer",
    gameday_photographer: "photographer",

    podcast: "podcast",
    podcast_partner: "podcast",
    football_germany: "podcast",
    footballgermany: "podcast",

    news: "news",
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
    offizielle_medien: "fan",
    organisation: "fan",
  };

  return legacyMap[normalized] || normalized;
};

export const getRoleDisplayLabel = role => ROLE_LABELS[getRoleSlug(role)] || "Nutzer";

export const isAdminBySlug = slug => ADMIN_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isGameOfWeekEditorBySlug = slug => GAME_OF_WEEK_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isPhotographerBySlug = slug => PHOTOGRAPHER_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isPodcastPartnerBySlug = slug => PODCAST_ROLE_SLUGS.includes(getRoleSlug(slug));
export const isNewsEditorBySlug = slug => NEWS_ROLE_SLUGS.includes(getRoleSlug(slug));

export const isAdmin = role => isAdminBySlug(role);
export const isGameOfWeekEditor = role => isGameOfWeekEditorBySlug(role);
export const isPhotographer = role => isPhotographerBySlug(role);
export const isPodcastPartner = role => isPodcastPartnerBySlug(role);
export const isNewsEditor = role => isNewsEditorBySlug(role);

export const isDataEditorBySlug = slug => getRoleSlug(slug) === "data_editor";
export const isModeratorBySlug = () => false;
export const isProfessionalBySlug = slug => getRoleSlug(slug) === "photographer";
export const isOrganizationBySlug = () => false;
export const isVolunteerBySlug = () => false;

export const isDataEditor = role => isDataEditorBySlug(role);
export const isModerator = () => false;
export const isProfessional = role => isProfessionalBySlug(role);
export const isOrganization = () => false;
export const isVolunteer = () => false;

export const showBadge = role => {
  return ["admin", "gotw", "photographer", "podcast", "news", "data_editor"].includes(getRoleSlug(role));
};

export const CREATE_PERMISSIONS = {
  fan: [],
  admin: [],
  gotw: [],
  photographer: ["gameday-shot"],
  podcast: ["podcast"],
  news: ["news", "transfer"],
  data_editor: [],
};

export const canCreate = (role, contentType) => {
  const slug = getRoleSlug(role);
  return (CREATE_PERMISSIONS[slug] || []).includes(contentType);
};

export const canEditTeam = appUser => getRoleSlug(appUser?.roleSlug || appUser?.role) === "admin";
export const canEditLeague = appUser => getRoleSlug(appUser?.roleSlug || appUser?.role) === "admin";

export const APPLICANT_ROLES = [];
