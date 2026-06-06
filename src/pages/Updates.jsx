import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Loader2, Sparkles } from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';

const INTERNAL_APP_UPDATE_VERSIONS = new Set([
  'game_highlight',
  'ad_banner',
  'community_clip',
  'community_clip_submission',
  'analytics_event',
  'gameday_photo',
  'game_prediction',
  'app_branding',
  'podcast_feature',
]);

function getUpdateDate(update) {
  const value =
    update?.created_date ||
    update?.createdAtUtc ||
    update?.createdAt ||
    update?.updatedAtUtc ||
    update?.updated_date ||
    '';

  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return format(date, "dd.MM.yyyy · HH:mm 'Uhr'", { locale: de });
}

function getUpdateMessage(update) {
  return update?.message || update?.text || '';
}

const UPDATE_TYPE_LABELS = {
  fix: 'Fix',
  update: 'Update',
  performance: 'Performance',
  admin: 'Admin',
  content: 'Content',
};

function getUpdateMeta(update) {
  const raw = update?.legacyData || update?.legacy_data;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function isPublicChangelogUpdate(update) {
  if (!update?.isActive) return false;
  if (INTERNAL_APP_UPDATE_VERSIONS.has(update.version)) return false;

  const meta = getUpdateMeta(update);

  if (meta.source === 'admin_updates' || meta.source === 'push_script') return true;
  if (meta.updateType) return true;
  if (!update.version) return false;

  const message = getUpdateMessage(update).trim();
  if (message.startsWith('{') || message.startsWith('[')) return false;

  return true;
}

export default function Updates() {
  useSetHeader({ mode: 'back', title: 'Updates' });

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['appUpdates'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.filter(isPublicChangelogUpdate);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-blue-950/70 via-slate-950 to-background p-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              The Yardline
            </p>

            <h1 className="text-2xl font-black mt-0.5">
              Updates
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          Neue Funktionen, Verbesserungen und wichtige Änderungen.
        </p>
      </section>

      {updates.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            Keine Updates verfügbar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map(update => {
            const updateDate = getUpdateDate(update);
            const message = getUpdateMessage(update);
            const updateType = getUpdateMeta(update).updateType || 'update';

            return (
              <article
                key={update.id}
                className="rounded-2xl border border-border/50 bg-card overflow-hidden"
              >
                {update.imageUrl && (
                  <img
                    src={getImageUrl(update.imageUrl)}
                    alt={update.title || ''}
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-black text-base leading-tight">
                        {update.title}
                      </h2>

                      {updateDate && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {updateDate}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge className="text-[10px] bg-primary/15 text-primary">
                        {UPDATE_TYPE_LABELS[updateType] || 'Update'}
                      </Badge>

                      {update.version && (
                        <Badge variant="outline" className="text-xs">
                          v{update.version}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {message}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
