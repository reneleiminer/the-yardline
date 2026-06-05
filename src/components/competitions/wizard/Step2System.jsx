import React from 'react';
import { Button } from '@/components/ui/button';

const SYSTEMS = [
  {
    value: 'singleElimination',
    label: 'Einfache K.O.',
    description: 'Viertelfinale → Halbfinale → Finale',
    rounds: ['Viertelfinale', 'Halbfinale', 'Finale'],
  },
  {
    value: 'twoLeggedTie',
    label: 'Doppelte Begegnung',
    description: 'Hinspiel und Rückspiel, Aggregat',
    rounds: ['Hinspiel', 'Rückspiel'],
  },
  {
    value: 'bestOfSeries',
    label: 'Best-Of Serie',
    description: 'Best of 3, Best of 5, etc.',
    rounds: ['Spiel 1', 'Spiel 2', 'Spiel 3'],
  },
  {
    value: 'groupStageKnockout',
    label: 'Gruppe + K.O.',
    description: 'Gruppenphase dann Halbfinale/Finale',
    rounds: ['Gruppenphase', 'Halbfinale', 'Finale'],
  },
  {
    value: 'placementGames',
    label: 'Platzierungsspiele',
    description: 'Playdowns, Relegation, Qualifikation',
    rounds: ['Platzierungsspiele'],
  },
  {
    value: 'customBracket',
    label: 'Benutzerdefiniert',
    description: 'Admin definiert Runden manuell',
    rounds: [],
  },
];

export default function Step2System({ formData, setFormData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Wähle das Wettkampfsystem
      </p>
      <div className="grid grid-cols-1 gap-2">
        {SYSTEMS.map(sys => (
          <button
            key={sys.value}
            onClick={() => setFormData(f => ({ ...f, system: sys.value }))}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              formData.system === sys.value
                ? 'bg-primary/10 border-primary'
                : 'bg-card border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold text-sm">{sys.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{sys.description}</div>
            {sys.rounds.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {sys.rounds.map(r => (
                  <span key={r} className="text-[10px] px-2 py-1 bg-secondary rounded">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}