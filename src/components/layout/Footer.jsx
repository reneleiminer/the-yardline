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
    <section className="mb-8 pb-8 border-b border-white/20 overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] whitespace-nowrap">
          Unsere Partner
        </h3>

        <div className="h-px flex-1 bg-white/20" />
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-black to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-black to-transparent" />

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
    <footer className="bg-black text-white border-t border-white/12 pt-7 pb-[calc(110px+env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto px-4">
        <PartnerLogoRail partners={visiblePartners} />

        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mb-5 text-xs">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-white/80 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/80">
            The Yardline
          </p>

          <p className="text-xs text-white/75 mt-1">
            © 2026 Alle Rechte vorbehalten.
          </p>
        </div>

        <div className="relative mx-auto mt-8 h-[58px] max-w-5xl overflow-hidden rounded-[10px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.006))]">
          <div className="absolute inset-x-0 top-[10px] h-px bg-white/52" />
          <div className="absolute inset-x-0 bottom-[10px] h-px bg-white/52" />
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/18" />

          {Array.from({ length: 11 }).map((_, index) => {
            const left = `${index * 10}%`;
            const isMidfield = index === 5;

            return (
              <span
                key={index}
                className={`absolute top-[10px] w-px ${
                  isMidfield ? 'h-[38px] bg-white/88' : 'h-[24px] bg-white/50'
                }`}
                style={{ left }}
              />
            );
          })}

          <div className="absolute inset-x-[5%] top-[18px] flex justify-between">
            {Array.from({ length: 21 }).map((_, index) => (
              <span
                key={index}
                className="h-[8px] w-px bg-white/24"
              />
            ))}
          </div>

          <div className="absolute inset-x-[5%] bottom-[18px] flex justify-between">
            {Array.from({ length: 21 }).map((_, index) => (
              <span
                key={index}
                className="h-[8px] w-px bg-white/24"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
