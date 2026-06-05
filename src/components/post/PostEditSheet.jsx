import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function PostEditSheet({ post, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [text, setText] = useState(post?.text || '');
  const [title, setTitle] = useState(post?.title || '');
  const [teaser, setTeaser] = useState(post?.teaser || '');

  const hasTitle = ['news', 'official'].includes(post?.type);
  const hasTeaser = ['news', 'official'].includes(post?.type);

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      text,
      updatedAtUtc: new Date().toISOString(),
    };
    if (hasTitle) updates.title = title;
    if (hasTeaser) updates.teaser = teaser;

    await base44.entities.Post.update(post.id, updates);
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-2xl px-4">
        <SheetHeader className="py-3">
          <SheetTitle>Beitrag bearbeiten</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {hasTitle && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Titel</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel…"
              />
            </div>
          )}
          {hasTeaser && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teaser</label>
              <Input
                value={teaser}
                onChange={(e) => setTeaser(e.target.value)}
                placeholder="Teaser / Kurzbeschreibung…"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Text</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Inhalt…"
              className="min-h-[160px] resize-none"
            />
          </div>
        </div>

        <div className="pb-6 pt-2 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !text.trim()}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}