import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Verified, MapPin, Globe, Instagram, Facebook, Youtube } from 'lucide-react';
import { useFollow } from '@/hooks/useFollow';
import { useLeagueTheme } from '@/lib/useLeagueTheme';

export default function LeagueHeader({ league }) {
  const { isFollowing: isFollowed, loading: followLoading, toggle: toggleFollow } = useFollow({
    targetId: league?.id,
    targetType: 'league',
  });

  const theme = useLeagueTheme(league?.primaryColor);

  if (!league) return null;

  const socialLinks = [
    { key: 'website', label: 'Website', icon: Globe, url: league.website },
    { key: 'instagram', label: 'Instagram', icon: Instagram, url: league.instagram },
    { key: 'facebook', label: 'Facebook', icon: Facebook, url: league.facebook },
    { key: 'youtube', label: 'YouTube', icon: Youtube, url: league.youtube },
  ].filter(link => link.url);

  return (
    <div className="relative">
      <div className="relative h-48 bg-secondary overflow-hidden">
        {league.banner && (
          <img
            src={getImageUrl(league.banner)}
            alt=""
            className="w-full h-full object-cover"
            onError={(event) => {
              event.currentTarget.src = getImageUrl();
            }}
          />
        )}

        {theme.color && (
          <div
            className="absolute inset-0 transition-all duration-500"
            style={theme.gradientHeader}
          />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-4 -mt-12 mb-4 relative z-10">
          <div className="flex-shrink-0">
            <img
              src={getImageUrl(league.logo)}
              alt={league.name}
              className="h-24 w-24 rounded-lg bg-background border-2 border-border object-contain p-2"
              onError={(event) => {
                event.currentTarget.src = getImageUrl();
              }}
            />
          </div>

          <div className="flex-1 pt-4 min-w-0">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <h1 className="text-2xl font-bold truncate">{league.name}</h1>

              {league.verified && (
                <Badge className="bg-primary gap-1 flex-shrink-0">
                  <Verified className="w-3 h-3" />
                  Verifiziert
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {league.country || 'Deutschland'}
                {league.season && ` • ${league.season}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={toggleFollow}
            variant={isFollowed ? 'outline' : 'default'}
            className="flex-1 gap-2 transition-all duration-300"
            style={!isFollowed && theme.color ? theme.primaryBtn : {}}
            disabled={followLoading}
          >
            {followLoading ? '...' : isFollowed ? 'Entfolgen' : 'Folgen'}
          </Button>
        </div>

        {socialLinks.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {socialLinks.map(link => {
              const Icon = link.icon;

              return (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  title={link.label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}