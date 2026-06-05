import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function Step4Participants({ formData, setFormData }) {
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', formData.leagueId],
    queryFn: () => {
      if (!formData.leagueId) return [];
      return base44.entities.Team.filter({ leagueId: formData.leagueId });
    },
    enabled: !!formData.leagueId,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeam = (teamId) => {
    setFormData(f => ({
      ...f,
      teamIds: f.teamIds.includes(teamId)
        ? f.teamIds.filter(id => id !== teamId)
        : [...f.teamIds, teamId],
    }));
  };

  if (isLoading) {
    return <Loader2 className="w-5 h-5 animate-spin" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Wähle teilnehmende Teams ({formData.teamIds.length} ausgewählt)
      </p>

      <Input
        placeholder="Teams durchsuchen..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-10"
      />

      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {filteredTeams.map(team => (
          <button
            key={team.id}
            onClick={() => toggleTeam(team.id)}
            className={`p-2 rounded-lg border text-xs text-left transition-colors ${
              formData.teamIds.includes(team.id)
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {team.shortName || team.name}
          </button>
        ))}
      </div>

      {formData.teamIds.length > 0 && (
        <div className="p-3 bg-secondary/50 rounded-lg">
          <p className="text-xs font-semibold mb-2">Ausgewählte Teams:</p>
          <div className="flex gap-1 flex-wrap">
            {formData.teamIds.map(id => {
              const team = teams.find(t => t.id === id);
              return (
                <Badge key={id} variant="outline" className="text-xs">
                  {team?.shortName || team?.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => setFormData(f => ({ ...f, teamIds: teams.map(t => t.id) }))}
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9"
        >
          Alle
        </Button>
        <Button
          onClick={() => setFormData(f => ({ ...f, teamIds: [] }))}
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-9"
        >
          Keine
        </Button>
      </div>
    </div>
  );
}