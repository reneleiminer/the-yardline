import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';

function PartnerLogoLink({ partner }) {
  const logo = partner.logoUrl || partner.logo;
  const linkUrl = partner.linkUrl || partner.url || '';

  const content = (
    <div className="h-16 w-32 flex items-center justify-center px-3">
      <img
        src={getImageUrl(logo)}
        alt={partner.name || ''}
        className="max-h-14 max-w-full w-auto h-auto object-contain"
        loading="lazy"
      />
    </div>
  );

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={partner.name || ''}
        className="shrink-0"
      >
        {content}
      </a>
    );
  }

  return (
    <div aria-label={partner.name || ''} className="shrink-0">
      {content}
    </div>
  );
}

function PartnerLogoRail({ partners }) {
  if (partners.length === 0) return null;

  const loopPartners = partners.length >= 4
    ? [...partners, ...partners]
    : [...partners, ...partners, ...partners, ...partners];

  return (
    <section className="mb-8 pb-8 border-b border-border/30 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em] whitespace-nowrap">
          Unsere Partner
        </h3>

        <div className="h-px flex-1 bg-border/30" />
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

        <div className="flex w-max animate-[partner-marquee_28s_linear_infinite]">
          {loopPartners.map((partner, index) => (
            <PartnerLogoLink
              key={`${partner.id || partner.name || 'partner'}-${index}`}
              partner={partner}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes partner-marquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}

export default function Footer() {
  const { partners = [] } = useGlobalData();

  const visiblePartners = useMemo(() => {
    return [...partners]
      .filter(partner => partner.logoUrl || partner.logo)
      .sort((a, b) => {
        const sortA = Number(a.sortOrder || 0);
        const sortB = Number(b.sortOrder || 0);

        if (sortA !== sortB) return sortA - sortB;

        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [partners]);

  const legalLinks = [
    { label: 'Impressum', href: '/legal/impressum' },
    { label: 'Datenschutz', href: '/legal/datenschutz' },
    { label: 'Nutzungsbedingungen', href: '/legal/nutzungsbedingungen' },
    { label: 'Tippspiel-Regeln', href: '/legal/community-guidelines' },
  ];

  return (
    <footer className="bg-background border-t border-border/30 pt-7 pb-[calc(110px+env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto px-4">
        <PartnerLogoRail partners={visiblePartners} />

        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mb-5 text-xs">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            The Yardline
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            © 2026 Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}