import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadField from '@/components/create/ImageUploadField';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Sport', 'Transfers', 'Ergebnisse', 'Rekorde', 'Analysen', 'Interviews', 'Sonstiges'];
const ALLOWED_ROLES = ['Journalist', 'Liga', 'Admin', 'journalist', 'liga', 'admin', 'official_media'];

export default function CreateNews() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const userRole = appUser?.roleSlug || appUser?.role || '';
  if (appUser && !ALLOWED_ROLES.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-sm text-center">Keine Berechtigung für News-Artikel.</p>
      </div>
    );
  }

  const canPublish = title.trim() && teaser.trim() && body.trim() && category && image;

  const handlePublish = async () => {
    if (!canPublish) { toast.error('Alle Pflichtfelder ausfüllen'); return; }
    setLoading(true);
    try {
      const quotesBlock = quotes.filter(q => q.text.trim()).length > 0
        ? '\n\n---\n' + quotes.filter(q => q.text.trim()).map(q => `"${q.text}"${q.author ? ` – ${q.author}` : ''}`).join('\n')
        : '';

      await base44.entities.Post.create({
        type: 'news',
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar,
        authorRole: appUser.role,
        authorVerified: appUser.verified,
        title: title.trim(),
        teaser: teaser.trim(),
        text: body.trim() + quotesBlock,
        category,
        images: [image],
        publishedAtUtc: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Artikel veröffentlicht!');
      navigate('/');
    } catch {
      toast.error('Fehler beim Veröffentlichen');
    } finally {
      setLoading(false);
    }
  };

  const addQuote = () => setQuotes(prev => [...prev, { text: '', author: '' }]);
  const updateQuote = (i, field, val) => setQuotes(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  const removeQuote = (i) => setQuotes(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">News Artikel</h1>
          <Button size="sm" onClick={handlePublish} disabled={!canPublish || loading} className="h-8 px-4 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Publizieren'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">
        {/* Title */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Titel *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Schlagzeile des Artikels"
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
            autoFocus
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Kategorie *</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-secondary/50 border-border/30 rounded-xl">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Cover image */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Titelbild *</label>
          <ImageUploadField value={image} onChange={setImage} />
        </div>

        {/* Teaser */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Teaser *</label>
          <textarea
            value={teaser}
            onChange={e => setTeaser(e.target.value)}
            placeholder="Kurze Zusammenfassung (1-2 Sätze)"
            rows={2}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Artikeltext *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Vollständiger Artikel…"
            rows={10}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        {/* Quotes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zitate (optional)</label>
            <button onClick={addQuote} className="flex items-center gap-1 text-xs text-primary font-semibold">
              <Plus className="w-3.5 h-3.5" /> Zitat
            </button>
          </div>
          {quotes.map((q, i) => (
            <div key={i} className="bg-secondary/40 rounded-xl p-3 mb-2 space-y-2 border border-border/30">
              <textarea
                value={q.text}
                onChange={e => updateQuote(i, 'text', e.target.value)}
                placeholder='"Zitat Text…"'
                rows={2}
                className="w-full bg-transparent text-sm resize-none focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <input
                  value={q.author}
                  onChange={e => updateQuote(i, 'author', e.target.value)}
                  placeholder="Person (optional)"
                  className="flex-1 bg-transparent text-xs text-muted-foreground focus:outline-none border-t border-border/30 pt-2"
                />
                <button onClick={() => removeQuote(i)}><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}