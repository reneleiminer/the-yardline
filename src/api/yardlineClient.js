import { supabase } from './supabaseClient';

const ENTITY_TABLES = {
  AppUser: 'app_users',
  League: 'leagues',
  Team: 'teams',
  Game: 'games',
  Post: 'posts',
  Partner: 'partners',
  Tournament: 'tournaments',
  AppUpdate: 'app_updates',
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
      .filter(([, value]) => value !== undefined)
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
  };
}

export const yardline = {
  entities: Object.fromEntries(
    Object.keys(ENTITY_TABLES).map(entityName => [entityName, createEntityApi(entityName)])
  ),
  auth: supabase.auth,
};
