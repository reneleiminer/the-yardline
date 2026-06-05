import React from 'react';

export default function ScorePill({ score, size = 'lg' }) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-lg font-black',
    lg: 'px-3 py-1.5 text-3xl font-black'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-secondary/50 flex items-center justify-center`}>
      <span className="tabular-nums text-white leading-none">
        {score ?? 0}
      </span>
    </div>
  );
}