import React from 'react';

export default function PhotoCredit({ author }) {
  if (author?.role !== 'Fotograf') return null;

  return (
    <div className="px-4 py-2 text-xs text-muted-foreground bg-secondary/30 border-t border-border/20">
      Foto: @{author.username}
    </div>
  );
}