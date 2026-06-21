import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';
import { UserRound } from 'lucide-react';

export default function ClubRosterTab({ club }) {
  if (!club.roster || club.roster.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Kader wird noch zusammengestellt.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-3 pb-24 sm:grid-cols-2">
      {club.roster.map((player) => (
        <Card key={player.id || player.name} className="flex items-center gap-3 rounded-2xl border-border/50 p-4 shadow-sm">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary/70">
            {player.image ? (
              <img
                src={getImageUrl(player.image)}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <UserRound className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black leading-tight line-clamp-2 break-words">{player.name}</div>
            {player.position && (
              <div className="mt-1 text-xs font-semibold text-muted-foreground">{player.position}</div>
            )}
          </div>

          {player.number && (
            <Badge className="flex-shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-black">{player.number}</Badge>
          )}
        </Card>
      ))}
    </div>
  );
}
