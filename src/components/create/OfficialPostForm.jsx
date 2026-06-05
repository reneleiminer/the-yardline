import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import MentionInput from '@/components/interactions/MentionInput';

export default function OfficialPostForm({ onClose, onSuccess }) {
  const { appUser } = useAppUser();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    setLoading(true);
    try {
      await base44.entities.Post.create({
        type: 'official',
        title,
        text,
        authorId: appUser.id,
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
        placeholder="Titel"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="text-sm"
        disabled={loading}
      />

      <Textarea
        placeholder="Nachricht"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-24 text-sm"
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
          disabled={loading || !title.trim() || !text.trim()}
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