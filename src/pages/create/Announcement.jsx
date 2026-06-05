import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import ImageUploadField from '@/components/create/ImageUploadField';
import { ArrowLeft, Loader2, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_ROLES = ['Verein', 'Liga', 'Admin', 'verein', 'liga', 'admin', 'official_media'];

export default function CreateAnnouncement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);

  const userRole = appUser?.roleSlug || appUser?.role || '';
  if (appUser && !ALLOWED_ROLES.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-sm text-center">Keine Berechtigung für Ankündigungen.</p>
      </div>
    );
  }

  const canPublish = title.trim() && text.trim() && image;

  const handlePublish = async () => {
    if (!canPublish) { toast.error('Titel, Text und Bild sind erforderlich'); return; }
    setLoading(true);
    try {
      await base44.entities.Post.create({
        type: 'news',  // uses news type but shown as official
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar,
        authorRole: appUser.role,
        authorVerified: true,  // force official badge
        title: title.trim(),
        teaser: teaser.trim() || title.trim(),
        text: text.trim(),
        images: [image],
        category: 'Ankündigung',
        featured: true,
        publishedAtUtc: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Ankündigung veröffentlicht!');
      navigate('/');
    } catch {
      toast.error('Fehler beim Veröffentlichen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold">Ankündigung</h1>
            <span className="flex items-center gap-1 bg-orange-500/15 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <BadgeCheck className="w-3 h-3" /> OFFIZIELL
            </span>
          </div>
          <Button size="sm" onClick={handlePublish} disabled={!canPublish || loading} className="h-8 px-4 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Posten'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">
        {/* Official badge info */}
        <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3.5 flex items-start gap-3">
          <BadgeCheck className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Diese Ankündigung wird mit <strong className="text-orange-400">OFFIZIELL</strong> Badge veröffentlicht und erscheint prominent im Feed.
          </p>
        </div>

        {/* Image (required) */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bild *</label>
          <ImageUploadField value={image} onChange={setImage} required />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Titel *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titel der Ankündigung"
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
            autoFocus
          />
        </div>

        {/* Teaser (optional) */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Teaser (optional)</label>
          <textarea
            value={teaser}
            onChange={e => setTeaser(e.target.value)}
            placeholder="Kurze Zusammenfassung"
            rows={2}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Text *</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Vollständiger Ankündigungstext…"
            rows={8}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>
      </div>
    </div>
  );
}