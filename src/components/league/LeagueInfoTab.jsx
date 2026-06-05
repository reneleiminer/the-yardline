import React from 'react';
import { Card } from '@/components/ui/card';

function getGroupName(group) {
  if (typeof group === 'string') return group;
  return group?.name || group?.shortName || group?.id || 'Gruppe';
}

export default function LeagueInfoTab({ league }) {
  const infoItems = [
    {
      label: 'Land/Region',
      value: [league.country, league.regionState].filter(Boolean).join(' · ') || 'Deutschland',
    },
    {
      label: 'Saison',
      value: league.season,
    },
    {
      label: 'Level',
      value: league.tierLabel || (league.level !== undefined && league.level !== null ? `Level ${league.level}` : ''),
    },
  ];

  const groups = Array.isArray(league.groups) ? league.groups : [];

  return (
    <div className="p-4 pb-20 space-y-4">
      {league.description && (
        <Card className="p-4">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {league.description}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        {infoItems.map((item, index) => (
          item.value ? (
            <Card key={index} className="p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className="text-sm font-semibold">
                {item.value}
              </div>
            </Card>
          ) : null
        ))}
      </div>

      {groups.length > 0 && (
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Gruppen
          </div>

          <div className="space-y-1">
            {groups.map((group, index) => (
              <div key={group.id || group.name || index} className="text-sm">
                {getGroupName(group)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {league.website && (
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Website
          </div>

          <a
            href={league.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm break-all"
          >
            {league.website}
          </a>
        </Card>
      )}
    </div>
  );
}