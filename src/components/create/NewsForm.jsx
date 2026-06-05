import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';

const CATEGORIES = ['Sport', 'Geschäft', 'Community', 'Turniere', 'Spieler', 'Saison'];

export default function NewsForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();
  const { leagues, teams } = useGlobalData();

  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
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
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.Post.create({
        type: 'news',
        authorId: appUser.id,
        title,
        teaser,
        text: content,
        category: category || null,
        leagueId: leagueId || null,
        teamIds: teamIds.length > 0 ? teamIds : null,
        images: images.length > 0 ? images : null,
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
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      <Input
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-secondary border-border/50 font-semibold text-base"
      />

      <Input
        placeholder="Teaser (kurze Beschreibung)"
        value={teaser}
        onChange={(e) => setTeaser(e.target.value)}
        className="bg-secondary border-border/50 text-sm"
      />

      <Textarea
        placeholder="Artikel schreiben..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[120px] bg-secondary border-border/50 resize-none"
      />

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="bg-secondary border-border/50 text-sm">
          <SelectValue placeholder="Kategorie" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

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
                {team.logo && (
                  <img src={getImageUrl(team.logo)} alt="" className="w-3 h-3 rounded-full" onError={(e) => { e.target.style.display = 'none'; }} />
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
        <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()} className="flex-1">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Veröffentlichen'}
        </Button>
      </div>
    </div>
  );
}