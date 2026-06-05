import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function Step3League({ formData, setFormData }) {
  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  if (isLoading) {
    return <Loader2 className="w-5 h-5 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wähle Liga und Saison
      </p>

      <div className="space-y-2">
        <label className="text-xs font-semibold">Liga</label>
        <Select value={formData.leagueId} onValueChange={(v) => setFormData(f => ({ ...f, leagueId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Liga wählen" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold">Saison</label>
        <Input
          value={formData.season}
          onChange={(e) => setFormData(f => ({ ...f, season: e.target.value }))}
          placeholder="z.B. 2025/2026"
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold">Wettbewerb Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
          placeholder="z.B. German Bowl 2025"
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold">Start Datum</label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold">End Datum</label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(f => ({ ...f, endDate: e.target.value }))}
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
}