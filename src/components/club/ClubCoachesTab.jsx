import React from 'react';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/lib/imageUtils';
import { ClipboardList } from 'lucide-react';

export default function ClubCoachesTab({ club }) {
  if (!club.coaches || club.coaches.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Trainerstab wird noch zusammengestellt.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-3 pb-24 sm:grid-cols-2">
      {club.coaches.map((coach) => (
        <Card key={coach.id || coach.name} className="flex items-center gap-3 rounded-2xl border-border/50 p-4 shadow-sm">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary/70">
            {coach.image ? (
              <img
                src={getImageUrl(coach.image)}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black leading-tight line-clamp-2 break-words">{coach.name}</div>
            {coach.role && (
              <div className="mt-1 text-xs font-semibold text-muted-foreground">{coach.role}</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
