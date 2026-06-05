import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadField from '@/components/create/ImageUploadField';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_ROLES = ['Verein', 'Admin', 'verein', 'admin'];

export default function CreateTransfer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appUser } = useAppUser();

  const [transferType, setTransferType] = useState('');
  const [personType, setPersonType] = useState('');
  const [personName, setPersonName] = useState('');
  const [position, setPosition] = useState('');
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);

  const userRole = appUser?.roleSlug || appUser?.role || '';
  if (appUser && !ALLOWED_ROLES.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <p className="text-muted-foreground text-sm text-center">Keine Berechtigung für Transfer-Posts.</p>
      </div>
    );
  }

  const canPublish = transferType && personType && personName.trim() && (fromTeam.trim() || toTeam.trim());

  const handlePublish = async () => {
    if (!canPublish) { toast.error('Pflichtfelder ausfüllen'); return; }
    setLoading(true);
    try {
      const lines = [
        personName,
        position && `Position: ${position}`,
        fromTeam && `Von: ${fromTeam}`,
        toTeam && `Zu: ${toTeam}`,
        description,
      ].filter(Boolean);

      await base44.entities.Post.create({
        type: 'transfer',
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar,
        authorRole: appUser.role,
        authorVerified: appUser.verified,
        title: `${personName}${fromTeam && toTeam ? ` | ${fromTeam} → ${toTeam}` : ''}`,
        text: lines.join('\n'),
        images: image ? [image] : [],
        category: transferType,
        publishedAtUtc: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Transfer veröffentlicht!');
      navigate('/');
    } catch {
      toast.error('Fehler beim Veröffentlichen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">Transfer</h1>
          <Button size="sm" onClick={handlePublish} disabled={!canPublish || loading} className="h-8 px-4 text-xs">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Posten'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-5">
        {/* Type row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Transfertyp *</label>
            <Select value={transferType} onValueChange={setTransferType}>
              <SelectTrigger className="bg-secondary/50 border-border/30 rounded-xl">
                <SelectValue placeholder="Typ wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="signing">Neuverpflichtung</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="release">Freigabe</SelectItem>
                <SelectItem value="extension">Vertragsverlängerung</SelectItem>
                <SelectItem value="coach_update">Trainer-Update</SelectItem>
                <SelectItem value="staff_update">Staff-Update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Personentyp *</label>
            <Select value={personType} onValueChange={setPersonType}>
              <SelectTrigger className="bg-secondary/50 border-border/30 rounded-xl">
                <SelectValue placeholder="Person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Spieler</SelectItem>
                <SelectItem value="coach">Trainer</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="other">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Person info */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
          <input
            value={personName}
            onChange={e => setPersonName(e.target.value)}
            placeholder="Vollständiger Name"
            autoFocus
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Position / Rolle</label>
          <input
            value={position}
            onChange={e => setPosition(e.target.value)}
            placeholder="z.B. Wide Receiver, Offensive Coordinator"
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        {/* From → To */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Wechsel</label>
          <div className="flex items-center gap-2">
            <input
              value={fromTeam}
              onChange={e => setFromTeam(e.target.value)}
              placeholder="Von (Team)"
              className="flex-1 bg-secondary/50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={toTeam}
              onChange={e => setToTeam(e.target.value)}
              placeholder="Zu (Team)"
              className="flex-1 bg-secondary/50 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Details (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Weitere Infos zum Transfer…"
            rows={5}
            className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/30"
          />
        </div>

        {/* Image */}
        <ImageUploadField value={image} onChange={setImage} label="Bild (optional)" />
      </div>
    </div>
  );
}