import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { useAppUser } from '@/lib/useAppUser';
import useSetHeader from '@/hooks/useSetHeader';
import { detectStreamProvider } from '@/lib/scoreAutomation/streams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';

const SOURCE_TYPE_OPTIONS = [
  { value: 'not_configured', label: 'Nicht konfiguriert' },
  { value: 'json_feed', label: 'JSON Feed' },
  { value: 'football_aktuell', label: 'football-aktuell / Scoreboard Text' },
  { value: 'scoreboard_text', label: 'Allgemeiner Scoreboard Text' },
];

const STREAM_PROVIDER_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'custom', label: 'Custom' },
  { value: 'yardline', label: 'Yardline' },
];

const STREAM_STATUS_OPTIONS = ['scheduled', 'live', 'ended', 'disabled'];

const EMPTY_PROVIDER_FORM = {
  provider_key: '',
  name: '',
  description: '',
  source_type: 'json_feed',
  source_url: '',
  league_id: '',
  is_enabled: false,
};

const EMPTY_MAPPING_FORM = {
  provider_key: '',
  external_team_name: '',
  external_team_id: '',
  league_id: '',
  yardline_team_id: '',
};

const EMPTY_STREAM_FORM = {
  game_id: '',
  stream_url: '',
  title: '',
  provider: '',
  provider_label: '',
  embed_url: '',
  is_official: true,
  is_yardline_stream: false,
  status: 'scheduled',
};

function getTeamName(team) {
  return team?.shortName || team?.short_name || team?.name || 'Team offen';
}

function getLeagueName(league) {
  return league?.name || league?.title || league?.shortName || league?.short_name || 'Keine Liga';
}

function getGameTeam(game, key, teamsById) {
  const id = key === 'home' ? game?.homeTeamId || game?.home_team_id : game?.awayTeamId || game?.away_team_id;
  return teamsById?.get(id);
}

function getGameLabel(game, teamsById) {
  if (!game) return 'Spiel auswählen';
  const home = getGameTeam(game, 'home', teamsById);
  const away = getGameTeam(game, 'away', teamsById);
  return `${getTeamName(home)} vs ${getTeamName(away)} - ${game.date || 'ohne Datum'}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('de-DE');
}

function scoreLabel(home, away) {
  if (home === null || home === undefined || away === null || away === undefined) return '-';
  return `${home}:${away}`;
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function getProviderDraft(provider, drafts) {
  return {
    ...provider,
    ...asObject(drafts[provider.id]),
  };
}

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Score Automation API Fehler');
  }
  return payload;
}

function SectionTitle({ icon: Icon, title, children }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-base font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div className={`rounded-2xl border border-border/40 bg-background/40 text-center ${compact ? 'p-1.5' : 'p-3'}`}>
      <p className={`${compact ? 'text-sm' : 'text-xl'} font-black tabular-nums`}>{value ?? 0}</p>
      <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-wider text-muted-foreground`}>{label}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

export default function AdminScoreAutomation() {
  useSetHeader({ mode: 'back', title: 'Score Automation' });

  const queryClient = useQueryClient();
  const { appUser } = useAppUser();
  const { games = [], teams = [], teamsById, leagues = [], leaguesById } = useGlobalData();
  const [providerDrafts, setProviderDrafts] = useState({});
  const [providerForm, setProviderForm] = useState(EMPTY_PROVIDER_FORM);
  const [editingStreamId, setEditingStreamId] = useState('');
  const [mappingForm, setMappingForm] = useState(EMPTY_MAPPING_FORM);
  const [streamForm, setStreamForm] = useState(EMPTY_STREAM_FORM);

  const roleSlug = String(appUser?.roleSlug || appUser?.role || '').toLowerCase();
  const isAdmin = roleSlug === 'admin';

  const apiHeaders = useMemo(() => ({
    'content-type': 'application/json',
    'x-yardline-user-id': appUser?.id || '',
  }), [appUser?.id]);

  const scoreQuery = useQuery({
    queryKey: ['admin-score-automation-api', appUser?.id],
    queryFn: async () => {
      const response = await fetch('/api/admin/score-automation', { headers: apiHeaders });
      const payload = await parseApiResponse(response);
      return payload.data || {};
    },
    enabled: isAdmin && Boolean(appUser?.id),
  });

  const providers = scoreQuery.data?.providers || [];
  const runs = scoreQuery.data?.runs || [];
  const suggestions = scoreQuery.data?.suggestions || [];
  const mappings = scoreQuery.data?.mappings || [];
  const streams = scoreQuery.data?.streams || [];
  const streamProviderStatus = scoreQuery.data?.streamProviderStatus || { configured: false, message: 'Yardline Stream Provider nicht konfiguriert' };

  const openSuggestions = suggestions.filter(item => item.status === 'pending');
  const conflictSuggestions = suggestions.filter(item => item.status === 'conflict');

  const providerStats = useMemo(() => ({
    enabled: providers.filter(provider => provider.is_enabled).length,
    suggestions: openSuggestions.length,
    conflicts: conflictSuggestions.length,
  }), [conflictSuggestions.length, openSuggestions.length, providers]);

  const callApi = useMutation({
    mutationFn: async body => {
      const response = await fetch('/api/admin/score-automation', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ ...body, appUserId: appUser?.id }),
      });
      return parseApiResponse(response);
    },
    onSuccess: payload => {
      if (payload.data) {
        queryClient.setQueryData(['admin-score-automation-api', appUser?.id], payload.data);
      }
    },
    onError: error => toast.error(error.message),
  });

  const handleSaveProvider = async provider => {
    const draft = getProviderDraft(provider, providerDrafts);
    await callApi.mutateAsync({ action: 'save_provider', provider: draft });
    toast.success('Provider gespeichert');
  };

  const handleCreateProvider = async () => {
    if (!providerForm.provider_key.trim() || !providerForm.name.trim()) {
      toast.error('Provider Key und Name sind Pflicht');
      return;
    }

    await callApi.mutateAsync({ action: 'save_provider', provider: providerForm });
    setProviderForm(EMPTY_PROVIDER_FORM);
    toast.success('Provider erstellt');
  };

  const handleRunImport = async () => {
    const payload = await callApi.mutateAsync({ action: 'run_import' });
    toast.success(`${payload.result?.providers_checked || 0} Provider geprüft`);
    queryClient.invalidateQueries({ queryKey: ['global-data'] });
  };

  const handleSuggestion = async (suggestion, status) => {
    await callApi.mutateAsync({ action: 'review_suggestion', suggestion_id: suggestion.id, status });
    toast.success('Suggestion aktualisiert');
    if (status === 'approved') queryClient.invalidateQueries({ queryKey: ['global-data'] });
  };

  const handleCreateMapping = async () => {
    if (!mappingForm.provider_key || !mappingForm.external_team_name || !mappingForm.yardline_team_id) {
      toast.error('Provider, externer Teamname und Yardline-Team sind Pflicht');
      return;
    }

    await callApi.mutateAsync({ action: 'save_mapping', mapping: mappingForm });
    setMappingForm(EMPTY_MAPPING_FORM);
    toast.success('Mapping gespeichert');
  };

  const handleDeleteMapping = async id => {
    await callApi.mutateAsync({ action: 'delete_mapping', id });
    toast.success('Mapping gelöscht');
  };

  const handleUpsertStream = async () => {
    const detected = detectStreamProvider(streamForm.stream_url);
    if (!detected.valid && streamForm.provider !== 'yardline') {
      toast.error('Stream URL ist nicht gültig');
      return;
    }

    await callApi.mutateAsync({
      action: 'upsert_stream',
      stream: {
        ...streamForm,
        id: editingStreamId || undefined,
        provider: streamForm.provider || detected.provider,
        provider_label: streamForm.provider_label || detected.providerLabel,
        embed_url: streamForm.embed_url || detected.embedUrl,
      },
    });
    setEditingStreamId('');
    setStreamForm(EMPTY_STREAM_FORM);
    toast.success('Stream gespeichert');
  };

  const handleDisableStream = async id => {
    await callApi.mutateAsync({ action: 'disable_stream', id });
    toast.success('Stream deaktiviert');
  };

  const setProviderDraft = (id, patch) => {
    setProviderDrafts(current => ({
      ...current,
      [id]: {
        ...asObject(current[id]),
        ...patch,
      },
    }));
  };

  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="rounded-2xl p-4">
          <p className="font-bold">Kein Zugriff</p>
          <p className="mt-1 text-sm text-muted-foreground">Score Automation ist nur für Admins sichtbar.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 py-6 pb-24 sm:px-4">
      <div className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-black p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-500">The Yardline</p>
        <h1 className="mt-2 text-2xl font-black italic leading-none">Score Automation</h1>
        <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-white/58">
          Provider, echte Ergebnisquellen, Team-Mapping, Suggestions und Stream Center. Öffentliche App-Seiten werden dadurch nicht verändert.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Metric label="Aktive Provider" value={providerStats.enabled} />
        <Metric label="Suggestions" value={providerStats.suggestions} />
        <Metric label="Konflikte" value={providerStats.conflicts} />
      </div>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={Zap} title="Provider">
          <Button onClick={handleRunImport} disabled={callApi.isPending || scoreQuery.isLoading}>
            {callApi.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
            Jetzt prüfen
          </Button>
        </SectionTitle>

        {scoreQuery.isError && (
          <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {scoreQuery.error?.message || 'Score Automation konnte nicht geladen werden.'}
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-border/50 bg-background/40 p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">Neuen Provider anlegen</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <Input value={providerForm.provider_key} onChange={event => setProviderForm(current => ({ ...current, provider_key: event.target.value }))} placeholder="provider_key" />
            <Input value={providerForm.name} onChange={event => setProviderForm(current => ({ ...current, name: event.target.value }))} placeholder="Name" />
            <select value={providerForm.source_type} onChange={event => setProviderForm(current => ({ ...current, source_type: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              {SOURCE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={providerForm.league_id} onChange={event => setProviderForm(current => ({ ...current, league_id: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">Keine Liga</option>
              {leagues.map(league => <option key={league.id} value={league.id}>{getLeagueName(league)}</option>)}
            </select>
            <Input className="xl:col-span-2" value={providerForm.source_url} onChange={event => setProviderForm(current => ({ ...current, source_url: event.target.value }))} placeholder="Source URL" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2">
            <span className="text-sm font-semibold">Direkt aktivieren</span>
            <Switch checked={providerForm.is_enabled} onCheckedChange={value => setProviderForm(current => ({ ...current, is_enabled: value }))} />
          </div>
          <Button className="mt-2 w-full" variant="outline" onClick={handleCreateProvider} disabled={callApi.isPending}>
            <Plus className="mr-1.5 h-4 w-4" />
            Provider speichern
          </Button>
        </div>

        <div className="space-y-3">
          {providers.map(provider => {
            const draft = getProviderDraft(provider, providerDrafts);
            const league = leaguesById?.get(draft.league_id);
            return (
              <Card key={provider.id} className="rounded-2xl p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black">{provider.name}</p>
                    <p className="text-[11px] text-muted-foreground">{provider.provider_key} · {getLeagueName(league)}</p>
                  </div>
                  <Badge variant={draft.is_enabled ? 'default' : 'outline'}>{draft.is_enabled ? 'aktiv' : 'inaktiv'}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select value={draft.source_type || 'not_configured'} onChange={event => setProviderDraft(provider.id, { source_type: event.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                    {SOURCE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={draft.league_id || ''} onChange={event => setProviderDraft(provider.id, { league_id: event.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
                    <option value="">Keine Liga</option>
                    {leagues.map(item => <option key={item.id} value={item.id}>{getLeagueName(item)}</option>)}
                  </select>
                  <Input className="sm:col-span-2" value={draft.source_url || ''} onChange={event => setProviderDraft(provider.id, { source_url: event.target.value })} placeholder="Source URL" />
                  <Input className="sm:col-span-2" value={draft.description || ''} onChange={event => setProviderDraft(provider.id, { description: event.target.value })} placeholder="Beschreibung" />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">Provider aktiv</p>
                    <p className="text-[11px] text-muted-foreground">Nur aktive Provider werden geprüft.</p>
                  </div>
                  <Switch checked={draft.is_enabled === true} onCheckedChange={value => setProviderDraft(provider.id, { is_enabled: value })} />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <InfoBlock label="Letzter Lauf" value={formatDateTime(provider.last_run_at)} />
                  <InfoBlock label="Letzter Erfolg" value={formatDateTime(provider.last_success_at)} />
                  <InfoBlock label="Fehler" value={provider.last_error || '-'} />
                  <Button onClick={() => handleSaveProvider(provider)} disabled={callApi.isPending}>
                    <Save className="mr-1.5 h-4 w-4" />
                    Speichern
                  </Button>
                </div>
              </Card>
            );
          })}

          {providers.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Noch keine Provider vorhanden. Migration prüfen.</p>
          )}
        </div>
      </section>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={AlertTriangle} title="Suggestions" />
        <div className="space-y-3">
          {suggestions.map(suggestion => {
            const game = games.find(item => item.id === suggestion.game_id);
            return (
              <Card key={suggestion.id} className="rounded-2xl p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black">{getGameLabel(game, teamsById)}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.provider_key} · Confidence {Number(suggestion.confidence || 0).toFixed(2)}</p>
                  </div>
                  <Badge variant={suggestion.status === 'pending' ? 'default' : 'outline'}>{suggestion.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <InfoBlock label="Quelle Teams" value={`${suggestion.detected_home_team_name || '-'} vs ${suggestion.detected_away_team_name || '-'}`} />
                  <InfoBlock label="Quelle Score" value={scoreLabel(suggestion.detected_home_score, suggestion.detected_away_score)} />
                  <InfoBlock label="Aktuell" value={scoreLabel(suggestion.current_home_score, suggestion.current_away_score)} />
                  <InfoBlock label="Status" value={`${suggestion.current_status || '-'} → ${suggestion.detected_status || '-'}`} />
                </div>
                {suggestion.status === 'pending' || suggestion.status === 'conflict' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => handleSuggestion(suggestion, 'approved')} disabled={callApi.isPending}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Übernehmen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSuggestion(suggestion, 'ignored')} disabled={callApi.isPending}>Ignorieren</Button>
                    <Button size="sm" variant="outline" onClick={() => handleSuggestion(suggestion, 'conflict')} disabled={callApi.isPending}>Konflikt</Button>
                    {suggestion.source_url && (
                      <a href={suggestion.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm">
                        Quelle <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
          {suggestions.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Keine Suggestions.</p>}
        </div>
      </section>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={RefreshCw} title="Import Runs" />
        <div className="space-y-2">
          {runs.map(run => (
            <Card key={run.id} className="rounded-2xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black">{run.provider_key}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(run.started_at)} · {run.error_message || 'ok'}</p>
                </div>
                <Badge>{run.status}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] text-muted-foreground">
                <Metric label="Checked" value={run.games_checked} compact />
                <Metric label="Found" value={run.scores_found} compact />
                <Metric label="Updated" value={run.scores_updated} compact />
                <Metric label="Suggest" value={run.suggestions_created} compact />
                <Metric label="Conflict" value={run.conflicts_found} compact />
              </div>
            </Card>
          ))}
          {runs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Import Runs.</p>}
        </div>
      </section>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={ShieldCheck} title="Team Mapping" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <select value={mappingForm.provider_key} onChange={event => setMappingForm(current => ({ ...current, provider_key: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
            <option value="">Provider</option>
            {providers.map(provider => <option key={provider.provider_key} value={provider.provider_key}>{provider.provider_key}</option>)}
          </select>
          <Input value={mappingForm.external_team_name} onChange={event => setMappingForm(current => ({ ...current, external_team_name: event.target.value }))} placeholder="External Team Name" />
          <Input value={mappingForm.external_team_id} onChange={event => setMappingForm(current => ({ ...current, external_team_id: event.target.value }))} placeholder="External ID optional" />
          <select value={mappingForm.yardline_team_id} onChange={event => setMappingForm(current => ({ ...current, yardline_team_id: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
            <option value="">Yardline Team</option>
            {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <Button onClick={handleCreateMapping} disabled={callApi.isPending}>Speichern</Button>
        </div>
        <div className="mt-3 space-y-2">
          {mappings.map(mapping => (
            <div key={mapping.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2 text-xs">
              <span className="min-w-0 truncate">{mapping.provider_key} · {mapping.external_team_name}</span>
              <span className="font-bold">{getTeamName(teamsById?.get(mapping.yardline_team_id))}</span>
              <Button size="icon" variant="ghost" onClick={() => handleDeleteMapping(mapping.id)} disabled={callApi.isPending}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={Radio} title="Stream Center">
          <Badge variant={streamProviderStatus.configured ? 'default' : 'outline'}>{streamProviderStatus.message}</Badge>
        </SectionTitle>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={streamForm.game_id} onChange={event => setStreamForm(current => ({ ...current, game_id: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm sm:col-span-2">
            <option value="">Spiel auswählen</option>
            {games.map(game => <option key={game.id} value={game.id}>{getGameLabel(game, teamsById)}</option>)}
          </select>
          <Input value={streamForm.stream_url} onChange={event => {
            const detected = detectStreamProvider(event.target.value);
            setStreamForm(current => ({ ...current, stream_url: event.target.value, provider: detected.provider || current.provider, provider_label: detected.providerLabel || current.provider_label, embed_url: detected.embedUrl || current.embed_url }));
          }} placeholder="Stream URL" />
          <Input value={streamForm.title} onChange={event => setStreamForm(current => ({ ...current, title: event.target.value }))} placeholder="Titel" />
          <select value={streamForm.provider} onChange={event => setStreamForm(current => ({ ...current, provider: event.target.value, is_yardline_stream: event.target.value === 'yardline' }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
            <option value="">Auto Provider</option>
            {STREAM_PROVIDER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={streamForm.status} onChange={event => setStreamForm(current => ({ ...current, status: event.target.value }))} className="h-10 rounded-xl border border-border bg-background px-3 text-sm">
            {STREAM_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <Button className="sm:col-span-2" onClick={handleUpsertStream} disabled={!streamForm.game_id || !streamForm.stream_url || callApi.isPending}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            {editingStreamId ? 'Stream aktualisieren' : 'Stream speichern'}
          </Button>
          {editingStreamId && (
            <Button className="sm:col-span-2" variant="outline" onClick={() => { setEditingStreamId(''); setStreamForm(EMPTY_STREAM_FORM); }}>
              Bearbeitung abbrechen
            </Button>
          )}
        </div>

        {streamForm.embed_url && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/50 bg-black">
            <iframe title="Stream Vorschau" src={streamForm.embed_url} className="aspect-video w-full" allowFullScreen />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {streams.map(stream => (
            <Card key={stream.id} className="rounded-2xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{stream.title || stream.provider_label || stream.provider}</p>
                  <p className="truncate text-xs text-muted-foreground">{getGameLabel(games.find(game => game.id === stream.game_id), teamsById)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={stream.status === 'disabled' ? 'outline' : 'default'}>{stream.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStreamId(stream.id);
                      setStreamForm({
                        game_id: stream.game_id || '',
                        stream_url: stream.stream_url || '',
                        title: stream.title || '',
                        provider: stream.provider || '',
                        provider_label: stream.provider_label || '',
                        embed_url: stream.embed_url || '',
                        is_official: stream.is_official !== false,
                        is_yardline_stream: stream.is_yardline_stream === true,
                        status: stream.status || 'scheduled',
                      });
                    }}
                  >
                    Bearbeiten
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleDisableStream(stream.id)} disabled={callApi.isPending}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {streams.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Noch keine Streams.</p>}
        </div>
      </section>
    </div>
  );
}
