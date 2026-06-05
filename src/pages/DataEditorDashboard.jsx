import React, { useMemo, useState } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Radio,
  Save,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { toast } from 'sonner';
const EMPTY_GAME = {
  leagueId: '',
  homeTeamId: '',
  awayTeamId: '',
  homeTeamPlaceholder: '',
  awayTeamPlaceholder: '',
  date: '',
  time: '',
  venue: '',
  city: '',
  status: 'scheduled',
  scoreHome: 0,
  scoreAway: 0,
  streamUrl: '',
  streamEnabled: false,
  streamStatus: 'approved',
  streamLinks: [],
  predictionEnabled: true,
  roundName: '',
  notes: '',
};

const STATUS_LABELS = {
  scheduled: 'Geplant',
  live: 'Live',
  final: 'Final',
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Geplant';
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

function isTodayGame(game) {
  if (!game.date) return false;

  const today = new Date();
  const date = new Date(game.date);

  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
}

function buildKickoffAt(date, time) {
  if (!date || !time) return '';

  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  if (!year || !month || !day) return '';

  return new Date(
    year,
    month - 1,
    day,
    hours || 0,
    minutes || 0,
    0,
    0
  ).toISOString();
}

function buildStreamLinks(form) {
  if (!form.streamUrl?.trim()) return [];

  return [
    {
      id: `stream_${Date.now()}`,
      label: 'Stream',
      url: form.streamUrl.trim(),
      providerId: '',
      providerName: '',
      providerLogo: '',
      platform: '',
      status: form.streamStatus || 'approved',
      enabled: form.streamEnabled !== false,
      submittedByRole: 'data_editor',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    },
  ];
}

function StatTile({ icon: Icon, label, value, tone = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <Card className="p-3">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${tone}`} />
      </div>

      <div className="text-xl font-black">
        {value}
      </div>

      <div className="text-[10px] text-muted-foreground font-semibold">
        {label}
      </div>
    </Card>
  );
}

function DataAreaCard({ icon: Icon, title, description, badge }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold truncate">
              {title}
            </h2>

            {badge && (
              <Badge className="text-[10px] bg-secondary text-muted-foreground border-0">
                {badge}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

function GameForm({ form, teams, leagues, onChange, onSave, onCancel, saving, title }) {
  const leagueTeams = form.leagueId
    ? teams.filter(team => team.leagueId === form.leagueId)
    : teams;

  const set = (key, value) => {
    onChange(current => ({
      ...current,
      [key]: value,
    }));
  };

  const handleLeagueChange = value => {
    onChange(current => ({
      ...current,
      leagueId: value,
      homeTeamId: '',
      awayTeamId: '',
    }));
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold">
            {title}
          </h2>

          <p className="text-xs text-muted-foreground mt-0.5">
            Spielplan, Ergebnis, Streamdaten und Tippspiel pflegen
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <select
          value={form.leagueId}
          onChange={event => handleLeagueChange(event.target.value)}
          className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
        >
          <option value="">Liga wählen</option>
          {leagues.map(league => (
            <option key={league.id} value={league.id}>
              {league.shortName || league.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={form.homeTeamId}
            onChange={event => set('homeTeamId', event.target.value)}
            className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
          >
            <option value="">Heimteam wählen</option>
            {leagueTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <select
            value={form.awayTeamId}
            onChange={event => set('awayTeamId', event.target.value)}
            className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
          >
            <option value="">Gastteam wählen</option>
            {leagueTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Heimteam-Name optional"
            value={form.homeTeamPlaceholder}
            onChange={event => set('homeTeamPlaceholder', event.target.value)}
          />

          <Input
            placeholder="Gastteam-Name optional"
            value={form.awayTeamPlaceholder}
            onChange={event => set('awayTeamPlaceholder', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={form.date}
            onChange={event => set('date', event.target.value)}
          />

          <Input
            type="time"
            value={form.time}
            onChange={event => set('time', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Stadion / Venue"
            value={form.venue}
            onChange={event => set('venue', event.target.value)}
          />

          <Input
            placeholder="Stadt"
            value={form.city}
            onChange={event => set('city', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={form.status}
            onChange={event => set('status', event.target.value)}
            className="w-full h-10 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
          >
            <option value="scheduled">Geplant</option>
            <option value="live">Live</option>
            <option value="final">Final</option>
          </select>

          <Input
            type="number"
            placeholder="Heim-Punkte"
            value={form.scoreHome}
            onChange={event => set('scoreHome', event.target.value)}
          />

          <Input
            type="number"
            placeholder="Gast-Punkte"
            value={form.scoreAway}
            onChange={event => set('scoreAway', event.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">
              Stream
            </p>
          </div>

          <Input
            placeholder="Stream-Link optional"
            value={form.streamUrl}
            onChange={event => set('streamUrl', event.target.value)}
          />

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!!form.streamEnabled}
              onChange={event => set('streamEnabled', event.target.checked)}
              className="accent-primary"
            />
            Stream für Nutzer sichtbar machen
          </label>
        </div>

        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">
              Tippspiel
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.predictionEnabled !== false}
              onChange={event => set('predictionEnabled', event.target.checked)}
              className="accent-primary mt-0.5"
            />

            <span>
              Tippspiel für dieses Spiel aktivieren. Nutzer können vor Kickoff einmal auf den Gewinner tippen.
            </span>
          </label>
        </div>

        <Input
          placeholder="Runde / Hinweis optional"
          value={form.roundName}
          onChange={event => set('roundName', event.target.value)}
        />

        <textarea
          placeholder="Notizen optional"
          value={form.notes}
          onChange={event => set('notes', event.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground resize-none"
        />

        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Speichern
        </Button>
      </div>
    </Card>
  );
}

export default function DataEditorDashboard() {
  useSetHeader({
    mode: 'back',
    title: 'Daten bearbeiten',
  });

  const queryClient = useQueryClient();
  const { teams = [], leagues = [] } = useGlobalData();

  const [tab, setTab] = useState('overview');
  const [editingGameId, setEditingGameId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_GAME);
  const [createForm, setCreateForm] = useState(EMPTY_GAME);
  const [saving, setSaving] = useState(false);

  const teamsMap = useMemo(() => {
    return new Map(teams.map(team => [team.id, team]));
  }, [teams]);

  const leaguesMap = useMemo(() => {
    return new Map(leagues.map(league => [league.id, league]));
  }, [leagues]);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['editor-games'],
    queryFn: () => base44.entities.Game.list('-date', 250),
  });

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const dateA = `${a.date || ''} ${a.time || a.kickoffTime || ''}`;
      const dateB = `${b.date || ''} ${b.time || b.kickoffTime || ''}`;

      return dateB.localeCompare(dateA);
    });
  }, [games]);

  const todayGames = sortedGames.filter(game => isTodayGame(game));
  const liveGames = sortedGames.filter(game => game.status === 'live');
  const openGames = sortedGames.filter(game => game.status === 'scheduled' || game.status === 'live');
  const finalGames = sortedGames.filter(game => game.status === 'final');
  const streamGames = sortedGames.filter(game => game.streamUrl || game.streamEnabled || game.streamLinks?.length > 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['editor-games'] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
    queryClient.invalidateQueries({ queryKey: ['standingsConfigs'] });
  };

  const makePayload = form => {
    const streamLinks = buildStreamLinks(form);
    const streamUrl = form.streamUrl?.trim() || '';

    return {
      leagueId: form.leagueId || '',
      homeTeamId: form.homeTeamId || '',
      awayTeamId: form.awayTeamId || '',
      homeTeamPlaceholder: form.homeTeamPlaceholder || '',
      awayTeamPlaceholder: form.awayTeamPlaceholder || '',
      teamsResolved: !!form.homeTeamId && !!form.awayTeamId,

      date: form.date || '',
      time: form.time || '',
      kickoffTime: form.time || '',
      kickoffAt: buildKickoffAt(form.date, form.time),

      venue: form.venue || '',
      city: form.city || '',
      status: form.status || 'scheduled',
      scoreHome: Number(form.scoreHome || 0),
      scoreAway: Number(form.scoreAway || 0),

      predictionEnabled: form.predictionEnabled !== false,

      streamUrl,
      streamEnabled: !!streamUrl && !!form.streamEnabled,
      streamStatus: form.streamStatus || 'approved',
      streamLinks,
      streamUpdatedAt: streamUrl ? new Date().toISOString() : '',

      roundName: form.roundName || '',
      notes: form.notes || '',
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const startEdit = game => {
    setEditingGameId(game.id);
    setEditForm({
      ...EMPTY_GAME,
      ...game,
      time: game.time || game.kickoffTime || '',
      scoreHome: game.scoreHome ?? 0,
      scoreAway: game.scoreAway ?? 0,
      streamUrl: game.streamUrl || game.streamLinks?.[0]?.url || '',
      streamEnabled: !!game.streamEnabled || !!game.streamUrl,
      predictionEnabled: game.predictionEnabled !== false,
    });
  };

  const cancelEdit = () => {
    setEditingGameId(null);
    setEditForm(EMPTY_GAME);
  };

const validateGameForm = form => {
  const hasHome = form.homeTeamId || form.homeTeamPlaceholder.trim();
  const hasAway = form.awayTeamId || form.awayTeamPlaceholder.trim();

  if (!form.leagueId) {
    toast.error('Bitte Liga auswählen');
    return false;
  }

  if (!hasHome) {
    toast.error('Bitte Heimteam auswählen oder Heimteam-Name eintragen');
    return false;
  }

  if (!hasAway) {
    toast.error('Bitte Gastteam auswählen oder Gastteam-Name eintragen');
    return false;
  }

  if (form.homeTeamId && form.awayTeamId && form.homeTeamId === form.awayTeamId) {
    toast.error('Heimteam und Gastteam dürfen nicht gleich sein');
    return false;
  }

  return true;
};

  const saveExistingGame = async () => {
  if (!editingGameId) return;

  if (!validateGameForm(editForm)) return;

  setSaving(true);

  try {
    await base44.entities.Game.update(editingGameId, makePayload(editForm));
    invalidate();
    cancelEdit();
    toast.success('Spiel gespeichert');
  } catch (error) {
    console.error('DATA EDITOR UPDATE GAME ERROR:', error);
    toast.error(error.message || 'Spiel konnte nicht gespeichert werden');
  } finally {
    setSaving(false);
  }
};

  const createGame = async () => {
  if (!validateGameForm(createForm)) return;

  setSaving(true);

  try {
    await base44.entities.Game.create({
      ...makePayload(createForm),
      createdAtUtc: new Date().toISOString(),
    });

    invalidate();
    setCreateForm(EMPTY_GAME);
    setTab('games');
    toast.success('Spiel erstellt');
  } catch (error) {
    console.error('DATA EDITOR CREATE GAME ERROR:', error);
    toast.error(error.message || 'Spiel konnte nicht erstellt werden');
  } finally {
    setSaving(false);
  }
};

  const quickUpdateGame = async (game, payload) => {
    await base44.entities.Game.update(game.id, {
      ...payload,
      updatedAtUtc: new Date().toISOString(),
    });

    invalidate();
  };

  const GameCard = ({ game }) => {
    const home = teamsMap.get(game.homeTeamId);
    const away = teamsMap.get(game.awayTeamId);
    const league = leaguesMap.get(game.leagueId);
    const isEditing = editingGameId === game.id;
    const hasStream = !!game.streamUrl || game.streamLinks?.some(link => link?.url && link?.enabled !== false);

    if (isEditing) {
      return (
        <GameForm
          title="Spiel bearbeiten"
          form={editForm}
          teams={teams}
          leagues={leagues}
          onChange={setEditForm}
          onSave={saveExistingGame}
          onCancel={cancelEdit}
          saving={saving}
        />
      );
    }

    return (
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground truncate">
              {league?.shortName || league?.name || 'Keine Liga'}
            </p>

            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDate(game.date)} · {game.time || game.kickoffTime || 'ohne Uhrzeit'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasStream && (
              <Badge className="text-[10px] bg-blue-500/15 text-blue-400 border-0">
                Stream
              </Badge>
            )}

            {game.predictionEnabled === false && (
              <Badge className="text-[10px] bg-yellow-500/15 text-yellow-400 border-0">
                Tippspiel aus
              </Badge>
            )}

            <Badge
              className={`text-[10px] border-0 ${
                game.status === 'live'
                  ? 'bg-red-500/15 text-red-400'
                  : game.status === 'final'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {getStatusLabel(game.status)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">
              {getTeamName(home, game.homeTeamPlaceholder)}
            </p>
          </div>

          <div className="text-center min-w-[72px]">
            {game.status === 'live' || game.status === 'final' ? (
              <p className="text-lg font-black">
                {game.scoreHome ?? 0}:{game.scoreAway ?? 0}
              </p>
            ) : (
              <p className="text-xs font-bold text-muted-foreground">
                VS
              </p>
            )}
          </div>

          <div className="min-w-0 text-right">
            <p className="text-sm font-bold truncate">
              {getTeamName(away, game.awayTeamPlaceholder)}
            </p>
          </div>
        </div>

        {(game.venue || game.city || game.roundName) && (
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
            {(game.venue || game.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[game.venue, game.city].filter(Boolean).join(', ')}
              </span>
            )}

            {game.roundName && (
              <span>
                {game.roundName}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3 justify-end">
          {game.status === 'scheduled' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => quickUpdateGame(game, { status: 'live' })}
            >
              <Clock className="w-3 h-3 mr-1" />
              Live
            </Button>
          )}

          {game.status === 'live' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => quickUpdateGame(game, { status: 'scheduled' })}
            >
              Zurück
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2"
            onClick={() => startEdit(game)}
          >
            <Swords className="w-3 h-3 mr-1" />
            Bearbeiten
          </Button>

          {game.status !== 'final' && (
            <Button
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => startEdit({ ...game, status: 'final' })}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ergebnis
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderGameList = list => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Keine Spiele gefunden.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {list.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <p className="text-sm text-muted-foreground mb-5">
        Spiele erstellen, Ergebnisse eintragen, Streams pflegen und Tippspiele aktivieren oder deaktivieren.
      </p>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <StatTile
          icon={Calendar}
          label="Heute"
          value={todayGames.length}
        />

        <StatTile
          icon={Clock}
          label="Live"
          value={liveGames.length}
          tone="text-red-400"
          bg="bg-red-500/10"
        />

        <StatTile
          icon={Swords}
          label="Offen"
          value={openGames.length}
          tone="text-yellow-400"
          bg="bg-yellow-500/10"
        />

        <StatTile
          icon={Radio}
          label="Streams"
          value={streamGames.length}
          tone="text-blue-400"
          bg="bg-blue-500/10"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="overview" className="flex-1 text-xs">
            Übersicht
          </TabsTrigger>

          <TabsTrigger value="games" className="flex-1 text-xs">
            Spiele
          </TabsTrigger>

          <TabsTrigger value="create" className="flex-1 text-xs">
            Erstellen
          </TabsTrigger>

          <TabsTrigger value="more" className="flex-1 text-xs">
            Mehr
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold mb-2">
                Heute & Live
              </h2>

              {renderGameList([...liveGames, ...todayGames].slice(0, 8))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DataAreaCard
                icon={Swords}
                title="Games"
                description="Spiele erstellen, Kickoff-Zeiten pflegen, Live-Status setzen und Ergebnisse eintragen."
                badge="aktiv"
              />

              <DataAreaCard
                icon={Radio}
                title="Streams"
                description="Stream-Links direkt am Spiel speichern und sichtbar schalten."
                badge="aktiv"
              />

              <DataAreaCard
                icon={Trophy}
                title="Tippspiel"
                description="Tippspiel pro Spiel aktivieren oder deaktivieren. Tipps löschen bleibt Admins vorbehalten."
                badge="aktiv"
              />

              <DataAreaCard
                icon={BarChart3}
                title="Statistiken"
                description="Team- und Spielerstatistiken werden später ergänzt."
                badge="geplant"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="games">
          <Tabs defaultValue="open">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="open" className="flex-1 text-xs">
                Offen
              </TabsTrigger>

              <TabsTrigger value="final" className="flex-1 text-xs">
                Final
              </TabsTrigger>

              <TabsTrigger value="streams" className="flex-1 text-xs">
                Streams
              </TabsTrigger>

              <TabsTrigger value="all" className="flex-1 text-xs">
                Alle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open">
              {renderGameList(openGames)}
            </TabsContent>

            <TabsContent value="final">
              {renderGameList(finalGames)}
            </TabsContent>

            <TabsContent value="streams">
              {renderGameList(streamGames)}
            </TabsContent>

            <TabsContent value="all">
              {renderGameList(sortedGames)}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="create">
          <GameForm
            title="Neues Spiel erstellen"
            form={createForm}
            teams={teams}
            leagues={leagues}
            onChange={setCreateForm}
            onSave={createGame}
            saving={saving}
          />

          <div className="mt-3 rounded-xl border border-border/50 bg-card p-3 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2">
              <Plus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p>
                Für ein neues Spiel brauchst du mindestens Liga, Heimteam und Gastteam.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="more">
          <div className="space-y-2">
            <DataAreaCard
              icon={Database}
              title="Datenpflege"
              description="Zentraler Arbeitsbereich für wichtige Sportdaten."
              badge="Basis"
            />

            <DataAreaCard
              icon={Trophy}
              title="Tippspiel"
              description="Dateneditoren dürfen Tippspiele an oder aus schalten. Tipps löschen oder zurücksetzen ist nur für Admins vorgesehen."
              badge="aktiv"
            />

            <DataAreaCard
              icon={FileText}
              title="Transfers"
              description="Transfers werden als eigener Datenbereich vorbereitet."
              badge="nächster Schritt"
            />

            <DataAreaCard
              icon={BarChart3}
              title="Statistiken"
              description="Team-, Game- und Spielerstatistiken bekommen ein eigenes Datenmodell."
              badge="geplant"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}