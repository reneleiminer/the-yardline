import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppUser } from '@/lib/useAppUser';
import { FileText, Camera, Newspaper, Image as ImageIcon, Megaphone, Shuffle } from 'lucide-react';

const ROLE_OPTIONS = {
  Fan: [{ type: 'community', label: 'Community Post', icon: FileText }],
  Creator: [
    { type: 'community', label: 'Community Post', icon: FileText },
    { type: 'highlight', label: 'Highlight Post', icon: Camera },
  ],
  Fotograf: [
    { type: 'photo', label: 'Upload Images', icon: ImageIcon },
  ],
  Journalist: [
    { type: 'news', label: 'News Article', icon: Newspaper },
    { type: 'community', label: 'Community Post', icon: FileText },
  ],
  Verein: [
    { type: 'community', label: 'Community Post', icon: FileText },
    { type: 'official', label: 'Official Post', icon: Megaphone },
    { type: 'transfer', label: 'Transfer News', icon: Shuffle },
  ],
  Liga: [
    { type: 'official', label: 'Official Post', icon: Megaphone },
    { type: 'news', label: 'News Article', icon: Newspaper },
  ],
  Moderator: [
    { type: 'community', label: 'Community Post', icon: FileText },
    { type: 'news', label: 'News Article', icon: Newspaper },
  ],
  DataEditor: [
    { type: 'community', label: 'Community Post', icon: FileText },
  ],
  Admin: [
    { type: 'community', label: 'Community Post', icon: FileText },
    { type: 'news', label: 'News Article', icon: Newspaper },
    { type: 'official', label: 'Official Post', icon: Megaphone },
    { type: 'transfer', label: 'Transfer News', icon: Shuffle },
    { type: 'highlight', label: 'Highlight Post', icon: Camera },
    { type: 'photo', label: 'Upload Images', icon: ImageIcon },
  ],
};

export default function CreateModal({ open, onOpenChange, onSelectType }) {
  const { appUser } = useAppUser();
  const role = appUser?.role || 'Fan';
  const options = ROLE_OPTIONS[role] || [];

  if (options.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Erstellen</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            Deine Rolle erlaubt keine Beiträge ({role})
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Beitrag erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => {
                  onSelectType(option.type);
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg hover:border-primary/50 hover:bg-secondary/50 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}