import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  KeyRound,
  Loader2,
  MapPin,
  Newspaper,
  Plus,
  Radio,
  Save,
  Star,
  Swords,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { useAuth } from '@/lib/AuthContext';
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
  cancelled: 'Abgesagt',
};

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

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

function formatWeekRange(start, end) {
  return `${formatDate(start.toISOString().slice(0, 10))} - ${formatDate(end.toISOString().slice(0, 10))}`;
}

function getGameDate(game) {
  if (!game?.date) return null;

  const [year, month, day] = String(game.date).split('-').map(Number);
  const [hour, minute] = String(game.time || game.kickoffTime || '00:00').split(':').map(Number);

  if (!year || !month || !day) return null;

  return new Date(
    year,
    month - 1,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    0,
    0
  );
}

function getUpcomingWeekendWindow() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;

  start.setDate(start.getDate() + daysUntilSaturday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function getNextSevenDaysWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isGameInWindow(game, window) {
  const date = getGameDate(game);
  if (!date) return false;

  return date >= window.start && date < window.end;
}

function isAllowedMediaLeague(league) {
  if (!league) return false;

  const values = [
    league.name,
    league.shortName,
    league.slug,
    league.code,
    league.abbreviation,
  ]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase());

  return values.some(value =>
    value === 'efa' ||
    value === 'afle' ||
    value.includes('european football alliance') ||
    value.includes('american football league europe')
  );
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

function MediaAccountSettings({ appUser, onSaved }) {
  const [username, setUsername] = useState(appUser?.username || appUser?.internalUsername || '');
  const [displayName, setDisplayName] = useState(appUser?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAccount = async () => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanNewPassword = newPassword.trim();

    if (!appUser?.id) {
      toast.error('Account konnte nicht geladen werden.');
      return;
    }

    if (!cleanUsername) {
      toast.error('Bitte Benutzernamen eingeben.');
      return;
    }

    if (!cleanDisplayName) {
      toast.error('Bitte Anzeigenamen eingeben.');
      return;
    }

    if (cleanNewPassword) {
      const storedPassword =
        appUser.internalPassword ||
        appUser.password ||
        appUser.loginPassword ||
        appUser.temporaryPassword ||
        '';

      if (!currentPassword.trim()) {
        toast.error('Bitte aktuelles Passwort eingeben.');
        return;
      }

      if (String(storedPassword) !== currentPassword.trim()) {
        toast.error('Aktuelles Passwort ist falsch.');
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        username: cleanUsername,
        internalUsername: cleanUsername,
        displayName: cleanDisplayName,
        updatedAtUtc: new Date().toISOString(),
      };

      if (cleanNewPassword) {
        payload.internalPassword = cleanNewPassword;
      }

      await base44.entities.AppUser.update(appUser.id, payload);

      setCurrentPassword('');
      setNewPassword('');
      await onSaved?.();

      toast.success('Account aktualisiert');
    } catch (error) {
      console.error('MEDIA ACCOUNT UPDATE ERROR:', error);
      toast.error(error.message || 'Account konnte nicht aktualisiert werden');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>

        <div>
          <h2 className="text-sm font-bold">
            Profil & Login
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Benutzername und Passwort für diesen Media-Zugang ändern.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="Benutzername"
          autoComplete="username"
        />

        <Input
          value={displayName}
          onChange={event => setDisplayName(event.target.value)}
          placeholder="Anzeigename"
          autoComplete="name"
        />

        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">
              Passwort ändern
            </p>
          </div>

          <Input
            type="password"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            placeholder="Aktuelles Passwort"
            autoComplete="current-password"
          />

          <Input
            type="password"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder="Neues Passwort optional"
            autoComplete="new-password"
          />
        </div>

        <Button
          type="button"
          onClick={saveAccount}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Account speichern
        </Button>
      </div>
    </Card>
  );
}

function MediaGameCard({ game, teamsMap, leaguesMap, selected, creditLabel, onSelect, selecting }) {
  const home = teamsMap.get(game.homeTeamId);
  const away = teamsMap.get(game.awayTeamId);
  const league = leaguesMap.get(game.leagueId);

  return (
    <Card className={`p-4 border ${selected ? 'border-primary bg-primary/5' : 'border-border/50'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">
            {league?.shortName || league?.name || 'Keine Liga'}
          </p>

          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDate(game.date)} · {game.time || game.kickoffTime || 'ohne Uhrzeit'}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0">
          {selected && (
            <Badge className="text-[10px] bg-primary text-primary-foreground border-0">
              Game of the Week
            </Badge>
          )}

          <Badge
            className={`text-[10px] border-0 ${
              game.status === 'live'
                ? 'bg-red-500/15 text-red-400'
                : game.status === 'final'
                ? 'bg-green-500/15 text-green-400'
                : game.status === 'cancelled'
                ? 'bg-orange-500/15 text-orange-400'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {getStatusLabel(game.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <p className="text-sm font-bold truncate">
          {getTeamName(home, game.homeTeamPlaceholder)}
        </p>

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

        <p className="text-sm font-bold truncate text-right">
          {getTeamName(away, game.awayTeamPlaceholder)}
        </p>
      </div>

      {(game.venue || game.city || game.roundName || selected) && (
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

          {selected && (
            <span className="text-primary font-bold">
              {game.gameOfTheWeekLabel || creditLabel}
            </span>
          )}
        </div>
      )}

      <div className="mt-4">
        <Button
          type="button"
          onClick={() => onSelect(game)}
          disabled={selecting || game.status === 'cancelled'}
          variant={selected ? 'outline' : 'default'}
          className="w-full"
        >
          {selecting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Star className="w-4 h-4 mr-2" />
          )}
          {selected ? 'Auswahl entfernen' : 'Als Game of the Week setzen'}
        </Button>
      </div>
    </Card>
  );
}

function MediaDashboard({ games, isLoading, teamsMap, leaguesMap, invalidate }) {
  useSetHeader({
    mode: 'dashboard',
    title: 'Media',
  });

  const { appUserSnapshot, refreshAuth } = useAuth();
  const [tab, setTab] = useState('weekend');
  const [creditLabel, setCreditLabel] = useState('by EuroFBShow');
  const [selectingId, setSelectingId] = useState(null);

  const { data: selectedGameOfWeekRows = [] } = useQuery({
    queryKey: ['game-of-week-selected'],
    queryFn: async () => {
      try {
        return await base44.entities.Game.filter({ isGameOfTheWeek: true });
      } catch (error) {
        console.warn('GAME OF THE WEEK FILTER FALLBACK:', error);
        return games.filter(item => item.isGameOfTheWeek === true);
      }
    },
    enabled: games.length > 0,
  });

  const upcomingWeekend = useMemo(() => getUpcomingWeekendWindow(), []);
  const nextSevenDays = useMemo(() => getNextSevenDaysWindow(), []);

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      const dateA = getGameDate(a)?.getTime() || 0;
      const dateB = getGameDate(b)?.getTime() || 0;

      return dateB - dateA;
    });
  }, [games]);

  const selectedGameOfWeekList = selectedGameOfWeekRows.length > 0
    ? selectedGameOfWeekRows
    : sortedGames.filter(game => game.isGameOfTheWeek === true);

  const currentSelection = selectedGameOfWeekList[0] || null;

  const fetchSelectedGameOfTheWeek = async () => {
    try {
      return await base44.entities.Game.filter({ isGameOfTheWeek: true });
    } catch (error) {
      console.warn('GAME OF THE WEEK SELECTED FILTER FALLBACK:', error);
      return games.filter(item => item.isGameOfTheWeek === true);
    }
  };

  const mediaLeagueGames = sortedGames.filter(game => {
    const league = leaguesMap.get(game.leagueId);
    return isAllowedMediaLeague(league);
  });

  const weekendGames = mediaLeagueGames
    .filter(game => isGameInWindow(game, upcomingWeekend))
    .filter(game => game.status !== 'cancelled')
    .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));

  const upcomingGames = mediaLeagueGames
    .filter(game => isGameInWindow(game, nextSevenDays))
    .filter(game => game.status !== 'cancelled')
    .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));

  const allSelectableGames = mediaLeagueGames
    .filter(game => game.status !== 'cancelled')
    .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));

  const clearGameOfTheWeek = async () => {
    const selectedGames = (await fetchSelectedGameOfTheWeek()).filter(item => item?.id);

    if (selectedGames.length === 0) {
      toast.info('Es ist aktuell kein Game of the Week ausgewählt');
      return;
    }

    setSelectingId('clear');

    try {
      await Promise.all(
        selectedGames.map(item =>
          base44.entities.Game.update(item.id, {
            isGameOfTheWeek: false,
            gameOfTheWeekLabel: '',
            gameOfTheWeekSelectedBy: null,
            gameOfTheWeekSelectedAtUtc: null,
            updatedAtUtc: new Date().toISOString(),
          })
        )
      );

      await Promise.resolve(invalidate());
      toast.success('Game of the Week entfernt');
    } catch (error) {
      console.error('CLEAR GAME OF THE WEEK ERROR:', error);
      toast.error(error.message || 'Game of the Week konnte nicht entfernt werden');
    } finally {
      setSelectingId(null);
    }
  };

  const selectGameOfTheWeek = async game => {
    if (!game?.id) return;

    const label = creditLabel.trim() || 'by Media';

    setSelectingId(game.id);

    try {
      const selectedGames = (await fetchSelectedGameOfTheWeek()).filter(item => item?.id);

      const selectedIds = new Set(selectedGames.map(item => item.id));
      const isAlreadySelected = selectedIds.has(game.id) || game.isGameOfTheWeek === true;

      if (isAlreadySelected) {
        await base44.entities.Game.update(game.id, {
          isGameOfTheWeek: false,
          gameOfTheWeekLabel: '',
          gameOfTheWeekSelectedBy: null,
          gameOfTheWeekSelectedAtUtc: null,
          updatedAtUtc: new Date().toISOString(),
        });

        await Promise.resolve(invalidate());
        toast.success('Game of the Week abgewählt');
        return;
      }

      const oldSelections = selectedGames.filter(item => item.id !== game.id);

      await Promise.all(
        oldSelections.map(item =>
          base44.entities.Game.update(item.id, {
            isGameOfTheWeek: false,
            gameOfTheWeekLabel: '',
            gameOfTheWeekSelectedBy: null,
            gameOfTheWeekSelectedAtUtc: null,
            updatedAtUtc: new Date().toISOString(),
          })
        )
      );

      await base44.entities.Game.update(game.id, {
        isGameOfTheWeek: true,
        gameOfTheWeekLabel: label,
        gameOfTheWeekSelectedBy: null,
        gameOfTheWeekSelectedAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      });

      await Promise.resolve(invalidate());
      toast.success('Neues Game of the Week gesetzt. Alte Auswahl wurde automatisch entfernt.');
    } catch (error) {
      console.error('MEDIA GAME OF THE WEEK ERROR:', error);
      toast.error(error.message || 'Game of the Week konnte nicht gespeichert werden');
    } finally {
      setSelectingId(null);
    }
  };

  const renderMediaGames = list => {
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
          Keine EFA- oder AFLE-Spiele in diesem Zeitraum gefunden.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {list.map(game => (
          <MediaGameCard
            key={game.id}
            game={game}
            teamsMap={teamsMap}
            leaguesMap={leaguesMap}
            selected={game.isGameOfTheWeek === true}
            creditLabel={creditLabel}
            onSelect={selectGameOfTheWeek}
            selecting={selectingId === game.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-6 pb-24">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Game of the Week
        </p>

        <h1 className="text-xl font-black mt-1">
          Media Auswahl
        </h1>

        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Wähle vor dem Wochenende ein EFA- oder AFLE-Spiel aus. Die automatische Berechnung wird nicht mehr genutzt.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <StatTile
          icon={Calendar}
          label="Wochenende"
          value={weekendGames.length}
        />

        <StatTile
          icon={CheckCircle2}
          label="Geplant"
          value={weekendGames.filter(game => game.status === 'scheduled').length}
          tone="text-green-400"
          bg="bg-green-500/10"
        />

        <StatTile
          icon={Swords}
          label="Alle"
          value={allSelectableGames.length}
          tone="text-blue-400"
          bg="bg-blue-500/10"
        />

        <StatTile
          icon={Star}
          label="Auswahl"
          value={currentSelection ? 1 : 0}
          tone="text-yellow-400"
          bg="bg-yellow-500/10"
        />
      </div>

      <Card className="p-4 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h2 className="text-sm font-bold">
              Anzeige-Text
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dieser Text steht auf der Startseite am Game of the Week.
            </p>
          </div>
        </div>

        <Input
          value={creditLabel}
          onChange={event => setCreditLabel(event.target.value)}
          placeholder="z.B. by EuroFBShow"
        />

        {currentSelection && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Aktuell ausgewählt
            </p>
            <p className="text-sm font-bold mt-1">
              {getTeamName(teamsMap.get(currentSelection.homeTeamId), currentSelection.homeTeamPlaceholder)}
              {' vs '}
              {getTeamName(teamsMap.get(currentSelection.awayTeamId), currentSelection.awayTeamPlaceholder)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentSelection.gameOfTheWeekLabel || 'by Media'}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-8 text-xs"
              onClick={clearGameOfTheWeek}
              disabled={selectingId === 'clear'}
            >
              {selectingId === 'clear' ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <X className="w-3 h-3 mr-1" />
              )}
              Aktuelle Auswahl entfernen
            </Button>
          </div>
        )}
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="weekend" className="flex-1 text-xs">
            Wochenende
          </TabsTrigger>

          <TabsTrigger value="upcoming" className="flex-1 text-xs">
            7 Tage
          </TabsTrigger>

          <TabsTrigger value="all" className="flex-1 text-xs">
            Alle
          </TabsTrigger>

          <TabsTrigger value="account" className="flex-1 text-xs">
            Konto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekend">
          <p className="text-xs text-muted-foreground mb-3">
            EFA- und AFLE-Spiele für das kommende Wochenende: {formatWeekRange(upcomingWeekend.start, upcomingWeekend.end)}
          </p>

          {renderMediaGames(weekendGames)}
        </TabsContent>

        <TabsContent value="upcoming">
          <p className="text-xs text-muted-foreground mb-3">
            EFA- und AFLE-Spiele der nächsten 7 Tage.
          </p>

          {renderMediaGames(upcomingGames)}
        </TabsContent>

        <TabsContent value="all">
          <p className="text-xs text-muted-foreground mb-3">
            Alle auswählbaren EFA- und AFLE-Spiele. Wenn du hier ein neues Spiel auswählst, wird die alte Auswahl automatisch entfernt.
          </p>

          {renderMediaGames(allSelectableGames)}
        </TabsContent>

        <TabsContent value="account">
          <MediaAccountSettings
            appUser={appUserSnapshot}
            onSaved={refreshAuth}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DataEditorDashboard() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { teams = [], leagues = [] } = useGlobalData();
  const { appUserSnapshot } = useAuth();

  const roleSlug = normalizeRole(appUserSnapshot?.roleSlug || appUserSnapshot?.role);
  const isAdmin = roleSlug === 'admin';
  const isMediaPartner = roleSlug === 'media_partner';
  const shouldOpenGameOfTheWeek = searchParams.get('gameOfTheWeek') === '1';

  useSetHeader({
    mode: 'back',
    title: isMediaPartner ? 'Media' : 'Daten bearbeiten',
  });

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
    queryClient.invalidateQueries({ queryKey: ['game-of-week-selected'] });
    queryClient.invalidateQueries({ queryKey: ['standingsConfigs'] });
  };

  if (isMediaPartner || (isAdmin && shouldOpenGameOfTheWeek)) {
    return (
      <MediaDashboard
        games={games}
        isLoading={isLoading}
        teamsMap={teamsMap}
        leaguesMap={leaguesMap}
        invalidate={invalidate}
      />
    );
  }

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
            {game.isGameOfTheWeek && (
              <Badge className="text-[10px] bg-primary text-primary-foreground border-0">
                GOTW
              </Badge>
            )}

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
