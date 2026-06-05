import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LegalPageTemplate from '@/components/layout/LegalPageTemplate';
import useSetHeader from '@/hooks/useSetHeader';
import { Loader2 } from 'lucide-react';

export default function Impressum() {
  useSetHeader({ mode: 'back', title: 'Impressum' });

  const { data: page, isLoading } = useQuery({
    queryKey: ['legalPage', 'impressum'],
    queryFn: async () => {
      const pages = await base44.entities.LegalPage.filter({ slug: 'impressum' });
      return pages[0];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!page?.content) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
          <h1 className="text-xl font-black mb-2">Impressum</h1>
          <p className="text-sm text-muted-foreground">
            Diese Seite wurde noch nicht eingerichtet.
          </p>
        </div>
      </div>
    );
  }

  return <LegalPageTemplate title={page.title || 'Impressum'} content={page.content} />;
}