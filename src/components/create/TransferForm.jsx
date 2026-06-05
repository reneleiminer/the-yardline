import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function TransferForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const { teams } = useGlobalData();
  const [playerName, setPlayerName] = useState('');
  const [fromTeam, setFromTeam] = useState('');
  const [toTeam, setToTeam] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || !fromTeam || !toTeam) return;

    setLoading(true);
    try {
      // Create transfer post
      const text = `${playerName}\n${fromTeam} → ${toTeam}\n\n${description}`;
      
      await base44.entities.Post.create({
        type: 'transfer',
        text,
        authorId: appUser.id,
        authorUsername: appUser.username,
        authorAvatar: appUser.avatar,
        authorRole: appUser.role,
        authorVerified: appUser.verified,
        teamIds: [fromTeam, toTeam],
        publishedAtUtc: new Date().toISOString(),
      });
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Spieler/Trainer Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="text-sm"
        disabled={loading}
      />

      <div className="grid grid-cols-2 gap-2">
        <Select value={fromTeam} onValueChange={setFromTeam} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Von Team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.shortName || t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={toTeam} onValueChange={setToTeam} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder="Zu Team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.shortName || t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        placeholder="Details (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-20 text-sm"
        disabled={loading}
      />

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={loading || !playerName.trim() || !fromTeam || !toTeam}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Veröffentlichen...
            </>
          ) : (
            'Veröffentlichen'
          )}
        </Button>
      </div>
    </form>
  );
}