import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/imageUtils';

function createLocalId() {
  return `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveProviders(providerRequests = []) {
  return providerRequests
    .filter(item =>
      item.type === 'streaming_provider' &&
      item.status === 'approved' &&
      item.providerIsActive !== false &&
      item.providerName
    )
    .sort((a, b) => {
      const orderA = Number(a.providerSortOrder || 0);
      const orderB = Number(b.providerSortOrder || 0);

      if (orderA !== orderB) return orderA - orderB;

      return String(a.providerName || '').localeCompare(String(b.providerName || ''));
    });
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
    streamPlatform: primary?.providerName || primary?.platform || '',
    streamProviderId: primary?.providerId || '',
    streamProviderName: primary?.providerName || primary?.platform || '',
    streamProviderLogo: primary?.providerLogo || '',
    streamLabel: primary?.label || '',
    streamStatus: primary?.status || 'pending',
    streamEnabled: !!primary && primary.status === 'approved' && primary.enabled !== false,
    streamSubmittedByUserId: primary?.submittedByUserId || '',
    streamUpdatedAt: cleaned.length > 0 ? new Date().toISOString() : '',
  };
}

export default function StreamSubmitSheet({ game, canSubmit = false }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [providerId, setProviderId] = useState('');
  const [streamLabel, setStreamLabel] = useState('');

  const { data: providerRequests = [] } = useQuery({
    queryKey: ['streamingProviders'],
    queryFn: () => base44.entities.SupportRequest.list('providerSortOrder'),
  });

  const providers = useMemo(() => {
    return getActiveProviders(providerRequests);
  }, [providerRequests]);

  const selectedProvider = providers.find(provider => provider.id === providerId);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.update(game.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminGames'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['game', game.id] });
      toast.success('Stream eingereicht');
      setOpen(false);
      setStreamUrl('');
      setProviderId('');
      setStreamLabel('');
    },
    onError: () => toast.error('Fehler beim Einreichen'),
  });

  const handleSubmit = async () => {
    if (!streamUrl.trim()) {
      toast.error('Stream URL erforderlich');
      return;
    }

    if (!selectedProvider) {
      toast.error('Bitte Streaming-Anbieter auswählen');
      return;
    }

    const user = await base44.auth.me();
    const currentLinks = normalizeStreamLinks(game);
    const nextStream = {
      id: createLocalId(),
      label: streamLabel.trim() || selectedProvider.providerName || 'Stream',
      url: streamUrl.trim(),
      providerId: selectedProvider.id,
      providerName: selectedProvider.providerName || '',
      providerLogo: selectedProvider.providerLogo || '',
      platform: selectedProvider.providerName || '',
      status: 'pending',
      enabled: true,
      submittedByUserId: user?.id || '',
      submittedByRole: 'club',
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    };

    updateMutation.mutate(buildStreamPayload([...currentLinks, nextStream]));
  };

  if (!canSubmit) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
          <Play className="w-3 h-3" />
          Stream hinzufügen
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-w-lg mx-auto">
        <SheetHeader>
          <SheetTitle>Stream einreichen</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
  <label className="text-xs font-semibold">Streaming-Anbieter</label>

  {providers.length === 0 ? (
    <p className="text-xs text-yellow-400">
      Noch keine Streaming-Anbieter verfügbar. Bitte beim Admin anfragen.
    </p>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      {providers.map(provider => {
        const selected = providerId === provider.id;

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => {
  setProviderId(provider.id);
  setStreamUrl(current => current || provider.providerWebsite || '');
}}
            className={`min-h-[72px] rounded-xl border px-2 py-2 text-left transition-colors ${
              selected
                ? 'border-primary bg-primary/15'
                : 'border-border/50 bg-secondary/20 hover:border-primary/40'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {provider.providerLogo ? (
                <img
                  src={getImageUrl(provider.providerLogo)}
                  alt=""
                  className="w-8 h-8 rounded-lg object-contain bg-background border border-border/40 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {provider.providerName}
                </p>
                <p className={`text-[10px] ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                  {selected ? 'Ausgewählt' : 'Auswählen'}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  )}
</div>
          <div className="space-y-2">
            <label className="text-xs font-semibold">Stream URL</label>
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://..."
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Label optional</label>
            <Input
              value={streamLabel}
              onChange={(e) => setStreamLabel(e.target.value)}
              placeholder="z.B. Hauptstream, Away Stream, HD"
              className="h-10 text-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Der Stream wird zur Genehmigung eingereicht und erscheint nach Bestätigung durch den Admin.
          </p>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={updateMutation.isPending || !streamUrl.trim() || !providerId}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Stream einreichen'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}