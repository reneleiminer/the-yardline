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
      <div className="grid grid-cols-2 gap-3">
        {partners.map((partner, i) => {
          const isUrl = typeof partner === 'string' && partner.startsWith('http');
          const name = typeof partner === 'object' ? partner.name : `Partner ${i + 1}`;
          const logo = typeof partner === 'object' ? partner.logoUrl : null;
          const link = typeof partner === 'object' ? partner.linkUrl : (isUrl ? partner : null);

          const card = (
            <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
              {logo ? (
                <img src={getImageUrl(logo)} alt={name} className="h-12 w-full object-contain" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="h-12 w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">{name}</div>
              )}
              {link && (
                <span className="flex items-center gap-1 text-[10px] text-primary">
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