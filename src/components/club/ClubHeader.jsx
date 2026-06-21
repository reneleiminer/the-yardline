import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Verified,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Heart,
  Shield,
} from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';

export default function ClubHeader({ club }) {
  const {
    isFollowing: isFollowed,
    loading: followLoading,
    toggle: toggleFollow,
  } = useFollow({
    targetId: club?.id,
    targetType: 'club',
  });

  if (!club) return null;

  const socialLinks = [
    { key: 'website', label: 'Website', icon: Globe, url: club.website },
    { key: 'instagram', label: 'Instagram', icon: Instagram, url: club.instagram },
    { key: 'facebook', label: 'Facebook', icon: Facebook, url: club.facebook },
    { key: 'youtube', label: 'YouTube', icon: Youtube, url: club.youtube },
  ].filter(link => link.url);

  const primaryColor = club.primaryColor || '#d20a18';
  const locationLine = [club.city, club.stadium].filter(Boolean).join(' - ');

  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, rgba(0,0,0,0.92) 48%, rgba(0,0,0,0.98) 100%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(255,255,255,0.10),transparent_34%),repeating-linear-gradient(115deg,rgba(255,255,255,0.055)_0_1px,transparent_1px_18px)] opacity-80" />

      <div className="relative h-40 overflow-hidden sm:h-52">
        {club.banner && (
          <img
            src={getImageUrl(club.banner)}
            alt=""
            className="h-full w-full object-cover opacity-70 mix-blend-luminosity"
            onError={event => {
              event.currentTarget.src = getImageUrl();
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      </div>

      <div className="relative z-10 px-4 pb-5">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="flex-shrink-0">
            <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-white/18 bg-black/62 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.46)] backdrop-blur sm:h-32 sm:w-32">
              {club.logo ? (
                <img
                  src={getImageUrl(club.logo)}
                  alt={club.name}
                  className="h-full w-full object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.48)]"
                  onError={event => {
                    event.currentTarget.src = getImageUrl();
                  }}
                />
              ) : (
                <Shield className="h-12 w-12 text-white/48" />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-3xl font-black italic leading-[0.98] tracking-tight text-white sm:text-4xl">
                {club.name}
              </h1>

              {club.verified && (
                <Badge className="flex-shrink-0 gap-1 border-white/18 bg-white text-black">
                  <Verified className="h-3 w-3" />
                  Verifiziert
                </Badge>
              )}
            </div>

            {club.shortName && club.shortName !== club.name && (
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-white/54">
                {club.shortName}
              </p>
            )}

            {locationLine && (
              <div className="mb-3 flex min-w-0 items-center gap-2 text-sm font-semibold text-white/68">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-2 break-words">
                  {locationLine}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={toggleFollow}
            variant={isFollowed ? 'outline' : 'default'}
            className="min-h-11 flex-1 gap-2 rounded-2xl font-black"
            disabled={followLoading}
          >
            <Heart className={`h-4 w-4 ${isFollowed ? 'fill-current' : ''}`} />
            {followLoading ? '...' : isFollowed ? 'Entfolgen' : 'Folgen'}
          </Button>

          {socialLinks.length > 0 && (
            <div className="flex gap-2">
              {socialLinks.map(link => {
                const Icon = link.icon;

                return (
                  <a
                    key={link.key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white transition-colors hover:bg-white/18"
                    title={link.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
