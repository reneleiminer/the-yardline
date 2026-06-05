import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Calendar,
  Globe,
  Instagram,
  Mail,
  MapPin,
  PlayCircle,
  Youtube,
  Building2,
  Landmark,
  Info,
} from 'lucide-react';

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getInstagramUrl(handle) {
  const cleaned = String(handle || '').trim().replace(/^@/, '');
  if (!cleaned) return '';

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `https://instagram.com/${cleaned}`;
}

function formatStatus(status) {
  const labels = {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    paused: 'Pausiert',
  };

  return labels[status] || status;
}

function getStadiums(club) {
  if (Array.isArray(club?.stadiums) && club.stadiums.length > 0) {
    return club.stadiums
      .map((stadium, index) => ({
        id: stadium.id || `${stadium.name || 'stadium'}-${index}`,
        name: stadium.name || '',
        address: stadium.address || '',
        city: stadium.city || '',
        notes: stadium.notes || '',
        isDefault: stadium.isDefault === true,
      }))
      .filter(stadium => stadium.name || stadium.address || stadium.city || stadium.notes);
  }

  if (club?.stadium || club?.stadiumAddress) {
    return [
      {
        id: 'main-stadium',
        name: club.stadium || '',
        address: club.stadiumAddress || '',
        city: club.city || '',
        notes: '',
        isDefault: true,
      },
    ];
  }

  return [];
}

function InfoCard({ label, value, icon: Icon }) {
  if (!value) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </div>

          <div className="text-sm font-semibold break-words">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LinkCard({ label, value, href, icon: Icon }) {
  if (!value || !href) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </div>

          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm font-semibold break-all"
          >
            {value}
          </a>
        </div>
      </div>
    </Card>
  );
}

function StadiumCard({ stadium, index }) {
  const title = stadium.name || `Stadion ${index + 1}`;
  const details = [stadium.address, stadium.city].filter(Boolean).join(' · ');

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-4 h-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {stadium.isDefault ? 'Standard-Stadion' : `Stadion ${index + 1}`}
            </div>

            {stadium.isDefault && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                Standard
              </span>
            )}
          </div>

          <div className="text-sm font-semibold break-words">
            {title}
          </div>

          {details && (
            <div className="text-xs text-muted-foreground mt-1 break-words">
              {details}
            </div>
          )}

          {stadium.notes && (
            <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
              {stadium.notes}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ClubInfoTab({ club }) {
  const stadiums = getStadiums(club);

  const location = [club.city, club.region, club.country]
    .filter(Boolean)
    .join(' · ');

  const foundedYear = club.foundedYear || club.founded;
  const websiteUrl = normalizeUrl(club.website);
  const youtubeUrl = normalizeUrl(club.youtube);
  const streamUrl = normalizeUrl(club.streamUrl);
  const instagramUrl = getInstagramUrl(club.instagram);

  return (
    <div className="p-4 pb-20 space-y-4">
      {club.description && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Über den Verein
              </div>

              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {club.description}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        <InfoCard
          label="Standort"
          value={location}
          icon={MapPin}
        />

        <InfoCard
          label="Gegründet"
          value={foundedYear}
          icon={Calendar}
        />

        {club.status && club.status !== 'active' && (
          <InfoCard
            label="Status"
            value={formatStatus(club.status)}
            icon={Building2}
          />
        )}
      </div>

      {stadiums.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Stadien
          </div>

          {stadiums.map((stadium, index) => (
            <StadiumCard
              key={stadium.id || index}
              stadium={stadium}
              index={index}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <LinkCard
          label="Website"
          value={club.website}
          href={websiteUrl}
          icon={Globe}
        />

        <LinkCard
          label="Instagram"
          value={club.instagram?.startsWith('@') ? club.instagram : `@${club.instagram}`}
          href={instagramUrl}
          icon={Instagram}
        />

        <LinkCard
          label="YouTube"
          value={club.youtube}
          href={youtubeUrl}
          icon={Youtube}
        />

        <LinkCard
          label="Stream-Link"
          value={club.streamUrl}
          href={streamUrl}
          icon={PlayCircle}
        />

        {club.contactEmail && (
          <LinkCard
            label="Kontakt"
            value={club.contactEmail}
            href={`mailto:${club.contactEmail}`}
            icon={Mail}
          />
        )}
      </div>
    </div>
  );
}