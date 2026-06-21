import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { ExternalLink } from 'lucide-react';

export default function ClubPartnersTab({ club }) {
  const partners = club.partners || [];

  if (partners.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Noch keine Partner eingetragen.</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 pb-24">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {partners.map((partner, i) => {
          const isUrl = typeof partner === 'string' && partner.startsWith('http');
          const name = typeof partner === 'object' ? partner.name : `Partner ${i + 1}`;
          const logo = typeof partner === 'object' ? partner.logoUrl : null;
          const link = typeof partner === 'object' ? partner.linkUrl : (isUrl ? partner : null);

          const card = (
            <div className="flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card p-4 text-center shadow-sm transition-colors hover:border-primary/30">
              {logo ? (
                <img src={getImageUrl(logo)} alt={name} className="h-14 w-full object-contain" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="flex min-h-14 w-full items-center justify-center text-sm font-black leading-tight text-foreground line-clamp-2">{name}</div>
              )}
              {link && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-primary">
                  <ExternalLink className="w-3 h-3" />
                  Website
                </span>
              )}
            </div>
          );

          return link ? (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer">{card}</a>
          ) : (
            <div key={i}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
