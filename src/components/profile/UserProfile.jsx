import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { useAppUser } from '@/lib/useAppUser';
import {
  getRoleSlug,
  isAdminBySlug,
  isDataEditorBySlug,
} from '@/lib/roleDefinitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Shield,
  Swords,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_TEAM_STATS = {
  firstDowns: '',
  passingYards: '',
  rushingYards: '',
  totalYards: '',
  turnovers: '',
  penalties: '',
  penaltyYards: '',
};

const EMPTY_PASSING_LEADER = {
  player: '',
  completions: '',
  attempts: '',
  yards: '',
  touchdowns: '',
  interceptions: '',
};

const EMPTY_RUSHING_LEADER = {
  player: '',
  attempts: '',
  yards: '',
  touchdowns: '',
};

const EMPTY_RECEIVING_LEADER = {
  player: '',
  receptions: '',
  yards: '',
  touchdowns: '',
};

const EMPTY_DEFENSE_LEADER = {
  player: '',
  tackles: '',
  sacks: '',
  interceptions: '',
};

const EMPTY_STATS = {
  source: '',
  status: 'published',
  homeStats: { ...EMPTY_TEAM_STATS },
  awayStats: { ...EMPTY_TEAM_STATS },
  leaders: {
    passing: {
      home: { ...EMPTY_PASSING_LEADER },
      away: { ...EMPTY_PASSING_LEADER },
    },
    rushing: {
      home: { ...EMPTY_RUSHING_LEADER },
      away: { ...EMPTY_RUSHING_LEADER },
    },
    receiving: {
      home: { ...EMPTY_RECEIVING_LEADER },
      away: { ...EMPTY_RECEIVING_LEADER },
    },
    defense: {
      home: { ...EMPTY_DEFENSE_LEADER },
      away: { ...EMPTY_DEFENSE_LEADER },
    },
  },
};

function getGameDateTime(game) {
  return `${game?.date || ''} ${game?.time || game?.kickoffTime || ''}`.trim();
}

function formatDate(date) {
  if (!date) return 'ohne Datum';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || 'Teilnehmer offen';
}

function cleanNumber(value) {
  if (value === '' || value === null || value === undefined) return '';

  const number = Number(value);
  return Number.isNaN(number) ? '' : number;
}

function getGameStatisticEntity() {
  return base44.entities.ClubFollow || null;
}

function requireGameStatisticEntity() {
  const entity = getGameStatisticEntity();

  if (!entity) {
    throw new Error('ClubFollow Entity wurde nicht gefunden.');
  }

  return entity;
}

function isGameStatisticRecord(item) {
  return item?.type === 'game_statistic' || item?.statType === 'game_statistic';
}

function getStatisticUpdatedTime(item) {
  const value =
    item?.updatedAtUtc ||
    item?.updated_at ||
    item?.updatedAt ||
    item?.createdAtUtc ||
    item?.created_at ||
    item?.createdAt ||
    '';

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getLatestStatistic(items = []) {
  return [...items]
    .filter(isGameStatisticRecord)
    .sort((a, b) => getStatisticUpdatedTime(b) - getStatisticUpdatedTime(a))[0] || null;
}

function buildStatsByGameId(statistics = []) {
  return statistics
    .filter(isGameStatisticRecord)
    .reduce((map, stat) => {
      if (!stat.gameId) return map;

      const current = map.get(stat.gameId);
      if (!current || getStatisticUpdatedTime(stat) > getStatisticUpdatedTime(current)) {
        map.set(stat.gameId, stat);
      }

      return map;
    }, new Map());
}

function getCalculatedTotalYards(stats) {
  const passing = cleanNumber(stats?.passingYards);
  const rushing = cleanNumber(stats?.rushingYards);

  if (passing === '' && rushing === '') return '';

  return Number(passing || 0) + Number(rushing || 0);
}

function normalizeTeamStats(stats = {}) {
  const normalized = {
    ...EMPTY_TEAM_STATS,
    ...stats,
    firstDowns: stats.firstDowns ?? '',
    passingYards: stats.passingYards ?? '',
    rushingYards: stats.rushingYards ?? '',
    totalYards: stats.totalYards ?? '',
    turnovers: stats.turnovers ?? '',
    penalties: stats.penalties ?? '',
    penaltyYards: stats.penaltyYards ?? '',
  };

  const calculatedTotal = getCalculatedTotalYards(normalized);

  return {
    ...normalized,
    totalYards: calculatedTotal === '' ? normalized.totalYards : calculatedTotal,
  };
}

function normalizeLeaderSide(side = {}, emptyShape) {
  return {
    ...emptyShape,
    ...side,
    player: side.player || side.name || '',
  };
}

function createEmptyStats() {
  return JSON.parse(JSON.stringify(EMPTY_STATS));
}

function normalizeStatistic(stat) {
  if (!stat) return createEmptyStats();

  return {
    ...EMPTY_STATS,
    ...stat,
    source: stat.source || '',
    status: stat.status || 'published',
    homeStats: normalizeTeamStats(stat.homeStats || {}),
    awayStats: normalizeTeamStats(stat.awayStats || {}),
    leaders: {
      passing: {
        home: normalizeLeaderSide(stat.leaders?.passing?.home, EMPTY_PASSING_LEADER),
        away: normalizeLeaderSide(stat.leaders?.passing?.away, EMPTY_PASSING_LEADER),
      },
      rushing: {
        home: normalizeLeaderSide(stat.leaders?.rushing?.home, EMPTY_RUSHING_LEADER),
        away: normalizeLeaderSide(stat.leaders?.rushing?.away, EMPTY_RUSHING_LEADER),
      },
      receiving: {
        home: normalizeLeaderSide(stat.leaders?.receiving?.home, EMPTY_RECEIVING_LEADER),
        away: normalizeLeaderSide(stat.leaders?.receiving?.away, EMPTY_RECEIVING_LEADER),
      },
      defense: {
        home: normalizeLeaderSide(stat.leaders?.defense?.home, EMPTY_DEFENSE_LEADER),
        away: normalizeLeaderSide(stat.leaders?.defense?.away, EMPTY_DEFENSE_LEADER),
      },
    },
  };
}

function buildTeamPayload(stats) {
  const totalYards = getCalculatedTotalYards(stats);

  return {
    firstDowns: cleanNumber(stats.firstDowns),
    passingYards: cleanNumber(stats.passingYards),
    rushingYards: cleanNumber(stats.rushingYards),
    totalYards: cleanNumber(totalYards),
    turnovers: cleanNumber(stats.turnovers),
    penalties: cleanNumber(stats.penalties),
    penaltyYards: cleanNumber(stats.penaltyYards),
  };
}

function buildLeaderPayload(side, fields) {
  return fields.reduce(
    (payload, field) => ({
      ...payload,
      [field.key]: field.key === 'player'
        ? String(side[field.key] || '').trim()
        : cleanNumber(side[field.key]),
    }),
    {},
  );
}

const PASSING_FIELDS = [
  { key: 'player', label: 'Spieler', type: 'text', placeholder: 'QB Name' },
  { key: 'completions', label: 'Comp' },
  { key: 'attempts', label: 'Att' },
  { key: 'yards', label: 'Yards' },
  { key: 'touchdowns', label: 'TD' },
  { key: 'interceptions', label: 'INT' },
];

const RUSHING_FIELDS = [
  { key: 'player', label: 'Spieler', type: 'text', placeholder: 'RB/QB Name' },
  { key: 'attempts', label: 'Att' },
  { key: 'yards', label: 'Yards' },
  { key: 'touchdowns', label: 'TD' },
];

const RECEIVING_FIELDS = [
  { key: 'player', label: 'Spieler', type: 'text', placeholder: 'WR/TE/RB Name' },
  { key: 'receptions', label: 'Rec' },
  { key: 'yards', label: 'Yards' },
  { key: 'touchdowns', label: 'TD' },
];

const DEFENSE_FIELDS = [
  { key: 'player', label: 'Spieler', type: 'text', placeholder: 'Defender Name' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'sacks', label: 'Sacks' },
  { key: 'interceptions', label: 'INT' },
];

function buildPayload({ form, game, homeTeam, awayTeam }) {
  return {
    gameId: game.id,
    leagueId: game.leagueId || '',
    season: game.season || '',
    homeTeamId: game.homeTeamId || '',
    awayTeamId: game.awayTeamId || '',
    homeStats: buildTeamPayload(form.homeStats),
    awayStats: buildTeamPayload(form.awayStats),
    leaders: {
      passing: {
        home: buildLeaderPayload(form.leaders.passing.home, PASSING_FIELDS),
        away: buildLeaderPayload(form.leaders.passing.away, PASSING_FIELDS),
      },
      rushing: {
        home: buildLeaderPayload(form.leaders.rushing.home, RUSHING_FIELDS),
        away: buildLeaderPayload(form.leaders.rushing.away, RUSHING_FIELDS),
      },
      receiving: {
        home: buildLeaderPayload(form.leaders.receiving.home, RECEIVING_FIELDS),
        away: buildLeaderPayload(form.leaders.receiving.away, RECEIVING_FIELDS),
      },
      defense: {
        home: buildLeaderPayload(form.leaders.defense.home, DEFENSE_FIELDS),
        away: buildLeaderPayload(form.leaders.defense.away, DEFENSE_FIELDS),
      },
    },
    source: form.source.trim(),
    status: form.status || 'published',
    homeTeamNameSnapshot: homeTeam?.name || homeTeam?.shortName || game.homeTeamPlaceholder || '',
    awayTeamNameSnapshot: awayTeam?.name || awayTeam?.shortName || game.awayTeamPlaceholder || '',
    updatedAtUtc: new Date().toISOString(),
  };
}

function StatInput({ label, value, onChange, type = 'number', placeholder = '' }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      <Input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? 'any' : undefined}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </label>
  );
}

function ReadOnlyStat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-lg font-black tabular-nums">
        {value === '' ? '—' : value}
      </p>

      {hint && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function TeamStatsEditor({ title, stats, onChange }) {
  const set = (key, value) => {
    onChange({
      ...stats,
      [key]: value,
    });
  };

  const totalYards = getCalculatedTotalYards(stats);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">
            Team-Statistiken
          </p>

          <h3 className="text-sm font-black mt-0.5">
            {title}
          </h3>
        </div>

        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StatInput
          label="First Downs"
          value={stats.firstDowns}
          onChange={value => set('firstDowns', value)}
        />

        <ReadOnlyStat
          label="Total Yards"
          value={totalYards}
          hint="Pass + Rush"
        />

        <StatInput
          label="Pass-Yards"
          value={stats.passingYards}
          onChange={value => set('passingYards', value)}
        />

        <StatInput
          label="Rush-Yards"
          value={stats.rushingYards}
          onChange={value => set('rushingYards', value)}
        />

        <StatInput
          label="Turnovers"
          value={stats.turnovers}
          onChange={value => set('turnovers', value)}
        />

        <StatInput
          label="Strafen"
          value={stats.penalties}
          onChange={value => set('penalties', value)}
        />

        <div className="sm:col-span-2">
          <StatInput
            label="Straf-Yards"
            value={stats.penaltyYards}
            onChange={value => set('penaltyYards', value)}
          />
        </div>
      </div>
    </div>
  );
}

function LeaderSideEditor({ teamLabel, value, fields, onChange, tone }) {
  const set = (key, nextValue) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <p className={`mb-2 text-[10px] font-black uppercase tracking-wider ${tone}`}>
        {teamLabel}
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map(field => (
          <div key={field.key} className={field.key === 'player' ? 'sm:col-span-2' : ''}>
            <StatInput
              label={field.label}
              type={field.type || 'number'}
              value={value[field.key]}
              onChange={nextValue => set(field.key, nextValue)}
              placeholder={field.placeholder || ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderEditor({ title, description, value, fields, homeTeamName, awayTeamName, onChange }) {
  const setSide = (side, nextValue) => {
    onChange({
      ...value,
      [side]: nextValue,
    });
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-black">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LeaderSideEditor
          teamLabel={homeTeamName}
          value={value.home}
          fields={fields}
          tone="text-primary"
          onChange={nextValue => setSide('home', nextValue)}
        />

        <LeaderSideEditor
          teamLabel={awayTeamName}
          value={value.away}
          fields={fields}
          tone="text-red-400"
          onChange={nextValue => setSide('away', nextValue)}
        />
      </div>
    </div>
  );
}

function GameSelectorCard({ game, home, away, league, selected, onClick, hasStats }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border/50 bg-card hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">
            {league?.shortName || league?.name || 'Keine Liga'}
          </p>

          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDate(game.date)} · {game.time || game.kickoffTime || 'ohne Uhrzeit'}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {hasStats && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              Stats
            </span>
          )}

          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
            Final
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <p className="min-w-0 text-sm font-black leading-tight line-clamp-2 break-words">
          {getTeamName(home, game.homeTeamPlaceholder)}
        </p>

        <p className="text-sm font-black tabular-nums">
          {game.scoreHome ?? 0}:{game.scoreAway ?? 0}
        </p>

        <p className="min-w-0 text-right text-sm font-black leading-tight line-clamp-2 break-words">
          {getTeamName(away, game.awayTeamPlaceholder)}
        </p>
      </div>
    </button>
  );
}

export default function GameStatistics() {
  useSetHeader({
    mode: 'back',
    title: 'Game Statistics',
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');
  const canManageStatistics =
    isAdminBySlug(roleSlug) ||
    isDataEditorBySlug(roleSlug);

  const [selectedGameId, setSelectedGameId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(() => createEmptyStats());

  useEffect(() => {
    if (!appUser) return;

    if (!canManageStatistics) {
      navigate('/', { replace: true });
    }
  }, [appUser, canManageStatistics, navigate]);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['stats-games'],
    queryFn: () => base44.entities.Game.list('-date', 500),
    enabled: canManageStatistics,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['stats-teams'],
    queryFn: () => base44.entities.Team.list('name'),
    enabled: canManageStatistics,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['stats-leagues'],
    queryFn: () => base44.entities.League.list('name'),
    enabled: canManageStatistics,
  });

  const { data: statistics = [], isLoading: statsLoading } = useQuery({
    queryKey: ['game-statistics'],
    queryFn: () => {
      const entity = getGameStatisticEntity();

      if (!entity) {
        return [];
      }

      return entity.list('-updatedAtUtc', 1000).then(items => items.filter(isGameStatisticRecord));
    },
    enabled: canManageStatistics,
  });

  const teamsMap = useMemo(() => {
    return new Map(teams.map(team => [team.id, team]));
  }, [teams]);

  const leaguesMap = useMemo(() => {
    return new Map(leagues.map(league => [league.id, league]));
  }, [leagues]);

  const statsByGameId = useMemo(() => {
    return buildStatsByGameId(statistics);
  }, [statistics]);

  const finalGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...games]
      .filter(game => game.status === 'final')
      .filter(game => {
        if (!normalizedSearch) return true;

        const home = teamsMap.get(game.homeTeamId);
        const away = teamsMap.get(game.awayTeamId);
        const league = leaguesMap.get(game.leagueId);

        const haystack = [
          home?.name,
          home?.shortName,
          away?.name,
          away?.shortName,
          game.homeTeamPlaceholder,
          game.awayTeamPlaceholder,
          league?.name,
          league?.shortName,
          game.date,
          game.time,
          game.venue,
          game.roundName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => getGameDateTime(b).localeCompare(getGameDateTime(a)));
  }, [games, leaguesMap, search, teamsMap]);

  const selectedGame = useMemo(() => {
    return games.find(game => game.id === selectedGameId) || null;
  }, [games, selectedGameId]);

  const selectedStatistic = selectedGameId ? statsByGameId.get(selectedGameId) : null;
  const selectedHome = selectedGame ? teamsMap.get(selectedGame.homeTeamId) : null;
  const selectedAway = selectedGame ? teamsMap.get(selectedGame.awayTeamId) : null;
  const selectedLeague = selectedGame ? leaguesMap.get(selectedGame.leagueId) : null;

  const selectedHomeName = getTeamName(selectedHome, selectedGame?.homeTeamPlaceholder);
  const selectedAwayName = getTeamName(selectedAway, selectedGame?.awayTeamPlaceholder);
  const statisticEntityAvailable = Boolean(getGameStatisticEntity());

  useEffect(() => {
    if (!selectedGameId) {
      setForm(createEmptyStats());
      return;
    }

    setForm(normalizeStatistic(selectedStatistic));
  }, [selectedGameId, selectedStatistic]);

  const invalidateStats = () => {
    queryClient.invalidateQueries({ queryKey: ['game-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['game-statistic', selectedGameId] });
  };

  const saveMutation = useMutation({
  mutationFn: async () => {
    if (!selectedGame) {
      throw new Error('Bitte zuerst ein Spiel auswählen.');
    }

    if (!canManageStatistics) {
      throw new Error('Du hast keine Berechtigung für Game Statistics.');
    }

    const entity = requireGameStatisticEntity();

    const payload = {
      ...buildPayload({
        form,
        game: selectedGame,
        homeTeam: selectedHome,
        awayTeam: selectedAway,
      }),
      type: 'game_statistic',
      statType: 'game_statistic',
      clubId: selectedGame.id,
      userId: 'game_statistics',
    };

    const existingStats = await entity.filter({ gameId: selectedGame.id });
    const existingStat = getLatestStatistic(existingStats || []);

    if (existingStat?.id) {
      return entity.update(existingStat.id, payload);
    }

    return entity.create({
      ...payload,
      createdAtUtc: new Date().toISOString(),
    });
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['game-statistics'] });
    await queryClient.invalidateQueries({ queryKey: ['game-statistic', selectedGameId] });

    toast.success('Game Statistics gespeichert');
  },
  onError: error => {
    console.error('Game Statistics save failed:', error);
    toast.error(error.message || 'Statistiken konnten nicht gespeichert werden');
  },
});

  const resetForm = () => {
    if (selectedStatistic) {
      setForm(normalizeStatistic(selectedStatistic));
      return;
    }

    setForm(createEmptyStats());
  };

  const handleGameSelect = gameId => {
    setSelectedGameId(gameId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!appUser) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageStatistics) {
    return null;
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-blue-950/60 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              The Yardline
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              Game Statistics
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Saubere Eingabe für die wichtigsten Team-Statistiken und Game Leaders. Feste Felder für die wichtigsten Football-Statistiken: Team Stats, Passing, Rushing, Receiving und Defense.
            </p>
          </div>
        </div>
      </section>

      {!statisticEntityAvailable && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 mb-5">
          <p className="text-sm font-black text-red-300">
            GameStatistic Entity nicht gefunden
          </p>

          <p className="text-xs text-red-100/80 mt-1 leading-relaxed">
  Game Statistics werden aktuell in ClubFollow gespeichert. Speichern funktioniert nur, wenn ClubFollow verfügbar ist.
</p>
        </section>
      )}

      {selectedGame && (
        <section className="rounded-2xl border border-border/50 bg-card p-4 mb-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                Ausgewähltes Spiel
              </p>

              <h2 className="mt-1 text-lg font-black leading-tight line-clamp-2 break-words">
                {selectedHomeName}
                {' '}
                vs
                {' '}
                {selectedAwayName}
              </h2>

              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
                {selectedLeague?.shortName || selectedLeague?.name || 'Keine Liga'} · {formatDate(selectedGame.date)}
              </p>
            </div>

            {selectedStatistic?.id && (
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 flex-shrink-0">
                Stats vorhanden
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3 mb-4">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Eingabe bewusst reduziert: First Downs, Passing/Rushing/Total Yards, Turnovers, Penalties und Penalty Yards. Bei den Game Leaders werden nur die gängigsten Boxscore-Felder gepflegt, damit die Eingabe auch für deutsche/lokale Football-Spiele realistisch bleibt.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <TeamStatsEditor
              title={selectedHomeName}
              stats={form.homeStats}
              onChange={value => setForm(current => ({ ...current, homeStats: value }))}
            />

            <TeamStatsEditor
              title={selectedAwayName}
              stats={form.awayStats}
              onChange={value => setForm(current => ({ ...current, awayStats: value }))}
            />
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-black">
                Game Leaders
              </h2>
            </div>

            <LeaderEditor
              title="Passing Leader / QB"
              description="QB oder bester Passer: completions, attempts, yards, touchdowns und interceptions."
              value={form.leaders.passing}
              fields={PASSING_FIELDS}
              homeTeamName={selectedHomeName}
              awayTeamName={selectedAwayName}
              onChange={value => setForm(current => ({
                ...current,
                leaders: {
                  ...current.leaders,
                  passing: value,
                },
              }))}
            />

            <LeaderEditor
              title="Rushing Leader"
              description="Bester Läufer: attempts, rushing yards und rushing touchdowns."
              value={form.leaders.rushing}
              fields={RUSHING_FIELDS}
              homeTeamName={selectedHomeName}
              awayTeamName={selectedAwayName}
              onChange={value => setForm(current => ({
                ...current,
                leaders: {
                  ...current.leaders,
                  rushing: value,
                },
              }))}
            />

            <LeaderEditor
              title="Receiving Leader"
              description="Bester Receiver: receptions, receiving yards und receiving touchdowns."
              value={form.leaders.receiving}
              fields={RECEIVING_FIELDS}
              homeTeamName={selectedHomeName}
              awayTeamName={selectedAwayName}
              onChange={value => setForm(current => ({
                ...current,
                leaders: {
                  ...current.leaders,
                  receiving: value,
                },
              }))}
            />

            <LeaderEditor
              title="Defense Leader"
              description="Bester Defense-Spieler: tackles, sacks und interceptions."
              value={form.leaders.defense}
              fields={DEFENSE_FIELDS}
              homeTeamName={selectedHomeName}
              awayTeamName={selectedAwayName}
              onChange={value => setForm(current => ({
                ...current,
                leaders: {
                  ...current.leaders,
                  defense: value,
                },
              }))}
            />
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quelle
                </span>

                <Input
                  value={form.source}
                  onChange={event => setForm(current => ({ ...current, source: event.target.value }))}
                  placeholder="z.B. offizieller Gamebook / Team / Liga"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={event => setForm(current => ({ ...current, status: event.target.value }))}
                  className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="published">Veröffentlicht</option>
                  <option value="draft">Entwurf</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={saveMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Zurücksetzen
            </Button>

            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !statisticEntityAvailable || !selectedGame}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Speichern
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Swords className="w-4 h-4 text-primary" />

          <h2 className="text-sm font-black">
            Finale Spiele auswählen
          </h2>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Spiel, Team, Liga, Datum suchen..."
            className="pl-9"
          />
        </div>

        {gamesLoading || statsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : finalGames.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-background/40 py-10 text-center">
            <p className="text-sm font-bold">
              Keine finalen Spiele gefunden.
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Statistiken können erst für finale Spiele gepflegt werden.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {finalGames.map(game => {
              const home = teamsMap.get(game.homeTeamId);
              const away = teamsMap.get(game.awayTeamId);
              const league = leaguesMap.get(game.leagueId);
              const hasStats = statsByGameId.has(game.id);

              return (
                <GameSelectorCard
                  key={game.id}
                  game={game}
                  home={home}
                  away={away}
                  league={league}
                  selected={selectedGameId === game.id}
                  hasStats={hasStats}
                  onClick={() => handleGameSelect(game.id)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
