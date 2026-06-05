import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TYPES = [
  { value: 'Playoffs', label: 'Playoffs', description: 'Endrunden nach Gruppenphase' },
  { value: 'Playdowns', label: 'Playdowns', description: 'Qualifikation / Abstiegsspiele' },
  { value: 'Relegation', label: 'Relegation', description: 'Abstiegsspiele' },
  { value: 'Bowl', label: 'Bowl / Finale', description: 'Finales Großereignis' },
  { value: 'Cup', label: 'Cup / K.O.-Turnier', description: 'Pokal oder K.O.-Turnier' },
  { value: 'League Tournament', label: 'Ligaturnier', description: 'Rundenprinzip' },
  { value: 'Friendly Tournament', label: 'Freundschaftsturnier', description: 'Testspiel-Turnier' },
  { value: 'Custom', label: 'Benutzerdefiniert', description: 'Eigenes Format' },
];

export default function Step1Type({ formData, setFormData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Wähle den Wettbewerbstyp
      </p>
      <div className="grid grid-cols-1 gap-2">
        {TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setFormData(f => ({ ...f, type: type.value }))}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              formData.type === type.value
                ? 'bg-primary/10 border-primary'
                : 'bg-card border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold text-sm">{type.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}