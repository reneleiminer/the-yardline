import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import ImageUploadField from '@/components/create/ImageUploadField';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!appUser) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-sm text-center">Bitte melde dich an, um einen Beitrag zu erstellen.</p>
      </div>
    );
  }

  const canPublish = text.trim() || images.length > 0;

  const handlePublish = async () => {
    if (!canPublish) return;
    setLoading(true);
    try {
      await base44.entities.Post.create({
        type: 'community',
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar,
        authorRole: appUser.role,
        authorVerified: appUser.verified,
        text: text.trim(),
        images: images.length > 0 ? images : undefined,
        publishedAtUtc: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Veröffentlicht!');
      navigate('/');
    } catch {
      toast.error('Fehler beim Veröffentlichen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">Community Beitrag</h1>
          <Button size="sm" onClick={handlePublish} disabled={!canPublish || loading} className="h-8 px-4 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Posten'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          {appUser.avatar
            ? <img src={appUser.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            : <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">{appUser.displayName?.[0] || '?'}</div>
          }
          <div>
            <p className="text-sm font-bold">{appUser.displayName || appUser.username}</p>
            <p className="text-xs text-muted-foreground">@{appUser.username}</p>
          </div>
        </div>

        {/* Text */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Was möchtest du teilen? #hashtag @mention"
          className="w-full bg-transparent text-base resize-none focus:outline-none min-h-[120px] placeholder:text-muted-foreground/50"
          rows={5}
          autoFocus
        />

        {/* Images */}
        <ImageUploadField value={images} onChange={setImages} multiple />

        <p className="text-xs text-muted-foreground">Tipp: Nutze #hashtags und @mentions um mehr Reichweite zu erzielen.</p>
      </div>
    </div>
  );
}