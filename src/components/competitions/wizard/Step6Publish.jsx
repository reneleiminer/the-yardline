import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Step6Publish({ formData, setFormData }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Überprüfe und veröffentliche
      </p>

      {/* Summary */}
      <Card className="p-4 space-y-3 bg-secondary/30">
        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="font-semibold text-sm">{formData.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Typ • System</p>
          <p className="font-semibold text-sm">{formData.type} • {formData.system}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Teams</p>
          <p className="font-semibold text-sm">{formData.teamIds.length} ausgewählt</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Runden</p>
          <p className="font-semibold text-sm">
            {formData.brackets.length} Runden ({formData.brackets.reduce((acc, r) => acc + r.matchups, 0)} Spiele)
          </p>
        </div>
      </Card>

      {/* Toggles */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Aktiv</label>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(v) => setFormData(f => ({ ...f, isActive: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold">Veröffentlichen</label>
          <Switch
            checked={formData.isPublished}
            onCheckedChange={(v) => setFormData(f => ({ ...f, isPublished: v }))}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        {formData.isPublished
          ? 'Wettbewerb wird direkt öffentlich sichtbar'
          : 'Wettbewerb wird als Entwurf gespeichert'}
      </p>
    </div>
  );
}