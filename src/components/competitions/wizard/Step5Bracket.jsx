import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

const ROUND_TEMPLATES = {
  singleElimination: [
    { name: 'Viertelfinale', matchups: 4 },
    { name: 'Halbfinale', matchups: 2 },
    { name: 'Finale', matchups: 1 },
  ],
  twoLeggedTie: [
    { name: 'Hinspiel', matchups: 4 },
    { name: 'Rückspiel', matchups: 4 },
  ],
  bestOfSeries: [
    { name: 'Spiel 1', matchups: 4 },
    { name: 'Spiel 2', matchups: 4 },
    { name: 'Spiel 3 (falls nötig)', matchups: 4 },
  ],
  groupStageKnockout: [
    { name: 'Gruppenphase', matchups: 6 },
    { name: 'Halbfinale', matchups: 2 },
    { name: 'Finale', matchups: 1 },
  ],
  customBracket: [],
};

export default function Step5Bracket({ formData, setFormData }) {
  const template = ROUND_TEMPLATES[formData.system] || [];
  const [rounds, setRounds] = useState(
    formData.brackets.length > 0
      ? formData.brackets
      : template.map(t => ({ name: t.name, matchups: t.matchups }))
  );

  const handleAddRound = () => {
    setRounds([...rounds, { name: `Runde ${rounds.length + 1}`, matchups: 2 }]);
  };

  const handleRemoveRound = (idx) => {
    setRounds(rounds.filter((_, i) => i !== idx));
  };

  const handleUpdateRound = (idx, field, value) => {
    const updated = [...rounds];
    updated[idx] = { ...updated[idx], [field]: value };
    setRounds(updated);
  };

  const handleSave = () => {
    setFormData(f => ({ ...f, brackets: rounds }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Definiere Runden und Matchups
      </p>

      {template.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Template: {template.map(t => t.name).join(' → ')}
        </p>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {rounds.map((round, idx) => (
          <Card key={idx} className="p-3 space-y-2">
            <div className="flex gap-2 items-start justify-between">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Rundenname"
                  value={round.name}
                  onChange={(e) => handleUpdateRound(idx, 'name', e.target.value)}
                  className="h-9 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Matchups"
                    value={round.matchups}
                    onChange={(e) => handleUpdateRound(idx, 'matchups', parseInt(e.target.value) || 1)}
                    className="h-9 text-xs w-24"
                    min="1"
                  />
                  <span className="text-xs text-muted-foreground self-center">
                    {round.matchups} Spiele
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleRemoveRound(idx)}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleAddRound}
        variant="outline"
        className="w-full h-9 text-xs gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Runde hinzufügen
      </Button>

      <Button
        onClick={handleSave}
        className="w-full h-9 text-xs"
      >
        Runden speichern
      </Button>
    </div>
  );
}