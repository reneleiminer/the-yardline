import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2 } from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';

export default function HighlightForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();
  const { leagues, teams } = useGlobalData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [teamIds, setTeamIds] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const leagueTeams = teams.filter(t => t.leagueId === leagueId);
  const toggleTeam = (teamId) => {
    setTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl) return;
    setSubmitting(true);
    try {
      await base44.entities.Post.create({
        type: 'highlight',
        authorId: appUser.id,
        title,
        text: description,
        videoUrl,
        leagueId: leagueId || null,
        teamIds: teamIds.length > 0 ? teamIds : null,
        likesCount: 0,
        commentsCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onSuccess?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Highlight Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-secondary border-border/50 font-semibold"
      />

      <Textarea
        placeholder="Beschreibung"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[80px] bg-secondary border-border/50 resize-none"
      />

      <Select value={leagueId} onValueChange={setLeagueId}>
        <SelectTrigger className="bg-secondary border-border/50 text-sm">
          <SelectValue placeholder="Liga" />
        </SelectTrigger>
        <SelectContent>
          {leagues.map(l => (
            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {leagueId && leagueTeams.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Teams</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {leagueTeams.map(team => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left text-xs ${
                  teamIds.includes(team.id)
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-secondary border-border/50 hover:border-border'
                }`}
              >
                <span className="truncate">{team.shortName || team.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {videoUrl && (
        <div className="text-xs text-muted-foreground">
          ✓ Video hochgeladen
        </div>
      )}

      <label className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors w-fit text-sm">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        <span>Video</span>
        <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
      </label>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !videoUrl} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Posten'}
        </Button>
      </div>
    </div>
  );
}