import React from 'react';

export default function GameSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 bg-card border border-border/50 rounded-xl p-3 animate-pulse">
      <div className="h-3 w-16 bg-secondary mb-2 rounded" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-secondary" />
            <div className="h-3 w-12 bg-secondary rounded" />
          </div>
          <div className="h-3 w-4 bg-secondary rounded" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-secondary" />
            <div className="h-3 w-12 bg-secondary rounded" />
          </div>
          <div className="h-3 w-4 bg-secondary rounded" />
        </div>
      </div>
    </div>
  );
}