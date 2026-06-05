import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';

const PERMISSIONS = ['Personal Use', 'Editorial Use', 'Commercial Use', 'No Restrictions'];

export default function PhotoForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();
  const { leagues, teams } = useGlobalData();

  const [images, setImages] = useState([]);
  const [leagueId, setLeagueId] = useState('');
  const [teamIds, setTeamIds] = useState([]);
  const [permissions, setPermissions] = useState('Personal Use');
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
    if (images.length === 0) return;
    setSubmitting(true);
    try {
      // Create one post per image or one combined post
      await base44.entities.Post.create({
        type: 'photo',
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar || '',
        authorRole: appUser.role,
        authorVerified: appUser.verified || false,
        images,
        leagueId: leagueId || null,
        teamIds: teamIds.length > 0 ? teamIds : null,
        permissions,
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
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <Select value={permissions} onValueChange={setPermissions}>
        <SelectTrigger className="bg-secondary border-border/50 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERMISSIONS.map(p => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={leagueId} onValueChange={setLeagueId}>
        <SelectTrigger className="bg-secondary border-border/50 text-sm">
          <SelectValue placeholder="Liga (optional)" />
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

      {images.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{images.length} Bilder</label>
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={getImageUrl(img)} alt="" className="w-full aspect-square rounded-lg object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                <button
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors w-fit text-sm">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span>Bilder auswählen</span>
        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
      </label>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || images.length === 0} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hochladen'}
        </Button>
      </div>
    </div>
  );
}