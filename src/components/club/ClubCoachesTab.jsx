import React from 'react';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/lib/imageUtils';

export default function ClubCoachesTab({ club }) {
  if (!club.coaches || club.coaches.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Trainerstab wird noch zusammengestellt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 pb-20">
      {club.coaches.map((coach) => (
        <Card key={coach.id} className="p-4 flex items-center gap-3">
          {coach.image && (
            <img
              src={getImageUrl(coach.image)}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
              onError={(e) => { e.target.src = getImageUrl(); }}
            />
          )}
          <div className="flex-1">
            <div className="font-semibold text-sm">{coach.name}</div>
            {coach.role && (
              <div className="text-xs text-muted-foreground">{coach.role}</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}