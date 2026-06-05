import { supabase } from './supabaseClient';

const STORAGE_BUCKET = 'yardline-media';

const ENTITY_TABLES = {
  AppUser: 'app_users',
  ClubFollow: 'club_follows',
  Comment: 'comments',
  Follow: 'follows',
  League: 'leagues',
  LeagueFollow: 'league_follows',
  LegalPage: 'legal_pages',
  Like: 'likes',
  ModerationLog: 'moderation_logs',
  Notification: 'notifications',
  NotificationSettings: 'notification_settings',
  RoleApplication: 'role_applications',
  StandingsConfig: 'standings_configs',
  SupportRequest: 'support_requests',
  SupportTicket: 'support_tickets',
  Team: 'teams',
  Game: 'games',
  Post: 'posts',
  Partner: 'partners',
  Tournament: 'tournaments',
  AppUpdate: 'app_updates',
};

const EMPTY_ENTITY_NAMES = [
  'Club',
  'Role',
  'User',
];

const OMIT_FIELDS = {
  AppUser: new Set([
    'bannedUntil',
    'createdByAdminId',
    'deleteAfterUtc',
    'deletionRequested',
    'deletionRequestedAtUtc',
    'deletionStatus',
    'followersCount',
    'followingCount',
    'moderationNote',
    'needsOnboarding',
    'roleId',
    'usernameChangeHistory',
    'warningsCount',
  ]),
  AppUpdate: new Set(['showAsPopup']),
  Post: new Set(['authorId']),
};

const FIELD_TO_COLUMN = {
  AppUser: {
    internalUsername: 'internal_username',
    internalPassword: 'password_hash',
    isInternalUser: 'is_internal_user',
    displayName: 'display_name',
    roleSlug: 'role_slug',
    isOwner: 'is_owner',
    connectedTeamId: 'connected_team_id',
    connectedClubId: 'connected_team_id',
    linkedClubId: 'connected_team_id',
    linkedLeagueId: 'linked_league_id',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  League: {
    shortName: 'short_name',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    accentColor: 'accent_color',
    regionState: 'region_state',
    tierLabel: 'tier_label',
    isEuropeanLeague: 'is_european_league',
    groupsEnabled: 'groups_enabled',
    publicTableMode: 'public_table_mode',
    showOverallStandingsPublic: 'show_overall_standings_public',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  ClubFollow: {
    gameId: 'game_id',
    leagueId: 'league_id',
    homeTeamId: 'home_team_id',
    awayTeamId: 'away_team_id',
    homeTeamNameSnapshot: 'home_team_name_snapshot',
    awayTeamNameSnapshot: 'away_team_name_snapshot',
    homeStats: 'home_stats',
    awayStats: 'away_stats',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  Comment: {
    postId: 'post_id',
    authorId: 'author_id',
    isDeleted: 'is_deleted',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  Follow: {
    followerId: 'follower_id',
    targetId: 'target_id',
    targetType: 'target_type',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  LeagueFollow: {
    userId: 'user_id',
    leagueId: 'league_id',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  LegalPage: {
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  Like: {
    postId: 'post_id',
    userId: 'user_id',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  ModerationLog: {
    targetUserId: 'target_user_id',
    targetType: 'target_type',
    targetId: 'target_id',
    moderatorId: 'moderator_id',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  Notification: {
    userId: 'user_id',
    targetId: 'target_id',
    targetType: 'target_type',
    imageUrl: 'image_url',
    iconType: 'icon_type',
    isRead: 'is_read',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  NotificationSettings: {
    userId: 'user_id',
    announcementsEnabled: 'announcements_enabled',
    finalScoresEnabled: 'final_scores_enabled',
    gameRemindersEnabled: 'game_reminders_enabled',
    newsEnabled: 'news_enabled',
    pushEnabled: 'push_enabled',
    transfersEnabled: 'transfers_enabled',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  RoleApplication: {
    userId: 'user_id',
    roleSlug: 'role_slug',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  StandingsConfig: {
    leagueId: 'league_id',
    groupId: 'group_id',
    publicTableMode: 'public_table_mode',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  SupportRequest: {
    userId: 'user_id',
    requestedByRole: 'requested_by_role',
    requestedTeamId: 'requested_team_id',
    requestedLeagueId: 'requested_league_id',
    reviewedBy: 'reviewed_by',
    reviewedAt: 'reviewed_at',
    reviewNote: 'review_note',
    providerName: 'provider_name',
    providerLogo: 'provider_logo',
    providerWebsite: 'provider_website',
    providerDescription: 'provider_description',
    providerSortOrder: 'provider_sort_order',
    providerIsActive: 'provider_is_active',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  SupportTicket: {
    userId: 'user_id',
    targetId: 'target_id',
    targetType: 'target_type',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
    created_date: 'created_at',
    updated_date: 'updated_at',
  },
  Team: {
    shortName: 'short_name',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    leagueId: 'league_id',
    groupId: 'group_id',
    stadiumAddress: 'stadium_address',
    streamUrl: 'stream_url',
    contactEmail: 'contact_email',
    foundedYear: 'founded_year',
    withdrawnBeforeSeason: 'withdrawn_before_season',
    linkedUserId: 'linked_user_id',
    assignedUserId: 'assigned_user_id',
    managedByUserId: 'managed_by_user_id',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  Game: {
    leagueId: 'league_id',
    groupId: 'group_id',
    homeTeamId: 'home_team_id',
    awayTeamId: 'away_team_id',
    homeTeamPlaceholder: 'home_team_placeholder',
    awayTeamPlaceholder: 'away_team_placeholder',
    kickoffTime: 'kickoff_time',
    kickoffAt: 'kickoff_at',
    scoreHome: 'score_home',
    scoreAway: 'score_away',
    stadiumAddress: 'stadium_address',
    streamUrl: 'stream_url',
    streamLinks: 'stream_links',
    refereeCrew: 'referee_crew',
    competitionId: 'competition_id',
    tournamentId: 'tournament_id',
    roundName: 'round_name',
    isCompetitionGame: 'is_competition_game',
    isGameOfTheWeek: 'is_game_of_the_week',
    gameOfTheWeekLabel: 'game_of_the_week_label',
    gameOfTheWeekSelectedBy: 'game_of_the_week_selected_by',
    gameOfTheWeekSelectedAtUtc: 'game_of_the_week_selected_at_utc',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  Post: {
    sourceType: 'source_type',
    authorId: 'author_id',
    authorUsername: 'author_username',
    authorAvatar: 'author_avatar',
    authorVerified: 'author_verified',
    authorRole: 'author_role',
    authorRoleSlug: 'author_role_slug',
    videoUrl: 'video_url',
    leagueId: 'league_id',
    teamIds: 'team_ids',
    teamId: 'team_id',
    clubId: 'club_id',
    connectedTeamId: 'connected_team_id',
    gameId: 'game_id',
    isGameReport: 'is_game_report',
    publishedAtUtc: 'published_at_utc',
    likesCount: 'likes_count',
    commentsCount: 'comments_count',
    isHidden: 'is_hidden',
    isDeleted: 'is_deleted',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  Partner: {
    logoUrl: 'logo_url',
    linkUrl: 'link_url',
    sortOrder: 'sort_order',
    isPartnerClub: 'is_partner_club',
    connectedTeamId: 'connected_team_id',
    teamId: 'connected_team_id',
    partnerStatus: 'partner_status',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  Tournament: {
    leagueId: 'league_id',
    qualificationDescription: 'qualification_description',
    startDate: 'start_date',
    endDate: 'end_date',
    isActive: 'is_active',
    isPublished: 'is_published',
    teamIds: 'team_ids',
    gameIds: 'game_ids',
    publicDisplaySettings: 'public_display_settings',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
  AppUpdate: {
    imageUrl: 'image_url',
    isActive: 'is_active',
    publishedAtUtc: 'published_at_utc',
    created_date: 'created_at',
    createdAtUtc: 'created_at',
    updatedAtUtc: 'updated_at',
  },
};

const COLUMN_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_COLUMN).map(([entity, mapping]) => [
    entity,
    Object.fromEntries(Object.entries(mapping).map(([field, column]) => [column, field])),
  ])
);

function getTable(entityName) {
  const table = ENTITY_TABLES[entityName];
  if (!table) throw new Error(`Unknown Yardline entity: ${entityName}`);
  return table;
}

function toColumn(entityName, field) {
  return FIELD_TO_COLUMN[entityName]?.[field] || field;
}

function toField(entityName, column) {
  return COLUMN_TO_FIELD[entityName]?.[column] || column;
}

function toDbPayload(entityName, data = {}) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([field, value]) => value !== undefined && !OMIT_FIELDS[entityName]?.has(field))
      .map(([field, value]) => [toColumn(entityName, field), value])
  );
}

function fromDbRow(entityName, row) {
  if (!row) return row;

  const item = Object.fromEntries(
    Object.entries(row).map(([column, value]) => [toField(entityName, column), value])
  );

  item.created_date = row.created_at || item.created_date;
  item.updated_date = row.updated_at || item.updated_date;

  return item;
}

function parseSort(entityName, sort) {
  if (!sort) return { column: 'created_at', ascending: false };

  const raw = String(sort);
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;

  return {
    column: toColumn(entityName, field),
    ascending: !descending,
  };
}

function createEntityApi(entityName) {
  const table = getTable(entityName);

  return {
    async list(sort, limit) {
      const { column, ascending } = parseSort(entityName, sort);
      let query = supabase.from(table).select('*').order(column, { ascending });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(row => fromDbRow(entityName, row));
    },

    async filter(filter = {}) {
      let query = supabase.from(table).select('*');

      Object.entries(filter).forEach(([field, value]) => {
        query = query.eq(toColumn(entityName, field), value);
      });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(row => fromDbRow(entityName, row));
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return fromDbRow(entityName, data);
    },

    async create(data) {
      const { data: created, error } = await supabase
        .from(table)
        .insert(toDbPayload(entityName, data))
        .select()
        .single();

      if (error) throw error;
      return fromDbRow(entityName, created);
    },

    async update(id, data) {
      const { data: updated, error } = await supabase
        .from(table)
        .update(toDbPayload(entityName, data))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return fromDbRow(entityName, updated);
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },

    subscribe() {
      return () => {};
    },
  };
}

function createEmptyEntityApi() {
  return {
    async list() {
      return [];
    },
    async filter() {
      return [];
    },
    async get() {
      return null;
    },
    async create(data) {
      return { id: crypto.randomUUID(), ...data };
    },
    async update(id, data) {
      return { id, ...data };
    },
    async delete(id) {
      return { id };
    },
    subscribe() {
      return () => {};
    },
  };
}

function slugifyFileName(value) {
  return String(value || 'upload')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function getFileExtension(file) {
  const nameExtension = file?.name?.split('.').pop();

  if (nameExtension && nameExtension !== file.name) {
    return nameExtension.toLowerCase();
  }

  const mimeExtension = String(file?.type || '').split('/').pop();
  return mimeExtension && mimeExtension !== 'octet-stream' ? mimeExtension : 'bin';
}

function buildStoragePath(file) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const extension = getFileExtension(file);
  const cleanName = slugifyFileName(file?.name || `upload.${extension}`);
  const baseName = cleanName.includes('.') ? cleanName : `${cleanName}.${extension}`;
  const uniqueId = crypto.randomUUID();

  return `uploads/${year}/${month}/${uniqueId}-${baseName}`;
}

async function uploadFileToStorage(file) {
  if (!file) {
    throw new Error('Keine Datei zum Hochladen ausgewählt.');
  }

  const filePath = buildStoragePath(file);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Datei konnte nicht hochgeladen werden.');
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return {
    file_url: data.publicUrl,
    url: data.publicUrl,
    path: filePath,
  };
}

const entityApis = {
  ...Object.fromEntries(
    Object.keys(ENTITY_TABLES).map(entityName => [entityName, createEntityApi(entityName)])
  ),
  ...Object.fromEntries(
    EMPTY_ENTITY_NAMES.map(entityName => [entityName, createEmptyEntityApi()])
  ),
};

export const yardline = {
  entities: entityApis,
  auth: {
    async me() {
      throw Object.assign(new Error('Not authenticated'), { status: 401 });
    },
    async logout(redirectTo) {
      await supabase.auth.signOut();
      if (redirectTo) window.location.href = redirectTo;
    },
    redirectToLogin(redirectTo = '/') {
      window.location.href = redirectTo;
    },
    async isAuthenticated() {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    },
  },
  functions: {
    async invoke(name) {
      console.warn(`Function ${name} is not available in the Supabase adapter.`);
      return null;
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file } = {}) {
        return uploadFileToStorage(file);
      },
    },
  },
};
