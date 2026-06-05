import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';

const FOOTER_SECTIONS = [
  {
    key: 'business',
    title: 'Partner',
  },
  {
    key: 'club',
    title: 'Vereinspartner',
  },
  {
    key: 'media',
    title: 'Media Network',
  },
];

function getPartnerCategory(partner) {
  return partner.category || partner.type || 'business';
}

function PartnerLogoLink({ partner }) {
  const logo = partner.logoUrl || partner.logo;
  const linkUrl = partner.linkUrl || partner.url || '';

  const content = (
    <div className="h-12 sm:h-14 flex items-center justify-center transition-transform duration-200 hover:scale-105">
      <img
        src={getImageUrl(logo)}
        alt={partner.name || ''}
        className="max-h-10 sm:max-h-12 max-w-[105px] sm:max-w-[125px] w-auto h-auto object-contain"
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
        className="block min-w-0"
      >
        {content}
      </a>
    );
  }

  return (
    <div
      aria-label={partner.name || ''}
      className="block min-w-0"
    >
      {content}
    </div>
  );
}

function FooterPartnerSection({ title, items }) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] whitespace-nowrap">
          {title}
        </h3>

        <div className="h-px flex-1 bg-border/25" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-6 items-center">
        {items.map((partner) => (
          <PartnerLogoLink key={partner.id} partner={partner} />
        ))}
      </div>
    </section>
  );
}

export default function Footer() {
  const { partners = [] } = useGlobalData();

  const groupedPartners = useMemo(() => {
    const visiblePartners = [...partners]
      .filter(partner => partner.logoUrl || partner.logo)
      .sort((a, b) => {
        const sortA = Number(a.sortOrder || 0);
        const sortB = Number(b.sortOrder || 0);

        if (sortA !== sortB) return sortA - sortB;

        return String(a.name || '').localeCompare(String(b.name || ''));
      });

    return FOOTER_SECTIONS.map(section => ({
      ...section,
      items: visiblePartners.filter(partner =>
        getPartnerCategory(partner) === section.key
      ),
    }));
  }, [partners]);

  const hasAnyPartner = groupedPartners.some(section => section.items.length > 0);

  const legalLinks = [
    { label: 'Impressum', href: '/legal/impressum' },
    { label: 'Datenschutz', href: '/legal/datenschutz' },
    { label: 'Nutzungsbedingungen', href: '/legal/nutzungsbedingungen' },
    { label: 'Tippspiel-Regeln', href: '/legal/community-guidelines' },
  ];

  return (
    <footer className="bg-background border-t border-border/30 pt-7 pb-[calc(110px+env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto px-4">
        {hasAnyPartner && (
          <div className="mb-7 pb-7 border-b border-border/30 space-y-8">
            {groupedPartners.map(section => (
              <FooterPartnerSection
                key={section.key}
                title={section.title}
                items={section.items}
              />
            ))}
          </div>
        )}

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