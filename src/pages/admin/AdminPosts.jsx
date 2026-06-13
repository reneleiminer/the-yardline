import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ImageUploadField from '@/components/common/ImageUploadField';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Camera,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import useSetHeader from '@/hooks/useSetHeader';
import { getImageUrl } from '@/lib/imageUtils';

const GAMEDAY_SHOT_VERSION = 'gameday_photo';

const EMPTY_FORM = {
  image_url: '',
  image_urls: [],
  credit: '',
  credit_link: '',
  instagram: '',
  caption: '',
  sort_order: '0',
  active: true,
};

function createEmptyForm() {
  return {
    ...EMPTY_FORM,
    image_urls: [],
  };
}

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}


function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeGameDayShot(item) {
  const meta = parseMessage(item.message);

  return {
    id: item.id,
    game_id: meta.game_id || item.gameId || '',
    home_team_id: meta.home_team_id || meta.homeTeamId || '',
    away_team_id: meta.away_team_id || meta.awayTeamId || '',
    team_ids: Array.isArray(meta.team_ids) ? meta.team_ids : [],
    league_id: meta.league_id || meta.leagueId || '',
    season: meta.season || '',
    game_title: meta.game_title || meta.gameTitle || '',
    image_url: meta.image_url || item.imageUrl || '',
    credit: meta.credit || '',
    credit_link: meta.credit_link || meta.creditLink || meta.credit_url || '',
    instagram: meta.instagram || '',
    caption: meta.caption || item.title || '',
    sort_order: Number(meta.sort_order || 0),
    active: item.isActive !== false && meta.active !== false,
    created_date: item.created_date || item.createdAtUtc || meta.created_at || '',
  };
}

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

function buildGameTitle(game, teamsMap) {
  if (!game) return 'Spiel auswählen';

  const home = teamsMap.get(game.homeTeamId);
  const away = teamsMap.get(game.awayTeamId);

  return `${getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder)} vs ${getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder)}`;
}

function GameCard({ game, teamsMap, leaguesMap, selected, shotCount, onSelect }) {
  const home = teamsMap.get(game.homeTeamId);
  const away = teamsMap.get(game.awayTeamId);
  const league = leaguesMap.get(game.leagueId);

  return (
    <button
      type="button"
      onClick={onSelect}
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

        {shotCount > 0 && (
          <Badge className="text-[10px] border-0 bg-purple-500/15 text-purple-400 flex-shrink-0">
            {shotCount} Shots
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <p className="text-sm font-black truncate">
          {getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder)}
        </p>

        <p className="text-xs font-black text-muted-foreground">vs</p>

        <p className="text-sm font-black truncate text-right">
          {getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder)}
        </p>
      </div>
    </button>
  );
}

function ShotCard({ shot, gameTitle, onEdit, onDelete, isDeleting }) {
  return (
    <Card className="p-3">
      <div className="flex gap-3">
        <div className="w-20 h-24 rounded-xl bg-secondary/50 border border-border/40 overflow-hidden flex items-center justify-center flex-shrink-0">
          {shot.image_url ? (
            <img
              src={getImageUrl(shot.image_url)}
              alt={shot.caption || 'GameDay Shot'}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-black truncate">
              {shot.caption || 'GameDay Shot'}
            </p>

            {shot.active ? (
              <Badge className="text-[10px] border-0 bg-green-500/15 text-green-400">
                Aktiv
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Inaktiv
              </Badge>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground mt-1 truncate">
            {gameTitle}
          </p>

          {(shot.credit || shot.credit_link || shot.instagram) && (
            <div className="text-[10px] text-muted-foreground mt-1 truncate">
              {shot.credit_link ? (
                <a
                  href={normalizeUrl(shot.credit_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  {shot.credit || 'Fotograf'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>{shot.credit}</span>
              )}

              {(shot.credit || shot.credit_link) && shot.instagram ? ' · ' : ''}
              {shot.instagram}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-1">
            Sortierung: {shot.sort_order}
          </p>

          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={onEdit}
              className="h-8 px-2 rounded-lg border border-border bg-background hover:bg-secondary text-[10px] font-bold inline-flex items-center justify-center"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Bearbeiten
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-8 px-2 rounded-lg border border-border bg-background hover:bg-destructive/10 text-[10px] font-bold text-red-400 inline-flex items-center justify-center disabled:opacity-60"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Löschen
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AdminGameDayShots() {
  useSetHeader({ mode: 'dashboard', title: 'GameDay Shots' });

  const queryClient = useQueryClient();
  const [selectedGameId, setSelectedGameId] = useState('');
  const [search, setSearch] = useState('');
  const [editingShotId, setEditingShotId] = useState(null);
  const [formData, setFormData] = useState(() => createEmptyForm());

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['admin-gameday-games'],
    queryFn: () => base44.entities.Game.list('-date', 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-gameday-teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-gameday-leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const { data: shots = [], isLoading: shotsLoading } = useQuery({
    queryKey: ['admin-gameday-shots'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date', 2000);
      return all
        .filter((item) => item.version === GAMEDAY_SHOT_VERSION)
        .map(normalizeGameDayShot)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    },
  });

  const teamsMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesMap = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const gamesMap = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);

  const shotsByGameId = useMemo(() => {
    const map = new Map();

    shots.forEach((shot) => {
      if (!shot.game_id) return;
      map.set(shot.game_id, [...(map.get(shot.game_id) || []), shot]);
    });

    return map;
  }, [shots]);

  const selectedGame = selectedGameId ? gamesMap.get(selectedGameId) : null;
  const selectedGameTitle = buildGameTitle(selectedGame, teamsMap);
  const selectedShots = selectedGameId ? (shotsByGameId.get(selectedGameId) || []) : [];

  const filteredGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...games]
      .filter((game) => {
        if (!normalizedSearch) return true;

        const home = teamsMap.get(game.homeTeamId);
        const away = teamsMap.get(game.awayTeamId);
        const league = leaguesMap.get(game.leagueId);

        const haystack = [
          home?.name,
          home?.shortName,
          away?.name,
          away?.shortName,
          game.homeTeamNameSnapshot,
          game.awayTeamNameSnapshot,
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

  const invalidateShots = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-gameday-shots'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
    if (selectedGameId) {
      queryClient.invalidateQueries({ queryKey: ['game-content', selectedGameId] });
    }
  };

  const resetForm = () => {
    setEditingShotId(null);
    setFormData(createEmptyForm());
  };

  const getSelectedImageUrls = () => {
    if (editingShotId) {
      return formData.image_url.trim() ? [formData.image_url.trim()] : [];
    }

    return [
      ...(formData.image_urls || []),
      formData.image_url.trim(),
    ]
      .filter(Boolean)
      .filter((url, index, all) => all.indexOf(url) === index);
  };

  const buildPayload = (imageUrl, index = 0) => {
    const meta = {
      game_id: selectedGameId,
      game_title: selectedGameTitle,
      league_id: selectedGame?.leagueId || '',
      season: selectedGame?.season || '',
      home_team_id: selectedGame?.homeTeamId || '',
      away_team_id: selectedGame?.awayTeamId || '',
      team_ids: [selectedGame?.homeTeamId, selectedGame?.awayTeamId].filter(Boolean),
      image_url: String(imageUrl || '').trim(),
      credit: formData.credit.trim(),
      credit_link: normalizeUrl(formData.credit_link),
      instagram: formData.instagram.trim(),
      caption: formData.caption.trim(),
      sort_order: Number(formData.sort_order || 0) + index,
      active: formData.active !== false,
      created_at: new Date().toISOString(),
    };

    return {
      title: meta.caption || 'GameDay Shot',
      message: JSON.stringify(meta),
      imageUrl: meta.image_url || null,
      version: GAMEDAY_SHOT_VERSION,
      isActive: meta.active,
      showAsPopup: false,
      updatedAtUtc: new Date().toISOString(),
    };
  };

  const validate = () => {
    if (!selectedGameId) {
      toast.error('Bitte zuerst ein Spiel auswählen');
      return false;
    }

    if (getSelectedImageUrls().length === 0) {
      toast.error('Bitte mindestens ein Bild hochladen oder eine Bild-URL eintragen');
      return false;
    }

    return true;
  };

  const createMutation = useMutation({
    mutationFn: (payloads) => Promise.all(
      payloads.map((payload) => base44.entities.AppUpdate.create({
        ...payload,
        createdAtUtc: new Date().toISOString(),
      })),
    ),
    onSuccess: (_result, payloads) => {
      invalidateShots();
      toast.success(payloads.length > 1 ? `${payloads.length} GameDay Shots hinzugefügt` : 'GameDay Shot hinzugefügt');
      resetForm();
    },
    onError: (error) => {
      console.error('GAMEDAY_SHOT_CREATE_ERROR', error);
      toast.error(error.message || 'Shot konnte nicht gespeichert werden');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => base44.entities.AppUpdate.update(editingShotId, payload),
    onSuccess: () => {
      invalidateShots();
      toast.success('GameDay Shot gespeichert');
      resetForm();
    },
    onError: (error) => {
      console.error('GAMEDAY_SHOT_UPDATE_ERROR', error);
      toast.error(error.message || 'Shot konnte nicht aktualisiert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppUpdate.delete(id),
    onSuccess: () => {
      invalidateShots();
      toast.success('GameDay Shot gelöscht');
      resetForm();
    },
    onError: (error) => {
      console.error('GAMEDAY_SHOT_DELETE_ERROR', error);
      toast.error(error.message || 'Shot konnte nicht gelöscht werden');
    },
  });

  const handleSave = () => {
    if (!validate()) return;

    const imageUrls = getSelectedImageUrls();

    if (editingShotId) {
      updateMutation.mutate(buildPayload(imageUrls[0]));
      return;
    }

    createMutation.mutate(imageUrls.map((imageUrl, index) => buildPayload(imageUrl, index)));
  };

  const handleEdit = (shot) => {
    setSelectedGameId(shot.game_id);
    setEditingShotId(shot.id);
    setFormData({
      image_url: shot.image_url || '',
      image_urls: [],
      credit: shot.credit || '',
      credit_link: shot.credit_link || '',
      instagram: shot.instagram || '',
      caption: shot.caption || '',
      sort_order: String(shot.sort_order || 0),
      active: shot.active !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectGame = (gameId) => {
    setSelectedGameId(gameId);
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = gamesLoading || shotsLoading;

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-purple-950/60 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5 text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Admin Media
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              GameDay Shots
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Bilder zu Spielen verwalten, mehrere Fotos gleichzeitig hochladen und Credits sauber pflegen.
            </p>
          </div>
        </div>
      </section>

      {selectedGame && (
        <section className="rounded-2xl border border-border/50 bg-card p-4 mb-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                Ausgewähltes Spiel
              </p>

              <h2 className="text-lg font-black mt-1 truncate">
                {selectedGameTitle}
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(selectedGame.date)} · {selectedGame.time || selectedGame.kickoffTime || 'ohne Uhrzeit'}
              </p>

              <p className="text-[11px] text-muted-foreground mt-1">
                Die Bilder werden automatisch diesem Spiel sowie beiden Teams zugeordnet.
              </p>
            </div>

            <Badge className="text-[10px] border-0 bg-purple-500/15 text-purple-400 flex-shrink-0">
              {selectedShots.length} Shots
            </Badge>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/40 p-4 mb-4 space-y-3">
            <ImageUploadField
              label={editingShotId ? 'Bild vom Gerät ersetzen' : 'Bilder vom Gerät hochladen'}
              value={editingShotId ? formData.image_url : formData.image_urls}
              multiple={!editingShotId}
              onChange={(value) => setFormData((current) => (
                editingShotId
                  ? { ...current, image_url: value }
                  : { ...current, image_urls: value }
              ))}
            />

            {!editingShotId && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Du kannst mehrere Bilder auf einmal auswählen. Beim Speichern wird jedes Bild als eigener GameDay Shot angelegt. Credit, Instagram und Caption werden für alle ausgewählten Bilder übernommen.
              </p>
            )}

            <Input
              value={formData.image_url}
              onChange={(event) => setFormData((current) => ({ ...current, image_url: event.target.value }))}
              placeholder={editingShotId ? 'Bild-URL' : 'Oder zusätzlich eine Bild-URL einfügen'}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={formData.credit}
                onChange={(event) => setFormData((current) => ({ ...current, credit: event.target.value }))}
                placeholder="Credit / Fotograf"
              />

              <Input
                value={formData.credit_link}
                onChange={(event) => setFormData((current) => ({ ...current, credit_link: event.target.value }))}
                placeholder="Credit-Link optional, z.B. Website/Portfolio"
              />

              <Input
                value={formData.instagram}
                onChange={(event) => setFormData((current) => ({ ...current, instagram: event.target.value }))}
                placeholder="Instagram optional, z.B. @name"
                className="sm:col-span-2"
              />
            </div>

            <Input
              value={formData.caption}
              onChange={(event) => setFormData((current) => ({ ...current, caption: event.target.value }))}
              placeholder="Caption optional"
            />

            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(event) => setFormData((current) => ({ ...current, sort_order: event.target.value }))}
                placeholder="Sortierung"
              />

              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active !== false}
                  onChange={(event) => setFormData((current) => ({ ...current, active: event.target.checked }))}
                />
                Aktiv
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="col-span-2 h-10 text-xs"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingShotId ? (
                  'Shot speichern'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Shot hinzufügen
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="h-10 text-xs"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Neu
              </Button>
            </div>
          </div>

          {shotsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : selectedShots.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-background/40 py-8 text-center">
              <p className="text-sm font-bold">Noch keine GameDay Shots für dieses Spiel.</p>
              <p className="text-xs text-muted-foreground mt-1">Lade oben ein oder mehrere Bilder hoch.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedShots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  gameTitle={selectedGameTitle}
                  onEdit={() => handleEdit(shot)}
                  onDelete={() => deleteMutation.mutate(shot.id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-primary" />

          <h2 className="text-sm font-black">
            Spiel auswählen
          </h2>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Spiel, Team, Liga, Datum suchen..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-background/40 py-10 text-center">
            <p className="text-sm font-bold">Keine Spiele gefunden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                teamsMap={teamsMap}
                leaguesMap={leaguesMap}
                selected={selectedGameId === game.id}
                shotCount={(shotsByGameId.get(game.id) || []).length}
                onSelect={() => handleSelectGame(game.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
