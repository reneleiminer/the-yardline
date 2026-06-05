import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import useSetHeader from '@/hooks/useSetHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import ImageUploadField from '@/components/create/ImageUploadField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Edit2,
  ExternalLink,
  Loader2,
  Plus,
  Radio,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_STREAM = {
  id: '',
  label: '',
  url: '',
  providerId: '',
  providerName: '',
  providerLogo: '',
  platform: '',
  status: 'pending',
  enabled: true,
  submittedByUserId: '',
  submittedByRole: '',
  createdAtUtc: '',
  updatedAtUtc: '',
};

const EMPTY_PROVIDER_FORM = {
  providerName: '',
  providerLogo: '',
  providerWebsite: '',
  providerDescription: '',
  providerIsActive: true,
  providerSortOrder: 0,
  message: '',
};

function createLocalId() {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getRoleValue(user) {
  return String(user?.roleSlug || user?.role || '').trim().toLowerCase();
}

function isAdmin(user) {
  return ['admin'].includes(getRoleValue(user));
}

function isClub(user) {
  return ['club', 'verein'].includes(getRoleValue(user));
}

function isLeague(user) {
  return ['league', 'liga'].includes(getRoleValue(user));
}

function getProviderLabel(provider) {
  return provider.providerName || provider.name || 'Streaming-Anbieter';
}

function getActiveProviders(providerRequests = []) {
  return providerRequests
    .filter(item =>
      item.type === 'streaming_provider' &&
      item.status === 'approved' &&
      item.providerIsActive !== false
    )
    .sort((a, b) => {
      if ((a.providerSortOrder || 0) !== (b.providerSortOrder || 0)) {
        return (a.providerSortOrder || 0) - (b.providerSortOrder || 0);
      }

      return getProviderLabel(a).localeCompare(getProviderLabel(b));
    });
}

function canManageGameStreams(user, game, teams) {
  if (!user || !game) return false;
  if (isAdmin(user)) return true;

  if (isLeague(user)) {
    return user.linkedLeagueId && user.linkedLeagueId === game.leagueId;
  }

  if (!isClub(user)) return false;

  const managedTeamIds = teams
    .filter(team =>
      team.linkedUserId === user.id ||
      team.assignedUserId === user.id ||
      team.managedByUserId === user.id ||
      user.connectedTeamId === team.id
    )
    .map(team => team.id);

  return managedTeamIds.includes(game.homeTeamId) || managedTeamIds.includes(game.awayTeamId);
}

function normalizeStreamLinks(game) {
  if (Array.isArray(game?.streamLinks) && game.streamLinks.length > 0) {
    return game.streamLinks.map((link, index) => ({
      id: link.id || createLocalId(),
      label: link.label || (index === 0 ? 'Hauptstream' : `Stream ${index + 1}`),
      url: link.url || '',
      providerId: link.providerId || '',
      providerName: link.providerName || link.platform || '',
      providerLogo: link.providerLogo || '',
      platform: link.platform || link.providerName || '',
      status: link.status || 'pending',
      enabled: link.enabled !== false,
      submittedByUserId: link.submittedByUserId || '',
      submittedByRole: link.submittedByRole || '',
      createdAtUtc: link.createdAtUtc || new Date().toISOString(),
      updatedAtUtc: link.updatedAtUtc || '',
    }));
  }

  if (game?.streamUrl) {
    return [
      {
        id: createLocalId(),
        label: game.streamLabel || 'Hauptstream',
        url: game.streamUrl,
        providerId: game.streamProviderId || '',
        providerName: game.streamProviderName || game.streamPlatform || '',
        providerLogo: game.streamProviderLogo || '',
        platform: game.streamPlatform || game.streamProviderName || '',
        status: game.streamStatus || 'pending',
        enabled: game.streamEnabled !== false,
        submittedByUserId: game.streamSubmittedByUserId || '',
        submittedByRole: 'legacy',
        createdAtUtc: game.streamUpdatedAt || new Date().toISOString(),
        updatedAtUtc: game.streamUpdatedAt || '',
      },
    ];
  }

  return [];
}

function cleanStreamLinks(streamLinks) {
  return (streamLinks || [])
    .map(link => ({
      id: link.id || createLocalId(),
      label: String(link.label || '').trim(),
      url: String(link.url || '').trim(),
      providerId: link.providerId || '',
      providerName: link.providerName || link.platform || '',
      providerLogo: link.providerLogo || '',
      platform: link.providerName || link.platform || '',
      status: link.status || 'pending',
      enabled: link.enabled !== false,
      submittedByUserId: link.submittedByUserId || '',
      submittedByRole: link.submittedByRole || '',
      createdAtUtc: link.createdAtUtc || new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    }))
    .filter(link => link.url);
}

function buildStreamPayload(streamLinks) {
  const cleaned = cleanStreamLinks(streamLinks);
  const primary = cleaned.find(link => link.status === 'approved' && link.enabled !== false) || cleaned[0] || null;

  return {
    streamLinks: cleaned,
    streamUrl: primary?.url || '',
    streamProviderId: primary?.providerId || '',
    streamProviderName: primary?.providerName || '',
    streamProviderLogo: primary?.providerLogo || '',
    streamPlatform: primary?.providerName || primary?.platform || null,
    streamLabel: primary?.label || null,
    streamStatus: primary?.status || 'pending',
    streamEnabled: !!primary && primary.status === 'approved' && primary.enabled !== false,
    streamSubmittedByUserId: primary?.submittedByUserId || null,
    streamUpdatedAt: cleaned.length > 0 ? new Date().toISOString() : null,
  };
}

function getStatusLabel(status) {
  if (status === 'approved') return 'Genehmigt';
  if (status === 'rejected') return 'Abgelehnt';
  return 'Ausstehend';
}

function getTeamName(teams, id, fallback = 'Offen') {
  const team = teams.find(item => item.id === id);
  return team?.shortName || team?.name || fallback;
}

function getLeagueName(leagues, id) {
  const league = leagues.find(item => item.id === id);
  return league?.shortName || league?.name || '-';
}

function StreamForm({ stream, providers, onChange, onSave, onCancel, isSaving, canApprove }) {
  const selectedProvider = providers.find(provider => provider.id === stream.providerId);

  const handleProviderChange = providerId => {
    const provider = providers.find(item => item.id === providerId);

    onChange({
      ...stream,
      providerId,
      providerName: provider ? getProviderLabel(provider) : '',
      providerLogo: provider?.providerLogo || '',
      platform: provider ? getProviderLabel(provider) : '',
      url: stream.url || provider?.providerWebsite || '',
    });
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-bold text-sm">
        {stream.id ? 'Stream bearbeiten' : 'Stream hinzufügen'}
      </h3>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Streaming-Anbieter
        </label>
        <Select value={stream.providerId || ''} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Anbieter auswählen" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {getProviderLabel(provider)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProvider?.providerLogo && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 p-2">
            <img
              src={selectedProvider.providerLogo}
              alt=""
              className="w-8 h-8 object-contain rounded bg-background"
            />
            <div className="min-w-0">
              <span className="block text-xs font-semibold truncate">{getProviderLabel(selectedProvider)}</span>
              <span className="block text-[10px] text-muted-foreground truncate">
                {selectedProvider.providerWebsite || 'kein Standard-Link'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Stream-Link
        </label>
        <Input
          value={stream.url}
          onChange={event => onChange({ ...stream, url: event.target.value })}
          placeholder="https://..."
          className="h-11 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Label
        </label>
        <Input
          value={stream.label}
          onChange={event => onChange({ ...stream, label: event.target.value })}
          placeholder="z.B. Hauptstream, Radio, Away Stream"
          className="h-11 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Status
          </label>
          <Select
            value={stream.status}
            onValueChange={value => onChange({ ...stream, status: value })}
            disabled={!canApprove}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end pb-2">
          <div className="flex items-center justify-between w-full">
            <label className="text-xs font-semibold">Aktiviert</label>
            <Switch
              checked={stream.enabled}
              onCheckedChange={value => onChange({ ...stream, enabled: value })}
            />
          </div>
        </div>
      </div>

      {!canApprove && (
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          Vereins-Streams werden erst nach Freigabe sichtbar.
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={onSave} className="flex-1" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
        </Button>

        <Button onClick={onCancel} variant="ghost" className="flex-1">
          Abbrechen
        </Button>
      </div>
    </Card>
  );
}

function ProviderAdminPanel({ appUser, providers, requests, refetch }) {
  const [form, setForm] = useState(EMPTY_PROVIDER_FORM);
  const [editingId, setEditingId] = useState(null);

  const providerMutation = useMutation({
    mutationFn: async data => {
      const payload = {
        userId: appUser.id,
        email: appUser.email || appUser.created_by || 'admin',
        username: appUser.username || 'admin',
        type: 'streaming_provider',
        message: data.message || data.providerDescription || data.providerName,
        status: 'approved',
        providerName: data.providerName.trim(),
        providerLogo: data.providerLogo || '',
        providerWebsite: data.providerWebsite || '',
        providerDescription: data.providerDescription || '',
        providerIsActive: data.providerIsActive !== false,
        providerSortOrder: Number(data.providerSortOrder || 0),
        requestedByRole: 'admin',
        reviewedBy: appUser.id,
        reviewedAt: new Date().toISOString(),
      };

      if (editingId) {
        return base44.entities.SupportRequest.update(editingId, payload);
      }

      return base44.entities.SupportRequest.create(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Anbieter aktualisiert' : 'Anbieter erstellt');
      setForm(EMPTY_PROVIDER_FORM);
      setEditingId(null);
      refetch();
    },
    onError: error => {
      console.error('SAVE STREAMING PROVIDER ERROR:', error);
      toast.error('Anbieter konnte nicht gespeichert werden');
    },
  });

  const requestMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.SupportRequest.update(id, {
      status,
      reviewedBy: appUser.id,
      reviewedAt: new Date().toISOString(),
      providerIsActive: status === 'approved',
    }),
    onSuccess: () => {
      toast.success('Anfrage aktualisiert');
      refetch();
    },
    onError: error => {
      console.error('UPDATE PROVIDER REQUEST ERROR:', error);
      toast.error('Anfrage konnte nicht aktualisiert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SupportRequest.delete(id),
    onSuccess: () => {
      toast.success('Anbieter gelöscht');
      refetch();
    },
    onError: error => {
      console.error('DELETE PROVIDER ERROR:', error);
      toast.error('Anbieter konnte nicht gelöscht werden');
    },
  });

  const editProvider = provider => {
    setEditingId(provider.id);
    setForm({
      providerName: provider.providerName || '',
      providerLogo: provider.providerLogo || '',
      providerWebsite: provider.providerWebsite || '',
      providerDescription: provider.providerDescription || '',
      providerIsActive: provider.providerIsActive !== false,
      providerSortOrder: provider.providerSortOrder || 0,
      message: provider.message || '',
    });
  };

  return (
    <div className="space-y-5 mb-6">
      <Card className="p-5 space-y-4">
        <h3 className="font-bold text-sm">
          {editingId ? 'Streaming-Anbieter bearbeiten' : 'Streaming-Anbieter erstellen'}
        </h3>

        <Input
          value={form.providerName}
          onChange={event => setForm(current => ({ ...current, providerName: event.target.value }))}
          placeholder="Name, z.B. AFLE Pro"
        />

        <ImageUploadField
          label="Logo"
          value={form.providerLogo}
          onChange={value => setForm(current => ({ ...current, providerLogo: value }))}
        />

        <Input
          value={form.providerWebsite}
          onChange={event => setForm(current => ({ ...current, providerWebsite: event.target.value }))}
          placeholder="Standard Stream-Link optional"
        />

        <Input
          type="number"
          value={form.providerSortOrder}
          onChange={event => setForm(current => ({ ...current, providerSortOrder: event.target.value }))}
          placeholder="Sortierung"
        />

        <Input
          value={form.providerDescription}
          onChange={event => setForm(current => ({ ...current, providerDescription: event.target.value }))}
          placeholder="Beschreibung optional"
        />

        <label className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-3 text-xs">
          Aktiv
          <Switch
            checked={form.providerIsActive}
            onCheckedChange={value => setForm(current => ({ ...current, providerIsActive: value }))}
          />
        </label>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (!form.providerName.trim()) {
                toast.error('Name erforderlich');
                return;
              }

              providerMutation.mutate(form);
            }}
            disabled={providerMutation.isPending}
            className="flex-1"
          >
            {providerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
          </Button>

          {editingId && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_PROVIDER_FORM);
              }}
            >
              Abbrechen
            </Button>
          )}
        </div>
      </Card>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Aktive Anbieter</p>
        <div className="space-y-2">
          {providers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Keine Anbieter erstellt.</p>
          ) : (
            providers.map(provider => (
              <Card key={provider.id} className="p-3">
                <div className="flex items-center gap-3">
                  {provider.providerLogo ? (
                    <img src={provider.providerLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-secondary" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Radio className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{getProviderLabel(provider)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {provider.providerWebsite || 'ohne Standard-Link'}
                    </p>
                  </div>

                  <Button size="sm" variant="outline" onClick={() => editProvider(provider)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(provider.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Anbieter-Anfragen</p>
        <div className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Keine offenen Anfragen.</p>
          ) : (
            requests.map(request => (
              <Card key={request.id} className="p-3">
                <div className="flex items-start gap-3">
                  {request.providerLogo ? (
                    <img src={request.providerLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-secondary" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Radio className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{request.providerName}</p>
                    <p className="text-xs text-muted-foreground">
                      von {request.username || request.email} · {request.requestedByRole || 'user'}
                    </p>
                    {request.providerWebsite && (
                      <p className="text-xs text-muted-foreground mt-1 break-all">
                        Standard-Link: {request.providerWebsite}
                      </p>
                    )}
                    {request.message && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                        {request.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-500"
                      onClick={() => requestMutation.mutate({ id: request.id, status: 'approved' })}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => requestMutation.mutate({ id: request.id, status: 'rejected' })}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderRequestPanel({ appUser, teams, refetch }) {
  const [form, setForm] = useState(EMPTY_PROVIDER_FORM);

  const requestMutation = useMutation({
    mutationFn: data => {
      const role = isLeague(appUser) ? 'league' : isClub(appUser) ? 'club' : 'user';
      const managedTeam = teams.find(team =>
        team.linkedUserId === appUser.id ||
        team.assignedUserId === appUser.id ||
        team.managedByUserId === appUser.id ||
        appUser.connectedTeamId === team.id
      );

      return base44.entities.SupportRequest.create({
        userId: appUser.id,
        email: appUser.email || appUser.created_by || '',
        username: appUser.username || '',
        type: 'streaming_provider_request',
        message: data.message || data.providerDescription || data.providerName,
        status: 'open',
        providerName: data.providerName.trim(),
        providerLogo: data.providerLogo || '',
        providerWebsite: data.providerWebsite || '',
        providerDescription: data.providerDescription || '',
        providerIsActive: false,
        requestedByRole: role,
        requestedTeamId: managedTeam?.id || appUser.connectedTeamId || '',
        requestedLeagueId: appUser.linkedLeagueId || '',
      });
    },
    onSuccess: () => {
      toast.success('Anbieter-Anfrage gesendet');
      setForm(EMPTY_PROVIDER_FORM);
      refetch();
    },
    onError: error => {
      console.error('REQUEST PROVIDER ERROR:', error);
      toast.error('Anfrage konnte nicht gesendet werden');
    },
  });

  return (
    <Card className="p-5 mb-5 space-y-4">
      <h3 className="font-bold text-sm">Streaming-Anbieter anfragen</h3>
      <p className="text-xs text-muted-foreground">
        Wenn ein Anbieter fehlt, kannst du ihn mit Logo und Standard-Link anfragen. Admins prüfen ihn und geben ihn danach frei.
      </p>

      <Input
        value={form.providerName}
        onChange={event => setForm(current => ({ ...current, providerName: event.target.value }))}
        placeholder="Anbieter-Name"
      />

      <ImageUploadField
        label="Logo"
        value={form.providerLogo}
        onChange={value => setForm(current => ({ ...current, providerLogo: value }))}
      />

      <Input
        value={form.providerWebsite}
        onChange={event => setForm(current => ({ ...current, providerWebsite: event.target.value }))}
        placeholder="Standard Stream-Link optional"
      />

      <Input
        value={form.message}
        onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
        placeholder="Kurze Begründung optional"
      />

      <Button
        onClick={() => {
          if (!form.providerName.trim()) {
            toast.error('Name erforderlich');
            return;
          }

          requestMutation.mutate(form);
        }}
        disabled={requestMutation.isPending}
        className="w-full"
      >
        {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anbieter anfragen'}
      </Button>
    </Card>
  );
}

export default function AdminStreams() {
  useSetHeader({ mode: 'back', title: 'Streams' });

  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const [editingGameId, setEditingGameId] = useState(null);
  const [editingStreamId, setEditingStreamId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [formData, setFormData] = useState(EMPTY_STREAM);

  const adminUser = isAdmin(appUser);
  const canApprove = isAdmin(appUser) || isLeague(appUser);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['adminGames'],
    queryFn: () => base44.entities.Game.list('-date', 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: providerRequests = [], refetch: refetchProviders } = useQuery({
    queryKey: ['streamingProviders'],
    queryFn: () => base44.entities.SupportRequest.list('-created_date', 500),
  });

  const providers = useMemo(() => getActiveProviders(providerRequests), [providerRequests]);

  const openProviderRequests = useMemo(() => {
    return providerRequests
      .filter(item => item.type === 'streaming_provider_request' && item.status === 'open')
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [providerRequests]);

  const managedGames = useMemo(() => {
    return games.filter(game => canManageGameStreams(appUser, game, teams));
  }, [appUser, games, teams]);

  const gamesWithStreams = managedGames.filter(game => normalizeStreamLinks(game).length > 0);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminGames'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Stream aktualisiert');
      resetForm();
    },
    onError: error => {
      console.error('UPDATE STREAM ERROR:', error);
      toast.error('Fehler beim Aktualisieren');
    },
  });

  const resetForm = () => {
    setFormData(EMPTY_STREAM);
    setEditingGameId(null);
    setEditingStreamId(null);
  };

  const startAdd = (game) => {
    setEditingGameId(game.id);
    setEditingStreamId(null);
    setFormData({
      ...EMPTY_STREAM,
      id: '',
      status: canApprove ? 'approved' : 'pending',
      submittedByUserId: appUser?.id || '',
      submittedByRole: isAdmin(appUser) ? 'admin' : isLeague(appUser) ? 'league' : 'club',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    });
  };

  const startEdit = (game, stream) => {
    setEditingGameId(game.id);
    setEditingStreamId(stream.id);
    setFormData({
      ...EMPTY_STREAM,
      ...stream,
      status: canApprove ? stream.status : 'pending',
      submittedByUserId: stream.submittedByUserId || appUser?.id || '',
      submittedByRole: stream.submittedByRole || (isAdmin(appUser) ? 'admin' : isLeague(appUser) ? 'league' : 'club'),
    });
  };

  const saveStream = () => {
    if (!editingGameId) return;

    if (!formData.url.trim()) {
      toast.error('Stream-Link erforderlich');
      return;
    }

    if (!formData.providerId) {
      toast.error('Bitte Streaming-Anbieter auswählen');
      return;
    }

    const game = managedGames.find(item => item.id === editingGameId);
    if (!game) return;

    const currentLinks = normalizeStreamLinks(game);
    const nextStream = {
      ...formData,
      id: formData.id || editingStreamId || createLocalId(),
      label: formData.label || formData.providerName || 'Stream',
      url: formData.url.trim(),
      status: canApprove ? formData.status : 'pending',
      enabled: formData.enabled !== false,
      submittedByUserId: formData.submittedByUserId || appUser?.id || '',
      submittedByRole: formData.submittedByRole || (isAdmin(appUser) ? 'admin' : isLeague(appUser) ? 'league' : 'club'),
      createdAtUtc: formData.createdAtUtc || new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    };

    const exists = currentLinks.some(link => link.id === nextStream.id);
    const nextLinks = exists
      ? currentLinks.map(link => link.id === nextStream.id ? nextStream : link)
      : [...currentLinks, nextStream];

    updateMutation.mutate({
      id: game.id,
      data: buildStreamPayload(nextLinks),
    });
  };

  const deleteStream = (game, streamId) => {
    const nextLinks = normalizeStreamLinks(game).filter(link => link.id !== streamId);

    updateMutation.mutate({
      id: game.id,
      data: buildStreamPayload(nextLinks),
    });
  };

  const updateStreamStatus = (game, streamId, status) => {
    const nextLinks = normalizeStreamLinks(game).map(link =>
      link.id === streamId
        ? {
            ...link,
            status,
            enabled: status === 'approved' ? link.enabled !== false : link.enabled,
            updatedAtUtc: new Date().toISOString(),
          }
        : link
    );

    updateMutation.mutate({
      id: game.id,
      data: buildStreamPayload(nextLinks),
    });
  };

  const filtered = gamesWithStreams.filter(game => {
    const streamLinks = normalizeStreamLinks(game);

    return streamLinks.some(stream => {
      if (filterStatus !== 'all' && stream.status !== filterStatus) return false;
      if (filterProvider !== 'all' && stream.providerId !== filterProvider) return false;
      return true;
    });
  });

  if (gamesLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24">
      <p className="text-xs text-muted-foreground mb-4">
        Verwalte feste Streaming-Anbieter und prüfe Stream-Links für Spiele.
      </p>

      {adminUser ? (
        <ProviderAdminPanel
          appUser={appUser}
          providers={providers}
          requests={openProviderRequests}
          refetch={refetchProviders}
        />
      ) : (
        <ProviderRequestPanel
          appUser={appUser}
          teams={teams}
          refetch={refetchProviders}
        />
      )}

      {providers.length === 0 && (
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs mb-4">
          Es sind noch keine aktiven Streaming-Anbieter vorhanden.
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Ausstehend</SelectItem>
            <SelectItem value="approved">Genehmigt</SelectItem>
            <SelectItem value="rejected">Abgelehnt</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-44 h-9 text-xs">
            <SelectValue placeholder="Anbieter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Anbieter</SelectItem>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                {getProviderLabel(provider)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Spiele ohne Stream
        </p>

        <div className="space-y-2">
          {managedGames
            .filter(game => normalizeStreamLinks(game).length === 0)
            .slice(0, 8)
            .map(game => (
              <Card key={game.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {getLeagueName(leagues, game.leagueId)} • {game.date || 'ohne Datum'}
                    </p>
                    <p className="text-sm font-semibold truncate">
                      {getTeamName(teams, game.homeTeamId, game.homeTeamPlaceholder)} vs {getTeamName(teams, game.awayTeamId, game.awayTeamPlaceholder)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startAdd(game)}
                    className="h-8 text-xs flex-shrink-0"
                    disabled={providers.length === 0}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Stream
                  </Button>
                </div>

                {editingGameId === game.id && !editingStreamId && (
                  <div className="mt-3">
                    <StreamForm
                      stream={formData}
                      providers={providers}
                      onChange={setFormData}
                      onSave={saveStream}
                      onCancel={resetForm}
                      isSaving={updateMutation.isPending}
                      canApprove={canApprove}
                    />
                  </div>
                )}
              </Card>
            ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {gamesWithStreams.length === 0
              ? 'Keine Streams vorhanden.'
              : 'Keine Streams mit diesen Filtern.'}
          </p>
        ) : (
          filtered.map(game => {
            const streamLinks = normalizeStreamLinks(game).filter(stream => {
              if (filterStatus !== 'all' && stream.status !== filterStatus) return false;
              if (filterProvider !== 'all' && stream.providerId !== filterProvider) return false;
              return true;
            });

            return (
              <Card key={game.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {getLeagueName(leagues, game.leagueId)} • {game.date || 'ohne Datum'}
                    </p>
                    <h4 className="font-semibold text-sm">
                      {getTeamName(teams, game.homeTeamId, game.homeTeamPlaceholder)} vs {getTeamName(teams, game.awayTeamId, game.awayTeamPlaceholder)}
                    </h4>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startAdd(game)}
                    className="h-8 text-xs flex-shrink-0"
                    disabled={providers.length === 0}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Link
                  </Button>
                </div>

                {editingGameId === game.id && !editingStreamId && (
                  <div className="mb-3">
                    <StreamForm
                      stream={formData}
                      providers={providers}
                      onChange={setFormData}
                      onSave={saveStream}
                      onCancel={resetForm}
                      isSaving={updateMutation.isPending}
                      canApprove={canApprove}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {streamLinks.map(stream => (
                    <div key={stream.id} className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex items-center gap-2">
                          {stream.providerLogo ? (
                            <img src={stream.providerLogo} alt="" className="w-8 h-8 object-contain rounded bg-background flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-background flex items-center justify-center flex-shrink-0">
                              <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {stream.label || stream.providerName || 'Stream'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stream.providerName || 'Anbieter'}
                              {stream.submittedByRole ? ` • ${stream.submittedByRole}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-wrap justify-end">
                          <Badge
                            variant={
                              stream.status === 'approved'
                                ? 'default'
                                : stream.status === 'rejected'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {getStatusLabel(stream.status)}
                          </Badge>

                          {stream.enabled === false && (
                            <Badge variant="outline" className="text-[10px]">
                              Deaktiviert
                            </Badge>
                          )}
                        </div>
                      </div>

                      <a
                        href={stream.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 p-2 bg-background/70 rounded text-xs break-all flex items-center gap-2 hover:text-primary"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        {stream.url}
                      </a>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => startEdit(game, stream)}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex-1"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Bearbeiten
                        </Button>

                        {canApprove && stream.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => updateStreamStatus(game, stream.id, 'approved')}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs flex-1 text-green-500 hover:text-green-600"
                              disabled={updateMutation.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Genehmigen
                            </Button>

                            <Button
                              onClick={() => updateStreamStatus(game, stream.id, 'rejected')}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs flex-1 text-destructive hover:text-destructive"
                              disabled={updateMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Ablehnen
                            </Button>
                          </>
                        )}

                        <Button
                          onClick={() => deleteStream(game, stream.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          disabled={updateMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {editingGameId === game.id && editingStreamId === stream.id && (
                        <div className="mt-3">
                          <StreamForm
                            stream={formData}
                            providers={providers}
                            onChange={setFormData}
                            onSave={saveStream}
                            onCancel={resetForm}
                            isSaving={updateMutation.isPending}
                            canApprove={canApprove}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}