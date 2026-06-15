import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadField from '@/components/common/ImageUploadField';
import { getImageUrl } from '@/lib/imageUtils';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  Shield,
  Globe,
  Instagram,
  Youtube,
  MapPin,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import useSetHeader from '@/hooks/useSetHeader';
import { applyWithdrawnTeamForfeit } from '@/lib/gameForfeitUtils';

const EMPTY = {
  name: '',
  shortName: '',
  gameCardAbbr: '',
  leagueId: '',
  groupId: '',
  city: '',
  region: '',
  country: '',
  stadium: '',
  stadiumAddress: '',
  stadiums: [],
  website: '',
  instagram: '',
  youtube: '',
  streamUrl: '',
  contactEmail: '',
  foundedYear: '',
  status: 'active',
  withdrawn: false,
  withdrawnBeforeSeason: false,
  logo: '',
  banner: '',
  primaryColor: '',
  secondaryColor: '',
  description: '',
};

const STATUS_LABELS = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  paused: 'Pausiert',
};

function createLocalId() {
  return `stadium_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStadium() {
  return {
    id: createLocalId(),
    name: '',
    address: '',
    city: '',
    isDefault: false,
    notes: '',
  };
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeSocialHandle(value) {
  return String(value || '')
    .trim()
    .replace(/^@/, '');
}

function normalizeStadiums(team) {
  if (Array.isArray(team?.stadiums) && team.stadiums.length > 0) {
    return team.stadiums.map((stadium, index) => ({
      id: stadium.id || createLocalId(),
      name: stadium.name || '',
      address: stadium.address || '',
      city: stadium.city || '',
      isDefault: stadium.isDefault === true || (index === 0 && !team.stadium),
      notes: stadium.notes || '',
    }));
  }

  if (team?.stadium || team?.stadiumAddress) {
    return [
      {
        id: createLocalId(),
        name: team.stadium || '',
        address: team.stadiumAddress || '',
        city: team.city || '',
        isDefault: true,
        notes: '',
      },
    ];
  }

  return [];
}

function cleanStadiums(stadiums) {
  const cleaned = (stadiums || [])
    .map(stadium => ({
      id: stadium.id || createLocalId(),
      name: String(stadium.name || '').trim(),
      address: String(stadium.address || '').trim(),
      city: String(stadium.city || '').trim(),
      isDefault: stadium.isDefault === true,
      notes: String(stadium.notes || '').trim(),
    }))
    .filter(stadium => stadium.name || stadium.address || stadium.city);

  if (cleaned.length === 0) return [];

  const hasDefault = cleaned.some(stadium => stadium.isDefault);

  if (!hasDefault) {
    return cleaned.map((stadium, index) => ({
      ...stadium,
      isDefault: index === 0,
    }));
  }

  let defaultUsed = false;

  return cleaned.map(stadium => {
    if (stadium.isDefault && !defaultUsed) {
      defaultUsed = true;
      return stadium;
    }

    return {
      ...stadium,
      isDefault: false,
    };
  });
}

function StadiumsEditor({ value = [], onChange, fallbackCity = '' }) {
  const stadiums = value || [];

  const updateStadium = (id, key, nextValue) => {
    if (key === 'isDefault' && nextValue === true) {
      onChange(stadiums.map(stadium => ({
        ...stadium,
        isDefault: stadium.id === id,
      })));
      return;
    }

    onChange(stadiums.map(stadium =>
      stadium.id === id
        ? { ...stadium, [key]: nextValue }
        : stadium
    ));
  };

  const addStadium = () => {
    onChange([
      ...stadiums,
      {
        ...createEmptyStadium(),
        city: fallbackCity || '',
        isDefault: stadiums.length === 0,
      },
    ]);
  };

  const removeStadium = id => {
    const next = stadiums.filter(stadium => stadium.id !== id);

    if (next.length > 0 && !next.some(stadium => stadium.isDefault)) {
      next[0].isDefault = true;
    }

    onChange(next);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Feste Stadien</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Mehrere Heimspielstätten möglich. Das Standard-Stadion wird beim Spiel als Vorschlag genutzt.
          </p>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={addStadium} className="h-8 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Stadion
        </Button>
      </div>

      {stadiums.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Noch keine festen Stadien gespeichert.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stadiums.map((stadium, index) => (
            <div key={stadium.id} className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">Stadion {index + 1}</p>

                <button
                  type="button"
                  onClick={() => removeStadium(stadium.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <Input
                placeholder="Stadionname"
                value={stadium.name}
                onChange={event => updateStadium(stadium.id, 'name', event.target.value)}
              />

              <Input
                placeholder="Adresse"
                value={stadium.address}
                onChange={event => updateStadium(stadium.id, 'address', event.target.value)}
              />

              <Input
                placeholder="Stadt optional"
                value={stadium.city}
                onChange={event => updateStadium(stadium.id, 'city', event.target.value)}
              />

              <Input
                placeholder="Notiz optional"
                value={stadium.notes}
                onChange={event => updateStadium(stadium.id, 'notes', event.target.value)}
              />

              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={stadium.isDefault === true}
                  onChange={event => updateStadium(stadium.id, 'isDefault', event.target.checked)}
                />
                Standard-Stadion
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamForm({ initial = EMPTY, leagues = [], onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    stadiums: normalizeStadiums(initial),
    withdrawn: initial.withdrawn === true,
    withdrawnBeforeSeason: initial.withdrawnBeforeSeason === true,
  });

  const set = (key, value) => {
    setForm(current => {
      if (key === 'withdrawn') {
        return {
          ...current,
          withdrawn: value,
          withdrawnBeforeSeason: value ? current.withdrawnBeforeSeason : false,
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const selectedLeague = leagues.find(league => league.id === form.leagueId);
  const groups = selectedLeague?.groupsEnabled ? selectedLeague.groups || [] : [];

  const handleLeagueChange = value => {
    setForm(current => ({
      ...current,
      leagueId: value,
      groupId: '',
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Bitte Teamnamen eingeben');
      return;
    }

    const stadiums = cleanStadiums(form.stadiums);
    const defaultStadium = stadiums.find(stadium => stadium.isDefault) || stadiums[0] || null;
    const withdrawn = form.withdrawn === true;

    onSave({
      name: form.name.trim(),
      shortName: form.shortName?.trim() || '',
      gameCardAbbr: String(form.gameCardAbbr || '').trim().toUpperCase().slice(0, 3),
      leagueId: form.leagueId || '',
      groupId: form.groupId || '',

      city: form.city?.trim() || '',
      region: form.region?.trim() || '',
      country: form.country?.trim() || '',

      stadium: defaultStadium?.name || form.stadium?.trim() || '',
      stadiumAddress: defaultStadium?.address || form.stadiumAddress?.trim() || '',
      stadiums,

      website: normalizeUrl(form.website),
      instagram: normalizeSocialHandle(form.instagram),
      youtube: normalizeUrl(form.youtube),
      streamUrl: normalizeUrl(form.streamUrl),
      contactEmail: form.contactEmail?.trim() || '',

      foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
      status: form.status || 'active',
      withdrawn,
      withdrawnBeforeSeason: withdrawn ? form.withdrawnBeforeSeason === true : false,

      logo: form.logo || '',
      banner: form.banner || '',
      primaryColor: form.primaryColor || '',
      secondaryColor: form.secondaryColor || '',
      description: form.description?.trim() || '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Basisdaten
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Teamname*"
            value={form.name}
            onChange={event => set('name', event.target.value)}
          />

          <Input
            className="sm:col-span-2"
            placeholder="GameCard-Abkürzung, z. B. MUC"
            value={form.gameCardAbbr || ''}
            onChange={event => set('gameCardAbbr', event.target.value.toUpperCase().slice(0, 3))}
          />

          <Select value={form.leagueId} onValueChange={handleLeagueChange}>
            <SelectTrigger className="sm:col-span-2">
              <SelectValue placeholder="Liga auswählen" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map(league => (
                <SelectItem key={league.id} value={league.id}>
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {form.leagueId && selectedLeague?.groupsEnabled && (
            <Select value={form.groupId || ''} onValueChange={value => set('groupId', value)}>
              <SelectTrigger className="sm:col-span-2">
                <SelectValue placeholder="Gruppe / Conference auswählen" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}{group.shortName ? ` (${group.shortName})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={form.status || 'active'} onValueChange={value => set('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="paused">Pausiert</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            min="1800"
            max="2100"
            placeholder="Gründungsjahr optional"
            value={form.foundedYear}
            onChange={event => set('foundedYear', event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-orange-300" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-orange-300">
              Spielbetrieb
            </p>

            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              Markiere Teams, die sich aus dem Spielbetrieb zurückgezogen haben.
              Diese Teams werden später in Tabellen unten angezeigt und aus automatischen Qualifikationen ausgeschlossen.
            </p>

            <div className="space-y-2 mt-3">
              <label className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.withdrawn === true}
                  onChange={event => set('withdrawn', event.target.checked)}
                  className="mt-0.5"
                />

                <span>
                  <span className="font-semibold block">
                    Aus Spielbetrieb zurückgezogen
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-relaxed block mt-0.5">
                    Team bleibt sichtbar, wird aber als zurückgezogen behandelt.
                  </span>
                </span>
              </label>

              {form.withdrawn && (
                <label className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.withdrawnBeforeSeason === true}
                    onChange={event => set('withdrawnBeforeSeason', event.target.checked)}
                    className="mt-0.5"
                  />

                  <span>
                    <span className="font-semibold block">
                      Rückzug vor der Season
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-relaxed block mt-0.5">
                      In Tabellen später ganz unten mit 0-Werten anzeigen.
                      Wenn aus, bleiben bisherige Season-Wertungen sichtbar, aber das Team steht unten.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Standort & Stadien
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Stadt"
            value={form.city}
            onChange={event => set('city', event.target.value)}
          />

          <Input
            placeholder="Region / Bundesland"
            value={form.region}
            onChange={event => set('region', event.target.value)}
          />

          <Input
            placeholder="Land"
            value={form.country}
            onChange={event => set('country', event.target.value)}
          />

          <StadiumsEditor
            value={form.stadiums}
            onChange={value => set('stadiums', value)}
            fallbackCity={form.city}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Links & Kontakt
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            placeholder="Website"
            value={form.website}
            onChange={event => set('website', event.target.value)}
          />

          <Input
            placeholder="Kontakt E-Mail"
            value={form.contactEmail}
            onChange={event => set('contactEmail', event.target.value)}
          />

          <div className="relative">
            <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Instagram Handle"
              value={form.instagram}
              onChange={event => set('instagram', event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="relative">
            <Youtube className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="YouTube / Video-Link"
              value={form.youtube}
              onChange={event => set('youtube', event.target.value)}
              className="pl-9"
            />
          </div>

          <Input
            placeholder="Stream-Link optional"
            value={form.streamUrl}
            onChange={event => set('streamUrl', event.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Branding
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <ImageUploadField
            label="Team-Logo"
            value={form.logo}
            onChange={value => set('logo', value)}
          />

          <ImageUploadField
            label="Team-Banner optional"
            value={form.banner}
            onChange={value => set('banner', value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
            <input
              type="color"
              value={form.primaryColor || '#4D9FFF'}
              onChange={event => set('primaryColor', event.target.value)}
              className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
            />

            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">Primärfarbe</p>
              <input
                type="text"
                value={form.primaryColor || ''}
                onChange={event => set('primaryColor', event.target.value)}
                placeholder="#000000"
                className="w-full px-2 py-1.5 bg-background border border-border/40 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
            <input
              type="color"
              value={form.secondaryColor || '#111827'}
              onChange={event => set('secondaryColor', event.target.value)}
              className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
            />

            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">Sekundärfarbe</p>
              <input
                type="text"
                value={form.secondaryColor || ''}
                onChange={event => set('secondaryColor', event.target.value)}
                placeholder="#000000"
                className="w-full px-2 py-1.5 bg-background border border-border/40 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <textarea
          placeholder="Beschreibung / About-Text optional"
          value={form.description}
          onChange={event => set('description', event.target.value)}
          rows={3}
          className="w-full mt-3 p-3 rounded-xl border border-border/50 bg-background text-sm resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={isSaving || !form.name}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Check className="w-4 h-4 mr-1" />
          )}
          Speichern
        </Button>

        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminTeams() {
  useSetHeader({ mode: 'back', title: 'Teams' });

  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterLeague, setFilterLeague] = useState('all');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-date', 1000),
  });

  const leagueMap = Object.fromEntries(leagues.map(league => [league.id, league]));
  const teamMap = Object.fromEntries(teams.map(team => [team.id, team]));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['standings'] });
    queryClient.invalidateQueries({ queryKey: ['competitions'] });
    queryClient.invalidateQueries({ queryKey: ['adminCompetitions'] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
  };

  const applyWithdrawalForfeitsForTeam = async (updatedTeam) => {
    if (updatedTeam?.withdrawn !== true || !updatedTeam?.id) return 0;

    const nextTeamMap = {
      ...teamMap,
      [updatedTeam.id]: updatedTeam,
    };

    const affectedGames = games.filter(game =>
      game.homeTeamId === updatedTeam.id ||
      game.awayTeamId === updatedTeam.id
    );

    let changed = 0;

    await Promise.all(
      affectedGames.map(async game => {
        const nextPayload = applyWithdrawnTeamForfeit(game, {
          homeTeam: nextTeamMap[game.homeTeamId],
          awayTeam: nextTeamMap[game.awayTeamId],
          league: leagueMap[game.leagueId],
        });

        const hasChanged =
          nextPayload.status !== game.status ||
          Number(nextPayload.scoreHome || 0) !== Number(game.scoreHome || 0) ||
          Number(nextPayload.scoreAway || 0) !== Number(game.scoreAway || 0) ||
          nextPayload.gameValuation !== game.gameValuation ||
          nextPayload.forfeitWithdrawnTeamId !== game.forfeitWithdrawnTeamId;

        if (!hasChanged) return;

        changed += 1;
        await base44.entities.Game.update(game.id, nextPayload);
      })
    );

    return changed;
  };

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Team.create(data),
    onSuccess: () => {
      invalidate();
      setAdding(false);
      toast.success('Team erstellt');
    },
    onError: error => {
      console.error('CREATE TEAM ERROR:', error);
      toast.error('Team konnte nicht erstellt werden');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedTeam = await base44.entities.Team.update(id, data);
      const changedGames = await applyWithdrawalForfeitsForTeam({ ...data, id });
      return { updatedTeam, changedGames };
    },
    onSuccess: result => {
      invalidate();
      setEditingId(null);
      toast.success(
        result?.changedGames > 0
          ? `Team aktualisiert, ${result.changedGames} Spiele mit 0:36 gewertet`
          : 'Team aktualisiert'
      );
    },
    onError: error => {
      console.error('UPDATE TEAM ERROR:', error);
      toast.error('Team konnte nicht aktualisiert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Team.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Team gelöscht');
    },
    onError: error => {
      console.error('DELETE TEAM ERROR:', error);
      toast.error('Team konnte nicht gelöscht werden');
    },
  });

  const filtered = filterLeague === 'all'
    ? teams
    : teams.filter(team => team.leagueId === filterLeague);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{teams.length} Teams</p>

        <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" />
          Neues Team
        </Button>
      </div>

      <div className="mb-4">
        <Select value={filterLeague} onValueChange={setFilterLeague}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Alle Ligen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Ligen</SelectItem>
            {leagues.map(league => (
              <SelectItem key={league.id} value={league.id}>
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {adding && (
        <Card className="p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3">Neues Team</h2>
          <TeamForm
            leagues={leagues}
            onSave={data => createMutation.mutate(data)}
            onCancel={() => setAdding(false)}
            isSaving={createMutation.isPending}
          />
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Teams gefunden
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(team => {
            const league = leagueMap[team.leagueId];
            const group = league?.groups?.find(item => item.id === team.groupId);
            const stadiumCount = normalizeStadiums(team).length;

            return (
              <Card
                key={team.id}
                className={`p-3 ${team.withdrawn ? 'border-orange-500/30 bg-orange-500/5' : ''}`}
              >
                {editingId === team.id ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Bearbeiten: {team.name}
                    </p>

                    <TeamForm
                      initial={{
                        name: team.name || '',
                        shortName: team.shortName || '',
                        gameCardAbbr: team.gameCardAbbr || team.game_card_abbr || '',
                        leagueId: team.leagueId || '',
                        groupId: team.groupId || '',
                        city: team.city || '',
                        region: team.region || '',
                        country: team.country || '',
                        stadium: team.stadium || '',
                        stadiumAddress: team.stadiumAddress || '',
                        stadiums: normalizeStadiums(team),
                        website: team.website || '',
                        instagram: team.instagram || '',
                        youtube: team.youtube || '',
                        streamUrl: team.streamUrl || '',
                        contactEmail: team.contactEmail || '',
                        foundedYear: team.foundedYear || '',
                        status: team.status || 'active',
                        withdrawn: team.withdrawn === true,
                        withdrawnBeforeSeason: team.withdrawnBeforeSeason === true,
                        logo: team.logo || '',
                        banner: team.banner || '',
                        primaryColor: team.primaryColor || '',
                        secondaryColor: team.secondaryColor || '',
                        description: team.description || '',
                      }}
                      leagues={leagues}
                      onSave={data => updateMutation.mutate({ id: team.id, data })}
                      onCancel={() => setEditingId(null)}
                      isSaving={updateMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {team.logo ? (
                      <img
                        src={getImageUrl(team.logo)}
                        alt=""
                        className={`w-11 h-11 object-contain rounded-lg flex-shrink-0 bg-secondary ${
                          team.withdrawn ? 'opacity-60 grayscale' : ''
                        }`}
                        onError={event => {
                          event.currentTarget.src = getImageUrl();
                        }}
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground ${
                        team.withdrawn ? 'opacity-60' : ''
                      }`}>
                        {team.gameCardAbbr || team.shortName || team.name?.[0] || '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-semibold ${team.withdrawn ? 'text-muted-foreground' : ''}`}>
                          {team.name}
                        </p>

                        {team.withdrawn && (
                          <Badge className="text-[9px] h-4 border-0 bg-orange-500/15 text-orange-300">
                            Zurückgezogen
                          </Badge>
                        )}

                        {team.withdrawn && team.withdrawnBeforeSeason && (
                          <Badge variant="outline" className="text-[9px] h-4 text-orange-300 border-orange-400/30">
                            vor Season
                          </Badge>
                        )}

                        {team.status && team.status !== 'active' && (
                          <Badge variant="outline" className="text-[9px] h-4">
                            {STATUS_LABELS[team.status] || team.status}
                          </Badge>
                        )}

                        {league?.groupsEnabled && !team.groupId && (
                          <Badge variant="outline" className="text-[9px] h-4 text-yellow-400 border-yellow-400/30">
                            Ohne Gruppe
                          </Badge>
                        )}

                        {group && (
                          <Badge variant="secondary" className="text-[9px] h-4">
                            {group.name}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5">
                        {league?.name || 'Keine Liga'} · {team.city || team.region || team.country || 'Kein Standort'}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {team.stadium && (
                          <Badge variant="outline" className="text-[9px]">
                            {team.stadium}
                          </Badge>
                        )}

                        {stadiumCount > 1 && (
                          <Badge variant="secondary" className="text-[9px]">
                            {stadiumCount} Stadien
                          </Badge>
                        )}

                        {(team.website || team.instagram || team.youtube) && (
                          <Badge variant="secondary" className="text-[9px]">
                            Links
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        className="p-1.5 rounded-lg hover:bg-secondary"
                        onClick={() => setEditingId(team.id)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>

                      <button
                        className="p-1.5 rounded-lg hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(team.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
