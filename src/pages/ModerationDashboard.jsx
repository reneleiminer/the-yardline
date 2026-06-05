import React, { useEffect, useMemo, useState } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CheckCircle2,
  ExternalLink,
  Flame,
  Instagram,
  Loader2,
  Mail,
  Play,
  Save,
  Trash2,
  UploadCloud,
  User,
  Video,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const SUBMISSION_VERSION = 'community_clip_submission';
const PUBLIC_VERSION = 'community_clip';
const SETTINGS_VERSION = 'community_clip_settings';

const DEFAULT_INSTAGRAM_URL = 'https://instagram.com/theyardline';

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {
      note: message,
    };
  }
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function normalizeInstagram(value) {
  return String(value || '').trim().replace(/^@/, '');
}

function getInstagramUrl(value) {
  const handle = normalizeInstagram(value);
  if (!handle) return '';

  if (/^https?:\/\//i.test(handle)) return handle;

  return `https://instagram.com/${handle}`;
}

function getClipUrl(item) {
  const meta = parseMessage(item.message);
  return meta.clip_url || meta.preview_video_url || meta.external_video_url || item.imageUrl || '';
}

function normalizeClipItem(item) {
  const meta = parseMessage(item.message);

  return {
    ...item,
    meta,
    title: item.title || meta.title || '',
    submitterName: meta.submitter_name || meta.name || '',
    team: meta.team || '',
    instagram: meta.instagram || '',
    contact: meta.contact || '',
    note: meta.note || meta.description || '',
    clipUrl: getClipUrl(item),
    fileName: meta.file_name || '',
    sourceName: meta.source_name || meta.submitter_name || meta.instagram || 'Community',
    description: meta.description || meta.note || '',
    status: meta.status || (item.version === PUBLIC_VERSION ? 'published' : 'submitted'),
    submittedAt: meta.submitted_at || item.createdAtUtc || item.created_date || '',
    publishedAt: meta.published_at || '',
    isPublic: item.version === PUBLIC_VERSION && item.isActive !== false,
  };
}

function formatDate(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function DetailRow({ icon: Icon, label, value, href }) {
  if (!value) return null;

  const content = (
    <div className="flex items-start gap-2 text-xs">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {label}
        </p>

        <p className="text-xs font-semibold break-words">
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-border/50 bg-secondary/20 p-2 hover:border-primary/40 transition-colors"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-2">
      {content}
    </div>
  );
}

function CommunityClipSettingsCard({
  instagramUrl,
  setInstagramUrl,
  onSave,
  isSaving,
}) {
  const previewUrl = normalizeUrl(instagramUrl);

  return (
    <Card className="p-4 mb-5 border-orange-500/20 bg-orange-500/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
          <Instagram className="w-5 h-5 text-orange-400" />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-black">
            Instagram-Link für Einsendungen
          </h2>

          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Dieser Link wird später auf der öffentlichen Community-Clip-Einsenden-Seite verwendet.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          value={instagramUrl}
          onChange={event => setInstagramUrl(event.target.value)}
          placeholder="https://instagram.com/theyardline"
          className="h-10 text-sm"
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving || !instagramUrl.trim()}
            className="h-9 text-xs flex-1"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Link speichern
              </>
            )}
          </Button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-md border border-border bg-background hover:bg-secondary text-xs font-bold inline-flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Öffnen
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function ClipPreview({ clip }) {
  const url = normalizeUrl(clip.clipUrl);

  if (!url) {
    return (
      <div className="aspect-[9/16] rounded-2xl border border-dashed border-border/60 bg-secondary/30 flex items-center justify-center text-center p-4">
        <div>
          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-semibold">
            Kein Clip-Link vorhanden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] rounded-2xl border border-white/10 bg-black overflow-hidden">
      <video
        src={url}
        className="absolute inset-0 w-full h-full object-cover"
        controls
        playsInline
        preload="metadata"
      />

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center"
        title="Clip öffnen"
      >
        <ExternalLink className="w-4 h-4 text-white" />
      </a>
    </div>
  );
}

function SubmissionCard({
  clip,
  publishDraft,
  setPublishDraft,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}) {
  const instagramUrl = getInstagramUrl(clip.instagram);
  const contactHref = clip.contact?.includes('@') ? `mailto:${clip.contact}` : '';

  const draft = publishDraft[clip.id] || {
    title: clip.team
      ? `${clip.team} Community Clip`
      : clip.submitterName
      ? `Community Clip von ${clip.submitterName}`
      : 'Community Clip',
    sourceName: clip.instagram ? `@${normalizeInstagram(clip.instagram)}` : clip.submitterName || 'Community',
    description: clip.note || '',
  };

  const updateDraft = (key, value) => {
    setPublishDraft(current => ({
      ...current,
      [clip.id]: {
        ...draft,
        [key]: value,
      },
    }));
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-[116px_1fr] gap-4">
        <ClipPreview clip={clip} />

        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/20">
                Neu
              </Badge>

              {clip.submittedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(clip.submittedAt)}
                </span>
              )}
            </div>

            <h3 className="text-sm font-black leading-tight break-words">
              {clip.title || 'Community Clip Einsendung'}
            </h3>

            {clip.fileName && (
              <p className="text-[11px] text-muted-foreground mt-1 break-all">
                {clip.fileName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DetailRow icon={User} label="Einsender" value={clip.submitterName} />
            <DetailRow icon={Flame} label="Team/Verein" value={clip.team} />
            <DetailRow icon={Instagram} label="Instagram" value={clip.instagram ? `@${normalizeInstagram(clip.instagram)}` : ''} href={instagramUrl} />
            <DetailRow icon={Mail} label="Kontakt" value={clip.contact} href={contactHref} />
          </div>

          {clip.note && (
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Notiz
              </p>

              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {clip.note}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-bold">
              Als Community Clip veröffentlichen
            </p>

            <Input
              value={draft.title}
              onChange={event => updateDraft('title', event.target.value)}
              placeholder="Titel für Home"
              className="h-9 text-xs"
            />

            <Input
              value={draft.sourceName}
              onChange={event => updateDraft('sourceName', event.target.value)}
              placeholder="Quelle, z.B. @profil oder Verein"
              className="h-9 text-xs"
            />

            <textarea
              value={draft.description}
              onChange={event => updateDraft('description', event.target.value)}
              placeholder="Beschreibung optional"
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs resize-none outline-none focus:border-primary/50"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={() => onPublish(clip, draft)}
                disabled={isPublishing || !clip.clipUrl}
                className="h-9 text-xs"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Veröffentlichen
                  </>
                )}
              </Button>

              <Button
                onClick={() => onDelete(clip.id)}
                disabled={isDeleting}
                variant="ghost"
                className="h-9 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Ablehnen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PublishedClipCard({ clip, onUnpublish, onDelete, isUpdating, isDeleting }) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-[116px_1fr] gap-4">
        <ClipPreview clip={clip} />

        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/20">
                Veröffentlicht
              </Badge>

              {clip.isPublic && (
                <Badge variant="outline" className="text-[10px]">
                  Auf Home sichtbar
                </Badge>
              )}
            </div>

            <h3 className="text-sm font-black leading-tight break-words">
              {clip.title || 'Community Clip'}
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              {clip.sourceName}
            </p>
          </div>

          {clip.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {clip.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onUnpublish(clip.id)}
              disabled={isUpdating}
              variant="outline"
              className="h-9 text-xs"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Deaktivieren
            </Button>

            <Button
              onClick={() => onDelete(clip.id)}
              disabled={isDeleting}
              variant="ghost"
              className="h-9 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Löschen
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ModerationDashboard() {
  useSetHeader({ mode: 'back', title: 'Community Clips' });

  const queryClient = useQueryClient();
  const [publishDraft, setPublishDraft] = useState({});
  const [instagramUrl, setInstagramUrl] = useState(DEFAULT_INSTAGRAM_URL);

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ['admin-community-clips'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.filter(item =>
        item.version === SUBMISSION_VERSION ||
        item.version === PUBLIC_VERSION
      );
    },
  });

  const { data: settingsItem = null } = useQuery({
    queryKey: ['admin-community-clip-settings'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.find(item => item.version === SETTINGS_VERSION) || null;
    },
  });

  const settingsMeta = useMemo(() => {
    return parseMessage(settingsItem?.message);
  }, [settingsItem?.message]);

  useEffect(() => {
    setInstagramUrl(settingsMeta.instagram_url || DEFAULT_INSTAGRAM_URL);
  }, [settingsMeta.instagram_url]);

  const clips = useMemo(() => {
    return rawItems.map(normalizeClipItem);
  }, [rawItems]);

  const submissions = clips.filter(clip => clip.version === SUBMISSION_VERSION);
  const published = clips.filter(clip => clip.version === PUBLIC_VERSION);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-community-clips'] });
    queryClient.invalidateQueries({ queryKey: ['admin-count-community-clips'] });
    queryClient.invalidateQueries({ queryKey: ['home-community-clips'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-community-clip-settings'] });
    queryClient.invalidateQueries({ queryKey: ['community-clip-settings'] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const nextUrl = normalizeUrl(instagramUrl);

      if (!nextUrl) {
        throw new Error('Bitte Instagram-Link eintragen');
      }

      const payload = {
        title: 'Community Clip Einstellungen',
        message: JSON.stringify({
          instagram_url: nextUrl,
          updated_at: new Date().toISOString(),
        }),
        imageUrl: '',
        version: SETTINGS_VERSION,
        isActive: true,
        showAsPopup: false,
        updatedAtUtc: new Date().toISOString(),
      };

      if (settingsItem?.id) {
        await base44.entities.AppUpdate.update(settingsItem.id, payload);
        return;
      }

      await base44.entities.AppUpdate.create({
        ...payload,
        createdAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateSettings();
      toast.success('Instagram-Link gespeichert');
    },
    onError: error => {
      toast.error(error.message || 'Instagram-Link konnte nicht gespeichert werden');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ clip, draft }) => {
      const title = draft.title?.trim() || 'Community Clip';
      const sourceName = draft.sourceName?.trim() || clip.sourceName || 'Community';
      const description = draft.description?.trim() || '';

      const meta = {
        ...clip.meta,
        type: 'community_clip',
        title,
        description,
        source_name: sourceName,
        thumbnail_url: clip.meta.thumbnail_url || '',
        preview_video_url: clip.clipUrl,
        external_video_url: clip.clipUrl,
        clip_url: clip.clipUrl,
        date: new Date().toISOString(),
        active: true,
        status: 'published',
        published_at: new Date().toISOString(),
      };

      await base44.entities.AppUpdate.update(clip.id, {
        title,
        message: JSON.stringify(meta),
        imageUrl: clip.meta.thumbnail_url || '',
        version: PUBLIC_VERSION,
        isActive: true,
        showAsPopup: false,
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Community Clip veröffentlicht');
    },
    onError: error => {
      console.error('PUBLISH COMMUNITY CLIP ERROR:', error);
      toast.error('Clip konnte nicht veröffentlicht werden');
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async id => {
      await base44.entities.AppUpdate.update(id, {
        isActive: false,
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Community Clip deaktiviert');
    },
    onError: error => {
      console.error('UNPUBLISH COMMUNITY CLIP ERROR:', error);
      toast.error('Clip konnte nicht deaktiviert werden');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.AppUpdate.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Clip gelöscht');
    },
    onError: error => {
      console.error('DELETE COMMUNITY CLIP ERROR:', error);
      toast.error('Clip konnte nicht gelöscht werden');
    },
  });

  const handlePublish = (clip, draft) => {
    if (!clip.clipUrl) {
      toast.error('Kein Clip-Link vorhanden');
      return;
    }

    publishMutation.mutate({ clip, draft });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <section className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-950/70 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Admin
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              Community Clips
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Prüfe eingesendete Clips von Spielern, Vereinen und Videografen. Veröffentlichte Clips erscheinen automatisch auf der Home-Seite im Bereich Community Clips.
        </p>
      </section>

      <CommunityClipSettingsCard
        instagramUrl={instagramUrl}
        setInstagramUrl={setInstagramUrl}
        onSave={() => saveSettingsMutation.mutate()}
        isSaving={saveSettingsMutation.isPending}
      />

      <div className="grid grid-cols-3 gap-2 mb-5">
        <Card className="p-3 text-center">
          <div className="text-lg font-black text-orange-400">{submissions.length}</div>
          <div className="text-[10px] text-muted-foreground">Neu</div>
        </Card>

        <Card className="p-3 text-center">
          <div className="text-lg font-black text-green-400">{published.filter(item => item.isActive !== false).length}</div>
          <div className="text-[10px] text-muted-foreground">Aktiv</div>
        </Card>

        <Card className="p-3 text-center">
          <div className="text-lg font-black text-primary">{clips.length}</div>
          <div className="text-[10px] text-muted-foreground">Gesamt</div>
        </Card>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="submissions" className="flex-1">
            <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
            Einsendungen
          </TabsTrigger>

          <TabsTrigger value="published" className="flex-1">
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Veröffentlicht
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submissions">
          {submissions.length === 0 ? (
            <Card className="p-8 text-center">
              <Video className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Keine neuen Clip-Einsendungen
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map(clip => (
                <SubmissionCard
                  key={clip.id}
                  clip={clip}
                  publishDraft={publishDraft}
                  setPublishDraft={setPublishDraft}
                  onPublish={handlePublish}
                  onDelete={id => deleteMutation.mutate(id)}
                  isPublishing={publishMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published">
          {published.length === 0 ? (
            <Card className="p-8 text-center">
              <Flame className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Noch keine Community Clips veröffentlicht
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {published.map(clip => (
                <PublishedClipCard
                  key={clip.id}
                  clip={clip}
                  onUnpublish={id => unpublishMutation.mutate(id)}
                  onDelete={id => deleteMutation.mutate(id)}
                  isUpdating={unpublishMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}