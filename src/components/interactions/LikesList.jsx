import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, Instagram, Send, Video, Info, X } from 'lucide-react';
import { toast } from 'sonner';

const CLOUDINARY_CLOUD_NAME = 'dsd5ajgru';
const CLOUDINARY_UPLOAD_PRESET = 'theyardline_upload';

const SETTINGS_VERSION = 'community_clip_settings';
const DEFAULT_INSTAGRAM_URL = 'https://instagram.com/theyardline';

const EMPTY_FORM = {
  name: '',
  team: '',
  instagram: '',
  contact: '',
  note: '',
  acceptedUsage: false,
};

async function uploadVideoToCloudinary(file) {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  data.append('folder', 'theyardline/community-clips');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    {
      method: 'POST',
      body: data,
    }
  );

  const result = await response.json();
  console.log('CLOUDINARY VIDEO RESULT:', result);

  if (!response.ok || !result.secure_url) {
    throw new Error(result?.error?.message || 'Video-Upload fehlgeschlagen');
  }

  return result.secure_url;
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

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function normalizeInstagram(value) {
  return String(value || '').trim().replace(/^@/, '');
}

function getFileName(file) {
  if (!file) return '';
  return file.name || 'Ausgewählter Clip';
}

export default function LikesList() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [clipFile, setClipFile] = useState(null);
  const [clipPreviewUrl, setClipPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settingsItem = null } = useQuery({
    queryKey: ['community-clip-settings'],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date');

      return all.find(item => item.version === SETTINGS_VERSION) || null;
    },
  });

  const instagramUrl = useMemo(() => {
    const meta = parseMessage(settingsItem?.message);
    return normalizeUrl(meta.instagram_url || DEFAULT_INSTAGRAM_URL);
  }, [settingsItem?.message]);

  const set = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const resetClip = () => {
    setClipFile(null);

    if (clipPreviewUrl) {
      URL.revokeObjectURL(clipPreviewUrl);
    }

    setClipPreviewUrl('');

    const fileInput = document.getElementById('community-clip-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = event => {
    const file = event.target.files?.[0];

    if (!file) {
      resetClip();
      return;
    }

    if (!file.type?.startsWith('video/')) {
      toast.error('Bitte nur Video-Dateien hochladen');
      event.target.value = '';
      resetClip();
      return;
    }

    setClipFile(file);

    if (clipPreviewUrl) {
      URL.revokeObjectURL(clipPreviewUrl);
    }

    setClipPreviewUrl(URL.createObjectURL(file));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error('Bitte deinen Namen oder Verein eintragen');
      return false;
    }

    if (!form.contact.trim() && !form.instagram.trim()) {
      toast.error('Bitte eine Kontaktmöglichkeit oder Instagram angeben');
      return false;
    }

    if (!clipFile) {
      toast.error('Bitte einen Clip direkt von deinem Gerät hochladen');
      return false;
    }

    if (!form.acceptedUsage) {
      toast.error('Bitte bestätige, dass wir den Clip prüfen und dich kontaktieren dürfen');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const uploadedClipUrl = await uploadVideoToCloudinary(clipFile);

      await base44.entities.AppUpdate.create({
        title: `Community Clip von ${form.name.trim()}`,
        version: 'community_clip_submission',
        isActive: false,
        imageUrl: '',
        message: JSON.stringify({
          type: 'community_clip_submission',
          submitter_name: form.name.trim(),
          team: form.team.trim(),
          instagram: normalizeInstagram(form.instagram),
          contact: form.contact.trim(),
          note: form.note.trim(),
          clip_url: uploadedClipUrl,
          preview_video_url: uploadedClipUrl,
          external_video_url: uploadedClipUrl,
          file_name: getFileName(clipFile),
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        }),
      });

      toast.success('Clip wurde eingereicht. Wir prüfen deine Einsendung und melden uns bei dir.');

      setForm(EMPTY_FORM);
      resetClip();
    } catch (error) {
      console.error('COMMUNITY CLIP SUBMIT ERROR:', error);
      toast.error(error.message || 'Clip konnte nicht eingereicht werden');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-orange-950/70 via-slate-950 to-background p-5 mb-5 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.25),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(59,130,246,0.18),transparent_35%)]" />

        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <Video className="w-6 h-6 text-primary" />
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
            The Yardline Community
          </p>

          <h1 className="text-2xl font-black leading-tight">
            Community Clip einsenden
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Schick uns deinen besten Football-Clip direkt von deinem Gerät. Die Clips können von Spielern,
            Vereinen oder Videografen eingesendet werden. Wir prüfen jede Einsendung und melden uns, ob wir
            den Clip in The Yardline verwenden.
          </p>
        </div>
      </section>

      <Card className="p-4 mb-5 border-orange-500/20 bg-orange-500/5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />

          <div>
            <p className="text-sm font-bold">
              Wichtig für deinen Clip
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Bitte nur Clips im Hochformat einsenden, idealerweise 9:16 wie bei Reels, Shorts oder TikTok.
              Querformat-Clips können wir eventuell nicht verwenden.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Name / Verein*
          </label>

          <Input
            value={form.name}
            onChange={event => set('name', event.target.value)}
            placeholder="z.B. Max Mustermann oder Dresden Monarchs"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Team / Verein optional
          </label>

          <Input
            value={form.team}
            onChange={event => set('team', event.target.value)}
            placeholder="z.B. Teamname, Liga oder Spielerteam"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Instagram optional
          </label>

          <div className="relative">
            <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={form.instagram}
              onChange={event => set('instagram', event.target.value)}
              placeholder="@deinprofil"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Kontakt*
          </label>

          <Input
            value={form.contact}
            onChange={event => set('contact', event.target.value)}
            placeholder="E-Mail oder andere Kontaktmöglichkeit"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Clip Upload*
          </label>

          {clipPreviewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-border/70 bg-black">
              <video
                src={clipPreviewUrl}
                controls
                playsInline
                className="w-full max-h-[420px] object-contain bg-black"
              />

              <button
                type="button"
                onClick={resetClip}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="community-clip-upload"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-secondary/20 px-4 py-7 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-7 h-7 text-primary" />

              <div className="text-center">
                <p className="text-sm font-bold">
                  Clip vom Gerät auswählen
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Nur Video-Dateien, am besten Hochformat 9:16
                </p>
              </div>
            </label>
          )}

          <input
            id="community-clip-upload"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isSubmitting}
          />

          {clipFile && (
            <p className="text-xs font-semibold text-primary break-all">
              {getFileName(clipFile)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Notiz optional
          </label>

          <textarea
            value={form.note}
            onChange={event => set('note', event.target.value)}
            placeholder="Kurze Info zum Clip, Spieler, Spiel oder Verein"
            rows={4}
            className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm resize-none outline-none focus:border-primary/50"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border/50 bg-secondary/20 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptedUsage}
            onChange={event => set('acceptedUsage', event.target.checked)}
            className="mt-0.5"
          />

          <span className="text-xs text-muted-foreground leading-relaxed">
            Ich bestätige, dass The Yardline den Clip prüfen darf und mich kontaktieren kann.
            Eine Veröffentlichung erfolgt erst nach Prüfung.
          </span>
        </label>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-11 rounded-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Clip wird hochgeladen…
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Clip einsenden
            </>
          )}
        </Button>
      </Card>

      <Card className="p-4 mt-5">
        <div className="flex gap-3">
          <Instagram className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />

          <div>
            <p className="text-sm font-bold">
              Alternativ per Instagram
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Du kannst uns deinen Clip auch direkt per Instagram schicken. Wir geben dir Bescheid,
              ob wir den Clip verwenden können.
            </p>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-bold text-primary mt-3 hover:underline"
            >
              The Yardline auf Instagram öffnen
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}