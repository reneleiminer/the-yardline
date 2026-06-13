import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadField from '@/components/common/ImageUploadField';
import { MapPin, Plus, Save, ShieldCheck, Trash2, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_DISPLAY_SETTINGS = {
  showLeague: true,
  showSeason: true,
  showStatus: true,
  showBracketStats: true,
  publicName: '',
  finalRoundName: '',
  highlightFinal: false,
  displayMode: 'bracket',
};

const COMPETITION_TYPES = [
  {
    value: 'playoffs',
    label: 'Playoffs',
    description: 'Turnierbaum mit Finalrunde, Bowl oder Championship als letzter Runde.',
    color: 'from-blue-500/20 to-yellow-500/10 border-blue-400/30',
    icon: Trophy,
    displayMode: 'bracket',
    allowsFinalHighlight: true,
  },
];

const VENUE_MODES = [
  {
    value: 'home',
    label: 'Heimteam-Stadion',
    description: 'Standard: Das besser gesetzte/Heimteam spielt zuhause.',
  },
  {
    value: 'round',
    label: 'Festes Stadion für diese Runde',
    description: 'Alle Spiele dieser Runde haben denselben Spielort.',
  },
  {
    value: 'manual',
    label: 'Pro Spiel manuell',
    description: 'Jedes Spiel kann einen eigenen Spielort bekommen.',
  },
];

function getCompetitionTypeConfig(type) {
  return COMPETITION_TYPES.find(item => item.value === type) || COMPETITION_TYPES[0];
}

function isBracketType(type) {
  return getCompetitionTypeConfig(type).displayMode === 'bracket';
}

function allowsFinalHighlight(type) {
  return getCompetitionTypeConfig(type).allowsFinalHighlight === true;
}

function createSideSource() {
  return {
    type: 'standings',
    scope: 'overall',
    groupId: '',
    position: 1,
  };
}

function createMatchup(index = 0) {
  return {
    matchupIndex: index,
    team1Id: null,
    team2Id: null,
    team1Seed: null,
    team2Seed: null,
    team1Placeholder: 'Teilnehmer offen',
    team2Placeholder: 'Teilnehmer offen',
    team1Source: createSideSource(),
    team2Source: createSideSource(),
    winnerId: null,
    gameId: null,
    date: '',
    time: '',
    venue: '',
    venueAddress: '',
    venueCity: '',
  };
}

function createRound(roundNumber = 1, name = '') {
  return {
    round: roundNumber,
    name: name || (roundNumber === 1 ? 'Runde 1' : `Runde ${roundNumber}`),
    venueMode: 'home',
    venue: '',
    venueAddress: '',
    venueCity: '',
    matchups: [createMatchup(0)],
  };
}

function getSourceLabel(source, fallback = 'Teilnehmer offen') {
  if (!source) return fallback;

  if (source.type === 'winner') {
    return `Sieger Runde ${source.round || '?'} Spiel ${Number(source.matchupIndex || 0) + 1}`;
  }

  if (source.type === 'manual') {
    return source.label || fallback;
  }

  if (source.scope === 'group') {
    return `Gruppe Platz ${source.position || 1}`;
  }

  return `Gesamttabelle Platz ${source.position || 1}`;
}

function getDefaultChampionTitle(type, finalRoundName) {
  if (!allowsFinalHighlight(type)) return '';
  if (finalRoundName) return finalRoundName;
  return 'Champion';
}

function normalizeBracket(rounds, finalRoundName = '', highlightFinal = false, displayMode = 'bracket') {
  return rounds.map((round, roundIndex) => {
    const isFinalRound = roundIndex === rounds.length - 1;
    const resolvedName = isFinalRound && finalRoundName
      ? finalRoundName
      : round.name || `Runde ${roundIndex + 1}`;

    return {
      ...round,
      round: roundIndex + 1,
      name: resolvedName,
      title: resolvedName,
      roundName: resolvedName,
      isFinalRound,
      displayMode,
      highlightFinal: isFinalRound ? !!highlightFinal : false,
      matchups: (round.matchups || []).map((matchup, matchupIndex) => ({
        ...matchup,
        matchupIndex,
        team1Placeholder: getSourceLabel(matchup.team1Source, 'Teilnehmer offen'),
        team2Placeholder: getSourceLabel(matchup.team2Source, 'Teilnehmer offen'),
      })),
    };
  });
}

function getSourceUiValue(source) {
  if (!source) return 'standings_overall';
  if (source.type === 'winner') return 'winner';
  if (source.type === 'manual') return 'manual';
  if (source.scope === 'group') return 'standings_group';
  return 'standings_overall';
}

function buildQualificationRules(rounds) {
  const rules = [];

  normalizeBracket(rounds).forEach(round => {
    (round.matchups || []).forEach(matchup => {
      [
        ['home', matchup.team1Source],
        ['away', matchup.team2Source],
      ].forEach(([side, source]) => {
        if (!source || source.type !== 'standings') return;

        rules.push({
          side,
          round: round.round,
          matchupIndex: matchup.matchupIndex,
          scope: source.scope || 'overall',
          groupId: source.scope === 'group' ? source.groupId || '' : 'overall',
          position: Number(source.position || 1),
          label: getSourceLabel(source),
        });
      });
    });
  });

  return rules;
}

function SourceEditor({ label, source, groups, previousRounds, onChange }) {
  const sourceType = getSourceUiValue(source);

  const update = patch => {
    onChange({
      ...(source || createSideSource()),
      ...patch,
    });
  };

  const handleTypeChange = value => {
    if (value === 'standings_overall') {
      onChange({
        type: 'standings',
        scope: 'overall',
        groupId: '',
        position: Number(source?.position || 1),
      });
      return;
    }

    if (value === 'standings_group') {
      onChange({
        type: 'standings',
        scope: 'group',
        groupId: groups[0]?.id || '',
        position: Number(source?.position || 1),
      });
      return;
    }

    if (value === 'winner') {
      onChange({
        type: 'winner',
        round: previousRounds[0]?.round || 1,
        matchupIndex: 0,
      });
      return;
    }

    onChange({
      type: 'manual',
      label: source?.label || 'Teilnehmer offen',
    });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{label}</p>
        <Badge variant="outline" className="max-w-[170px] truncate text-[10px]">
          {getSourceLabel(source)}
        </Badge>
      </div>

      <Select value={sourceType} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="standings_overall">Gesamttabelle Platz</SelectItem>
          <SelectItem value="standings_group">Gruppen-/Conference-Platz</SelectItem>
          <SelectItem value="winner">Sieger aus vorherigem Spiel</SelectItem>
          <SelectItem value="manual">Manuell/offen</SelectItem>
        </SelectContent>
      </Select>

      {sourceType === 'standings_group' && (
        <div className="grid grid-cols-[1fr_90px] gap-2">
          <Select
            value={source?.groupId || groups[0]?.id || ''}
            onValueChange={value => update({ groupId: value })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Gruppe" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            min="1"
            value={source?.position || 1}
            onChange={event => update({ position: Number(event.target.value || 1) })}
            className="h-9 text-xs"
            placeholder="Platz"
          />
        </div>
      )}

      {sourceType === 'standings_overall' && (
        <Input
          type="number"
          min="1"
          value={source?.position || 1}
          onChange={event => update({ position: Number(event.target.value || 1) })}
          className="h-9 text-xs"
          placeholder="Platz in Gesamttabelle"
        />
      )}

      {sourceType === 'winner' && (
        previousRounds.length === 0 ? (
          <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-[10px] text-orange-300">
            Sieger-Quelle ist erst ab Runde 2 sinnvoll.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={String(source?.round || previousRounds[0]?.round || 1)}
              onValueChange={value => update({ round: Number(value), matchupIndex: 0 })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Runde" />
              </SelectTrigger>
              <SelectContent>
                {previousRounds.map(round => (
                  <SelectItem key={round.round} value={String(round.round)}>
                    {round.name || `Runde ${round.round}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="1"
              value={Number(source?.matchupIndex || 0) + 1}
              onChange={event => update({ matchupIndex: Number(event.target.value || 1) - 1 })}
              className="h-9 text-xs"
              placeholder="Spiel"
            />
          </div>
        )
      )}

      {sourceType === 'manual' && (
        <Input
          value={source?.label || ''}
          onChange={event => update({ label: event.target.value })}
          className="h-9 text-xs"
          placeholder="z.B. Teilnehmer offen"
        />
      )}
    </div>
  );
}

function TypeCard({ type, active, onClick }) {
  const Icon = type.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-gradient-to-br p-3 text-left transition-all active:scale-[0.99] ${
        active
          ? `${type.color} ring-1 ring-primary/40`
          : 'from-card to-card border-border/50 hover:border-primary/35'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black/20 border border-white/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-black">{type.label}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {type.description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function CompetitionWizard({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    publicName: '',
    logo: '',
    banner: '',
    leagueId: '',
    season: '',
    competitionType: 'playoffs',
    competitionFormat: 'bracket',
    finalRoundName: '',
    highlightFinal: true,
    startDate: '',
    endDate: '',
    championTitle: 'Champion',
    qualificationDescription: '',
    isPublished: false,
    rounds: [createRound(1)],
  });

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const selectedLeague = leagues.find(league => league.id === formData.leagueId);
  const selectedType = getCompetitionTypeConfig(formData.competitionType);
  const displayMode = selectedType.displayMode;
  const bracketMode = displayMode === 'bracket';

  const groups = useMemo(() => {
    if (!selectedLeague?.groupsEnabled || !Array.isArray(selectedLeague.groups)) return [];

    return selectedLeague.groups
      .map(group => ({
        id: group.id || group.shortName || group.name,
        name: group.name || group.shortName || group.id,
      }))
      .filter(group => group.id);
  }, [selectedLeague]);

  const set = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateRound = (roundIndex, patch) => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.map((round, index) =>
        index === roundIndex ? { ...round, ...patch } : round
      ),
    }));
  };

  const updateMatchup = (roundIndex, matchupIndex, patch) => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.map((round, currentRoundIndex) => {
        if (currentRoundIndex !== roundIndex) return round;

        return {
          ...round,
          matchups: round.matchups.map((matchup, currentMatchupIndex) =>
            currentMatchupIndex === matchupIndex ? { ...matchup, ...patch } : matchup
          ),
        };
      }),
    }));
  };

  const addRound = () => {
    setFormData(prev => ({
      ...prev,
      rounds: [...prev.rounds, createRound(prev.rounds.length + 1)],
    }));
  };

  const removeRound = roundIndex => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.length <= 1
        ? prev.rounds
        : prev.rounds.filter((_, index) => index !== roundIndex),
    }));
  };

  const addMatchup = roundIndex => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.map((round, index) => {
        if (index !== roundIndex) return round;

        return {
          ...round,
          matchups: [...round.matchups, createMatchup(round.matchups.length)],
        };
      }),
    }));
  };

  const removeMatchup = (roundIndex, matchupIndex) => {
    setFormData(prev => ({
      ...prev,
      rounds: prev.rounds.map((round, index) => {
        if (index !== roundIndex) return round;

        return {
          ...round,
          matchups: round.matchups.length <= 1
            ? round.matchups
            : round.matchups.filter((_, currentIndex) => currentIndex !== matchupIndex),
        };
      }),
    }));
  };

  const handleLeagueChange = leagueId => {
    const league = leagues.find(item => item.id === leagueId);

    setFormData(prev => ({
      ...prev,
      leagueId,
      season: prev.season || league?.season || '',
    }));
  };

  const handleTypeChange = value => {
    const config = getCompetitionTypeConfig(value);
    const nextDisplayMode = config.displayMode;
    const canHighlight = config.allowsFinalHighlight;

    setFormData(prev => ({
      ...prev,
      competitionType: value,
      type: value,
      competitionFormat: nextDisplayMode === 'bracket' ? 'bracket' : 'games',
      finalRoundName: canHighlight ? prev.finalRoundName : '',
      highlightFinal: canHighlight ? true : false,
      championTitle: canHighlight ? getDefaultChampionTitle(value, prev.finalRoundName) : '',
      rounds: prev.rounds.map(round => ({
        ...round,
        venueMode: round.venueMode || 'home',
      })),
    }));
  };

  const handleFinalRoundNameChange = value => {
    setFormData(prev => ({
      ...prev,
      finalRoundName: value,
      championTitle: prev.championTitle === 'Champion' || prev.championTitle === prev.finalRoundName
        ? getDefaultChampionTitle(prev.competitionType, value)
        : prev.championTitle,
    }));
  };

  const validate = () => {
    if (!formData.name.trim()) return 'Bitte Wettbewerbsnamen eingeben.';
    if (!formData.leagueId) return 'Bitte Liga auswählen.';
    if (!formData.season.trim()) return 'Bitte Season eingeben.';
    if (!formData.competitionType) return 'Bitte Wettbewerbs-Typ auswählen.';
    if (formData.rounds.length === 0) return 'Bitte mindestens eine Runde erstellen.';

    const hasEmptyRoundName = formData.rounds.some(round => !round.name?.trim());
    if (hasEmptyRoundName) return 'Bitte alle Rundennamen ausfüllen.';

    const hasNoMatchups = formData.rounds.some(round => !round.matchups || round.matchups.length === 0);
    if (hasNoMatchups) return 'Jede Runde braucht mindestens ein Spiel.';

    const missingRoundVenue = formData.rounds.some(round =>
      round.venueMode === 'round' && !String(round.venue || '').trim()
    );
    if (missingRoundVenue) return 'Bitte bei festen Rundenstadien den Stadionnamen eintragen.';

    const invalidGroupSource = formData.rounds.some(round =>
      round.matchups.some(matchup =>
        [matchup.team1Source, matchup.team2Source].some(source =>
          source?.type === 'standings' &&
          source.scope === 'group' &&
          !source.groupId
        )
      )
    );

    if (invalidGroupSource) return 'Bitte bei Gruppenplatz-Quellen eine Gruppe auswählen.';

    return '';
  };

  const handleSubmit = () => {
    const error = validate();

    if (error) {
      toast.error(error);
      return;
    }

    const canHighlight = allowsFinalHighlight(formData.competitionType);
    const finalRoundName = canHighlight ? formData.finalRoundName.trim() : '';
    const highlightFinal = canHighlight ? formData.highlightFinal : false;
    const competitionFormat = isBracketType(formData.competitionType) ? 'bracket' : 'games';

    const bracket = normalizeBracket(
      formData.rounds,
      finalRoundName,
      highlightFinal,
      displayMode
    );

    const qualificationRules = buildQualificationRules(formData.rounds);

    const publicDisplaySettings = {
      ...DEFAULT_DISPLAY_SETTINGS,
      publicName: formData.publicName.trim(),
      finalRoundName,
      highlightFinal,
      displayMode,
      showBracketStats: displayMode === 'bracket',
    };

    onSuccess({
      name: formData.name.trim(),
      publicName: formData.publicName.trim(),
      displayName: formData.publicName.trim(),
      logo: formData.logo || null,
      banner: formData.banner || null,
      type: formData.competitionType,
      competitionType: formData.competitionType,
      format: competitionFormat,
      competitionFormat,
      system: competitionFormat,
      displayMode,
      finalRoundName,
      finalName: finalRoundName,
      highlightFinal,
      leagueId: formData.leagueId,
      season: formData.season.trim(),
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      defaultVenue: null,
      championTitle: canHighlight
        ? formData.championTitle || getDefaultChampionTitle(formData.competitionType, finalRoundName)
        : '',
      championAnimation: canHighlight ? 'confetti_trophy' : 'none',
      qualificationDescription: formData.qualificationDescription || '',
      qualificationMode: 'standings_sources',
      qualificationRules,
      autoFillAfterRegularSeason: true,
      autoCreateGamesAfterRegularSeason: false,
      createMissingGamesAfterRegularSeason: false,
      qualificationLockedUntilSeasonComplete: true,
      participantStatus: 'pending_regular_season',
      publicDisplaySettings,
      teamIds: [],
      gameIds: [],
      bracket,
      brackets: bracket,
      rounds: bracket.length,
      status: 'upcoming',
      isActive: true,
      isPublished: formData.isPublished,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <Card className="flex max-h-[calc(100dvh-48px)] w-full max-w-5xl flex-col overflow-hidden border-primary/15 bg-background">
        <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-gradient-to-br from-blue-950/40 via-slate-950 to-background p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Wettbewerb</p>
            <h2 className="mt-1 text-xl font-black">Wettbewerb erstellen</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Schlanker Builder: Typ wählen, Runden/Spiele frei bauen und je Runde den Spielort festlegen.
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black">Basis</h3>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </label>
                <Input
                  value={formData.name}
                  onChange={event => set('name', event.target.value)}
                  placeholder="z.B. GFL Playoffs 2026"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Öffentlicher Anzeigename optional
                </label>
                <Input
                  value={formData.publicName}
                  onChange={event => set('publicName', event.target.value)}
                  placeholder="z.B. GFL Playoffs & German Bowl 2026"
                />
              </div>

              <ImageUploadField
                label="Logo optional"
                value={formData.logo}
                onChange={value => set('logo', value)}
              />

              <ImageUploadField
                label="Banner optional"
                value={formData.banner}
                onChange={value => set('banner', value)}
              />

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Liga
                </label>
                <Select value={formData.leagueId} onValueChange={handleLeagueChange} disabled={leaguesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={leaguesLoading ? 'Ligen laden...' : 'Liga auswählen'} />
                  </SelectTrigger>
                  <SelectContent>
                    {leagues.map(league => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Season
                </label>
                <Input
                  value={formData.season}
                  onChange={event => set('season', event.target.value)}
                  placeholder="z.B. 2026"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Startdatum optional
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={event => set('startDate', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Enddatum optional
                </label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={event => set('endDate', event.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Qualifikation / Erklärung für Nutzer optional
                </label>
                <textarea
                  value={formData.qualificationDescription}
                  onChange={event => set('qualificationDescription', event.target.value)}
                  placeholder="z.B. Die besten Teams der Conferences qualifizieren sich. Die letzte Runde wird als German Bowl ausgetragen."
                  className="min-h-[88px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-4">
              <h3 className="text-sm font-black">Typ</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Playoffs werden als Turnierbaum mit klarer Finalrunde angezeigt.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COMPETITION_TYPES.map(type => (
                <TypeCard
                  key={type.value}
                  type={type}
                  active={formData.competitionType === type.value}
                  onClick={() => handleTypeChange(type.value)}
                />
              ))}
            </div>
          </section>

          {allowsFinalHighlight(formData.competitionType) && (
            <section className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-card to-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <div>
                  <h3 className="text-sm font-black">Finale / Bowl</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ein Bowl ist die letzte Runde der Playoffs, kein eigener Wettbewerb.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finalrunde / Bowl-Name optional
                  </label>
                  <Input
                    value={formData.finalRoundName}
                    onChange={event => handleFinalRoundNameChange(event.target.value)}
                    placeholder="z.B. German Bowl 2026, Gold Bowl, Finale"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Champion-Titel
                  </label>
                  <Input
                    value={formData.championTitle}
                    onChange={event => set('championTitle', event.target.value)}
                    placeholder="Champion"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.highlightFinal}
                    onChange={event => set('highlightFinal', event.target.checked)}
                  />
                  Finale mit Trophäe/Confetti hervorheben
                </label>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">
                  {bracketMode ? 'Turnierbaum-Struktur' : 'Spiel-Struktur'}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Du entscheidest frei, wie viele Runden und Spiele es gibt.
                </p>
              </div>

              <Button type="button" size="sm" variant="outline" onClick={addRound} className="h-8 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Runde
              </Button>
            </div>

            <div className="space-y-4">
              {formData.rounds.map((round, roundIndex) => {
                const previousRounds = formData.rounds
                  .slice(0, roundIndex)
                  .map((item, index) => ({ ...item, round: index + 1 }));

                const isFinalRound = roundIndex === formData.rounds.length - 1;
                const finalPreviewName = isFinalRound && formData.finalRoundName.trim()
                  ? formData.finalRoundName.trim()
                  : round.name;

                const venueMode = round.venueMode || 'home';

                return (
                  <div key={roundIndex} className="rounded-2xl border border-border/40 bg-secondary/20 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge
                        variant={isFinalRound && formData.highlightFinal && allowsFinalHighlight(formData.competitionType) ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {isFinalRound && formData.finalRoundName.trim()
                          ? 'Finale'
                          : `Runde ${roundIndex + 1}`}
                      </Badge>

                      <Input
                        value={finalPreviewName}
                        onChange={event => {
                          if (isFinalRound && formData.finalRoundName.trim() && allowsFinalHighlight(formData.competitionType)) {
                            handleFinalRoundNameChange(event.target.value);
                          } else {
                            updateRound(roundIndex, { name: event.target.value });
                          }
                        }}
                        className="h-9 text-xs"
                        placeholder={`Runde ${roundIndex + 1}`}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeRound(roundIndex)}
                        disabled={formData.rounds.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mb-3 rounded-xl border border-border/40 bg-card p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-black">Spielort dieser Runde</p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {VENUE_MODES.map(mode => {
                          const disabled = false;

                          return (
                            <button
                              key={mode.value}
                              type="button"
                              disabled={disabled}
                              onClick={() => updateRound(roundIndex, { venueMode: mode.value })}
                              className={`rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                venueMode === mode.value
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border/50 bg-background/50 hover:border-primary/30'
                              }`}
                            >
                              <p className="text-[11px] font-black">{mode.label}</p>
                              <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">{mode.description}</p>
                            </button>
                          );
                        })}
                      </div>

                      {venueMode === 'round' && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Input
                            value={round.venue || ''}
                            onChange={event => updateRound(roundIndex, { venue: event.target.value })}
                            className="h-9 text-xs"
                            placeholder="Stadionname"
                          />
                          <Input
                            value={round.venueAddress || ''}
                            onChange={event => updateRound(roundIndex, { venueAddress: event.target.value })}
                            className="h-9 text-xs"
                            placeholder="Adresse optional"
                          />
                          <Input
                            value={round.venueCity || ''}
                            onChange={event => updateRound(roundIndex, { venueCity: event.target.value })}
                            className="h-9 text-xs"
                            placeholder="Stadt optional"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {round.matchups.map((matchup, matchupIndex) => (
                        <div key={matchupIndex} className="rounded-xl border border-border/40 bg-card p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-xs font-black">
                              Spiel {matchupIndex + 1}
                            </p>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeMatchup(roundIndex, matchupIndex)}
                              disabled={round.matchups.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <SourceEditor
                              label="Heim"
                              source={matchup.team1Source}
                              groups={groups}
                              previousRounds={previousRounds}
                              onChange={source => updateMatchup(roundIndex, matchupIndex, { team1Source: source })}
                            />

                            <SourceEditor
                              label="Gast"
                              source={matchup.team2Source}
                              groups={groups}
                              previousRounds={previousRounds}
                              onChange={source => updateMatchup(roundIndex, matchupIndex, { team2Source: source })}
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <Input
                              type="date"
                              value={matchup.date || ''}
                              onChange={event => updateMatchup(roundIndex, matchupIndex, { date: event.target.value })}
                              className="h-9 text-xs"
                            />

                            <Input
                              type="time"
                              value={matchup.time || ''}
                              onChange={event => updateMatchup(roundIndex, matchupIndex, { time: event.target.value })}
                              className="h-9 text-xs"
                            />

                            {venueMode === 'manual' ? (
                              <Input
                                value={matchup.venue || ''}
                                onChange={event => updateMatchup(roundIndex, matchupIndex, { venue: event.target.value })}
                                className="h-9 text-xs"
                                placeholder="Spielort"
                              />
                            ) : (
                              <div className="flex h-9 items-center rounded-md border border-border/50 bg-background/40 px-3 text-[10px] text-muted-foreground">
                                {venueMode === 'round'
                                  ? round.venue || 'Rundenstadion'
                                  : 'Heimteam-Stadion'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addMatchup(roundIndex)}
                        className="h-8 w-full text-xs"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Spiel hinzufügen
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border/50 bg-card p-4 text-xs font-semibold">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={event => set('isPublished', event.target.checked)}
            />
            Direkt veröffentlichen
          </label>
        </div>

        <div className="flex gap-2 border-t border-border/50 bg-card p-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>

          <Button onClick={handleSubmit} className="flex-1">
            <Save className="mr-2 h-4 w-4" />
            Wettbewerb erstellen
          </Button>
        </div>
      </Card>
    </div>
  );
}
