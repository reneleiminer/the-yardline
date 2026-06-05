import React from 'react';

export default function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-secondary" />
          <div className="h-4 w-24 bg-secondary rounded" />
          <div className="ml-auto flex gap-3">
            <div className="h-4 w-8 bg-secondary rounded" />
            <div className="h-4 w-8 bg-secondary rounded" />
            <div className="h-4 w-8 bg-secondary rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}