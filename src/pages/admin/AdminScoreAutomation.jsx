import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
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
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const STREAM_PROVIDER_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'custom', label: 'Custom' },
  { value: 'yardline', label: 'Yardline' },
];

const STREAM_STATUS_OPTIONS = ['scheduled', 'live', 'ended', 'disabled'];

function getTeamName(team) {
  return team?.shortName || team?.name || 'Team offen';
}

function getGameLabel(game, teamsById) {
  if (!game) return 'Spiel auswählen';
  const home = teamsById?.get(game.homeTeamId || game.home_team_id);
  const away = teamsById?.get(game.awayTeamId || game.away_team_id);
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

async function fetchTable(table, order = 'created_at', ascending = false, limit = 100) {
  let query = supabase.from(table).select('*').order(order, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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

export default function AdminScoreAutomation() {
  useSetHeader({ mode: 'back', title: 'Score Automation' });

  const queryClient = useQueryClient();
  const { appUser } = useAppUser();
  const { games, teams, teamsById, leaguesById } = useGlobalData();
  const [providerDrafts, setProviderDrafts] = useState({});
  const [cronSecret, setCronSecret] = useState('');
  const [editingStreamId, setEditingStreamId] = useState('');
  const [mappingForm, setMappingForm] = useState({ provider_key: '', external_team_name: '', external_team_id: '', league_id: '', yardline_team_id: '' });
  const [streamForm, setStreamForm] = useState({ game_id: '', stream_url: '', title: '', provider: '', provider_label: '', embed_url: '', is_official: true, is_yardline_stream: false, status: 'scheduled' });

  const roleSlug = String(appUser?.roleSlug || appUser?.role || '').toLowerCase();
  const isAdmin = roleSlug === 'admin';

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['score-providers'],
    queryFn: () => fetchTable('score_providers', 'created_at', true, 100),
    enabled: isAdmin,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['score-import-runs'],
    queryFn: () => fetchTable('score_import_runs', 'created_at', false, 30),
    enabled: isAdmin,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['score-import-suggestions'],
    queryFn: () => fetchTable('score_import_suggestions', 'created_at', false, 100),
    enabled: isAdmin,
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['external-team-mappings'],
    queryFn: () => fetchTable('external_team_mappings', 'created_at', false, 200),
    enabled: isAdmin,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['game-streams'],
    queryFn: () => fetchTable('game_streams', 'created_at', false, 100),
    enabled: isAdmin,
  });

  const openSuggestions = suggestions.filter(item => item.status === 'pending');
  const conflictSuggestions = suggestions.filter(item => item.status === 'conflict');

  const providerStats = useMemo(() => ({
    enabled: providers.filter(provider => provider.is_enabled).length,
    suggestions: openSuggestions.length,
    conflicts: conflictSuggestions.length,
  }), [conflictSuggestions.length, openSuggestions.length, providers]);

  const saveProvider = useMutation({
    mutationFn: async provider => {
      const draft = providerDrafts[provider.id] || {};
      const { error } = await supabase
        .from('score_providers')
        .update({
          is_enabled: draft.is_enabled ?? provider.is_enabled,
          source_url: draft.source_url ?? provider.source_url,
          league_id: (draft.league_id ?? provider.league_id) || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', provider.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Provider gespeichert');
      queryClient.invalidateQueries({ queryKey: ['score-providers'] });
    },
    onError: error => toast.error(error.message),
  });

  const runCron = useMutation({
    mutationFn: async () => {
      if (!cronSecret.trim()) throw new Error('SCORE_AUTOMATION_SECRET fehlt');

      const response = await fetch('/api/cron/score-automation', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-score-automation-secret': cronSecret.trim(),
        },
        body: JSON.stringify({ source: 'admin' }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Score Automation konnte nicht gestartet werden');
      return payload;
    },
    onSuccess: payload => {
      toast.success(`${payload.providers_checked || 0} Provider geprüft`);
      queryClient.invalidateQueries({ queryKey: ['score-providers'] });
      queryClient.invalidateQueries({ queryKey: ['score-import-runs'] });
      queryClient.invalidateQueries({ queryKey: ['score-import-suggestions'] });
    },
    onError: error => toast.error(error.message),
  });

  const suggestionMutation = useMutation({
    mutationFn: async ({ suggestion, status }) => {
      if (status === 'approved') {
        const game = games.find(item => item.id === suggestion.game_id);
        if (!game) throw new Error('Spiel nicht gefunden');

        const nextStatus = suggestion.detected_status === 'final'
          ? 'final'
          : suggestion.detected_status === 'live'
            ? 'live'
            : game.status;

        const { error: gameError } = await supabase
          .from('games')
          .update({
            score_home: suggestion.detected_home_score,
            score_away: suggestion.detected_away_score,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', suggestion.game_id);

        if (gameError) throw gameError;

        const { error: logError } = await supabase.from('score_update_logs').insert({
          game_id: suggestion.game_id,
          provider_key: suggestion.provider_key,
          old_home_score: suggestion.current_home_score,
          old_away_score: suggestion.current_away_score,
          new_home_score: suggestion.detected_home_score,
          new_away_score: suggestion.detected_away_score,
          old_status: suggestion.current_status,
          new_status: nextStatus,
          update_source: 'admin_review',
          created_by: appUser?.id || null,
        });

        if (logError) throw logError;
      }

      const { error } = await supabase
        .from('score_import_suggestions')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: appUser?.id || null,
        })
        .eq('id', suggestion.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Suggestion aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['score-import-suggestions'] });
    },
    onError: error => toast.error(error.message),
  });

  const createMapping = useMutation({
    mutationFn: async () => {
      const payload = {
        ...mappingForm,
        league_id: mappingForm.league_id || null,
        external_team_id: mappingForm.external_team_id || null,
        confidence: 1,
        is_verified: true,
      };
      const { error } = await supabase.from('external_team_mappings').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapping gespeichert');
      setMappingForm({ provider_key: '', external_team_name: '', external_team_id: '', league_id: '', yardline_team_id: '' });
      queryClient.invalidateQueries({ queryKey: ['external-team-mappings'] });
    },
    onError: error => toast.error(error.message),
  });

  const upsertStream = useMutation({
    mutationFn: async () => {
      const detected = detectStreamProvider(streamForm.stream_url);
      if (!detected.valid) throw new Error('Stream URL ist nicht gültig');

      const provider = streamForm.provider || detected.provider;
      const payload = {
        game_id: streamForm.game_id,
        provider,
        stream_url: streamForm.stream_url.trim(),
        embed_url: streamForm.embed_url || detected.embedUrl,
        title: streamForm.title.trim() || detected.providerLabel,
        provider_label: streamForm.provider_label || detected.providerLabel,
        is_official: streamForm.is_official,
        is_yardline_stream: provider === 'yardline' || streamForm.is_yardline_stream,
        status: streamForm.status,
        updated_at: new Date().toISOString(),
        created_by: appUser?.id || null,
      };

      const query = editingStreamId
        ? supabase.from('game_streams').update(payload).eq('id', editingStreamId)
        : supabase.from('game_streams').insert(payload);

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stream gespeichert');
      setEditingStreamId('');
      setStreamForm({ game_id: '', stream_url: '', title: '', provider: '', provider_label: '', embed_url: '', is_official: true, is_yardline_stream: false, status: 'scheduled' });
      queryClient.invalidateQueries({ queryKey: ['game-streams'] });
    },
    onError: error => toast.error(error.message),
  });

  const disableStream = useMutation({
    mutationFn: async id => {
      const { error } = await supabase
        .from('game_streams')
        .update({ status: 'disabled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game-streams'] }),
    onError: error => toast.error(error.message),
  });

  if (!isAdmin) return null;

  if (providersLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-3 py-5 pb-24">
      <section className="mb-5 rounded-[26px] border border-primary/20 bg-card p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black italic leading-tight">Score Automation</h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Interne Grundlage für Provider, Review, Logs, Cron und Stream Center.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Provider aktiv" value={providerStats.enabled} />
          <Metric label="Offen" value={providerStats.suggestions} />
          <Metric label="Konflikte" value={providerStats.conflicts} />
        </div>
      </section>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={Settings2} title="Provider">
          <div className="flex max-w-full flex-col gap-2 sm:flex-row">
            <Input
              value={cronSecret}
              onChange={event => setCronSecret(event.target.value)}
              placeholder="SCORE_AUTOMATION_SECRET"
              type="password"
              className="w-full sm:w-56"
            />
            <Button onClick={() => runCron.mutate()} disabled={runCron.isPending || !cronSecret.trim()}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${runCron.isPending ? 'animate-spin' : ''}`} />
              Jetzt prüfen
            </Button>
          </div>
        </SectionTitle>
        <div className="space-y-3">
          {providers.map(provider => {
            const draft = providerDrafts[provider.id] || {};
            const enabled = draft.is_enabled ?? provider.is_enabled;

            return (
              <Card key={provider.id} className="rounded-2xl p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black">{provider.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{provider.description || provider.provider_key}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={value => setProviderDrafts(current => ({ ...current, [provider.id]: { ...draft, is_enabled: value } }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    value={draft.source_url ?? provider.source_url ?? ''}
                    onChange={event => setProviderDrafts(current => ({ ...current, [provider.id]: { ...draft, source_url: event.target.value } }))}
                    placeholder="Source URL"
                  />
                  <select
                    value={draft.league_id ?? provider.league_id ?? ''}
                    onChange={event => setProviderDrafts(current => ({ ...current, [provider.id]: { ...draft, league_id: event.target.value } }))}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Keine Liga</option>
                    {[...leaguesById.values()].map(league => (
                      <option key={league.id} value={league.id}>{league.shortName || league.name}</option>
                    ))}
                  </select>
                  <Button onClick={() => saveProvider.mutate(provider)} disabled={saveProvider.isPending}>
                    Speichern
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Letzter Run: {formatDateTime(provider.last_run_at)}</span>
                  <span>Erfolg: {formatDateTime(provider.last_success_at)}</span>
                  <span className="truncate">Fehler: {provider.last_error || '-'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mb-5 rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={AlertTriangle} title="Suggestions" />
        <div className="space-y-2">
          {suggestions.slice(0, 30).map(suggestion => {
            const game = games.find(item => item.id === suggestion.game_id);
            const league = leaguesById?.get(suggestion.league_id || game?.leagueId);

            return (
              <Card key={suggestion.id} className="rounded-2xl p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">{getGameLabel(game, teamsById)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{league?.name || 'Keine Liga'} · Confidence {Math.round(Number(suggestion.confidence || 0) * 100)}%</p>
                  </div>
                  <Badge variant={suggestion.status === 'conflict' ? 'destructive' : 'outline'}>{suggestion.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoBlock label="Gefunden" value={`${suggestion.detected_home_team_name} ${scoreLabel(suggestion.detected_home_score, suggestion.detected_away_score)} ${suggestion.detected_away_team_name}`} />
                  <InfoBlock label="Aktuell" value={`${scoreLabel(suggestion.current_home_score, suggestion.current_away_score)} · ${suggestion.current_status || '-'}`} />
                </div>

                {suggestion.status === 'pending' || suggestion.status === 'conflict' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => suggestionMutation.mutate({ suggestion, status: 'approved' })}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Übernehmen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => suggestionMutation.mutate({ suggestion, status: 'ignored' })}>
                      Ignorieren
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => suggestionMutation.mutate({ suggestion, status: 'conflict' })}>
                      Konflikt
                    </Button>
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
          <Button onClick={() => createMapping.mutate()} disabled={!mappingForm.provider_key || !mappingForm.external_team_name || !mappingForm.yardline_team_id || createMapping.isPending}>Speichern</Button>
        </div>
        <div className="mt-3 space-y-2">
          {mappings.slice(0, 20).map(mapping => (
            <div key={mapping.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2 text-xs">
              <span className="min-w-0 truncate">{mapping.provider_key} · {mapping.external_team_name}</span>
              <span className="font-bold">{getTeamName(teamsById?.get(mapping.yardline_team_id))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] border border-border/50 bg-card p-4">
        <SectionTitle icon={Radio} title="Stream Center">
          <Badge variant="outline">Yardline Provider nicht konfiguriert</Badge>
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
          <Button className="sm:col-span-2" onClick={() => upsertStream.mutate()} disabled={!streamForm.game_id || !streamForm.stream_url || upsertStream.isPending}>
            <PlayCircle className="mr-1.5 h-4 w-4" />
            {editingStreamId ? 'Stream aktualisieren' : 'Stream speichern'}
          </Button>
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
                  <Button size="icon" variant="outline" onClick={() => disableStream.mutate(stream.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
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
