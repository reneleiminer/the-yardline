import React from 'react';

export default function PostSkeleton() {
  return (
    <article className="border-b border-border/30 pb-4 mb-4 animate-pulse">
      <div className="flex items-center gap-3 px-4 mb-3">
        <div className="w-9 h-9 rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-secondary rounded" />
          <div className="h-2 w-16 bg-secondary/50 rounded" />
        </div>
        <div className="h-4 w-12 bg-secondary rounded-full" />
      </div>

      <div className="px-4 space-y-3">
        <div className="h-4 w-full bg-secondary rounded" />
        <div className="h-4 w-3/4 bg-secondary rounded" />
        <div className="w-full aspect-video bg-secondary rounded-lg" />
      </div>

      <div className="flex gap-6 px-4 mt-4">
        <div className="h-4 w-8 bg-secondary rounded" />
        <div className="h-4 w-8 bg-secondary rounded" />
        <div className="h-4 w-8 bg-secondary rounded" />
      </div>
    </article>
  );
}