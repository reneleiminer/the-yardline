import React, { useState, useEffect } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const LEGAL_PAGES = [
  { slug: 'impressum', title: 'Impressum', path: '/impressum' },
  { slug: 'datenschutz', title: 'Datenschutz', path: '/datenschutz' },
  { slug: 'nutzungsbedingungen', title: 'Nutzungsbedingungen', path: '/nutzungsbedingungen' },
  { slug: 'tippspiel', title: 'Tippspiel-Regeln', path: '/legal/community-guidelines' },
];

export default function AdminLegal() {
  useSetHeader({ mode: 'back', title: 'Rechtliches' });

  const queryClient = useQueryClient();

  const [activeSlug, setActiveSlug] = useState('impressum');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const { data: legalPages = [], isLoading } = useQuery({
    queryKey: ['legalPages'],
    queryFn: () => base44.entities.LegalPage.list(),
  });

  const currentPage = legalPages.find(page => page.slug === activeSlug);
  const activeMeta = LEGAL_PAGES.find(page => page.slug === activeSlug);

  useEffect(() => {
    const page = legalPages.find(p => p.slug === activeSlug);
    const meta = LEGAL_PAGES.find(p => p.slug === activeSlug);

    if (page) {
      setFormData({
        title: page.title || meta?.title || '',
        content: page.content || '',
      });
    } else {
      setFormData({
        title: meta?.title || '',
        content: '',
      });
    }
  }, [activeSlug, legalPages]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existingPage = legalPages.find(page => page.slug === activeSlug);

      const payload = {
  slug: activeSlug,
  title: data.title,
  content: data.content,
  path: activeMeta?.path || `/${activeSlug}`,
  updatedAtUtc: new Date().toISOString(),
};

      if (existingPage?.id) {
        return await base44.entities.LegalPage.update(existingPage.id, payload);
      }

      return await base44.entities.LegalPage.create(payload);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legalPages'] });
      toast.success('Seite gespeichert');
    },

    onError: (error) => {
      console.error('LEGAL PAGE SAVE ERROR:', error);
      toast.error('Fehler beim Speichern');
    },
  });

  const handleTabChange = (slug) => {
    setActiveSlug(slug);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Seitentitel erforderlich');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Inhalt erforderlich');
      return;
    }

    saveMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-32">
      <p className="text-xs text-muted-foreground mb-5">
        Impressum, Datenschutz, Nutzungsbedingungen und Tippspiel-Regeln verwalten
      </p>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-5">
        {LEGAL_PAGES.map(page => (
          <button
            key={page.slug}
            onClick={() => handleTabChange(page.slug)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              activeSlug === page.slug
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {page.title}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <p className="text-sm font-bold">
              {activeMeta?.title || 'Rechtliche Seite'}
            </p>

            <p className="text-[11px] text-muted-foreground mt-0.5">
              Öffentlich unter{' '}
              <span className="text-primary">
                {activeMeta?.path || `/${activeSlug}`}
              </span>
            </p>
          </div>

          <a
            href={activeMeta?.path || `/${activeSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Vorschau
          </a>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Seitentitel
              </label>

              <Input
                value={formData.title}
                onChange={event =>
                  setFormData(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="z.B. Impressum"
                className="h-11 text-sm bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Inhalt
              </label>

              <Textarea
                value={formData.content}
                onChange={event =>
                  setFormData(current => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="Seiteninhalt einfügenâ€¦"
                className="min-h-[260px] text-xs font-mono bg-secondary/50 border-border/50 resize-y leading-relaxed"
              />

              <p className="text-[10px] text-muted-foreground">
                HTML und Markdown werden auf der öffentlichen Seite gerendert.
              </p>
            </div>

            <Button
              className="w-full h-11 text-sm font-semibold"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Speichernâ€¦
                </>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
