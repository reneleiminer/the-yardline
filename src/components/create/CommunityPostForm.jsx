import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import { parseMentions } from '@/lib/mentionUtils';

export default function CommunityPostForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();
  const { leagues, teams } = useGlobalData();

  const [text, setText] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [teamIds, setTeamIds] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const leagueTeams = teams.filter(t => t.leagueId === leagueId);
  const toggleTeam = (teamId) => {
    setTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setImages(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      // Resolve mentions to include userId
      const parsedMentions = parseMentions(text);
      const resolvedMentions = [];
      for (const mention of parsedMentions) {
        const users = await base44.entities.AppUser.filter({ username: mention.username });
        if (users.length > 0) {
          resolvedMentions.push({
            userId: users[0].id,
            username: users[0].username,
            displayName: users[0].displayName
          });
        }
      }

      await base44.entities.Post.create({
        type: 'community',
        authorId: appUser.id,
        text,
        leagueId: leagueId || null,
        teamIds: teamIds.length > 0 ? teamIds : null,
        images: images.length > 0 ? images : null,
        mentions: resolvedMentions.length > 0 ? resolvedMentions : null,
        likesCount: 0,
        commentsCount: 0,
        publishedAtUtc: new Date().toISOString(),
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
      <Textarea
        placeholder="Was gibt es Neues?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-[100px] bg-secondary border-border/50 resize-none"
      />

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Liga</label>
        <Select value={leagueId} onValueChange={setLeagueId}>
          <SelectTrigger className="bg-secondary border-border/50 text-sm">
            <SelectValue placeholder="Liga wählen (optional)" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {leagueId && leagueTeams.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Teams</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {leagueTeams.map(team => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left text-sm ${
                  teamIds.includes(team.id)
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-secondary border-border/50 hover:border-border'
                }`}
              >
                {team.logo && (
                  <img src={getImageUrl(team.logo)} alt="" className="w-4 h-4 rounded-full" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <span className="truncate">{team.shortName || team.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={getImageUrl(img)} alt="" className="w-16 h-16 rounded-lg object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              <button
                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors w-fit text-sm">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span>Bilder</span>
        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
      </label>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !text.trim()} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Posten'}
        </Button>
      </div>
    </div>
  );
}