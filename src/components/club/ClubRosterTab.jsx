import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';

export default function ClubRosterTab({ club }) {
  if (!club.roster || club.roster.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Kader wird noch zusammengestellt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 pb-20">
      {club.roster.map((player) => (
        <Card key={player.id} className="p-4 flex items-center gap-3">
          {player.image && (
            <img
              src={getImageUrl(player.image)}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
              onError={(e) => { e.target.src = getImageUrl(); }}
            />
          )}
          <div className="flex-1">
            <div className="font-semibold text-sm">{player.name}</div>
            {player.position && (
              <div className="text-xs text-muted-foreground">{player.position}</div>
            )}
          </div>
          {player.number && (
            <Badge className="bg-primary">{player.number}</Badge>
          )}
        </Card>
      ))}
    </div>
  );
}