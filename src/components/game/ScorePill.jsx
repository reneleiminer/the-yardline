import React from 'react';

export default function ScorePill({ score, size = 'lg' }) {
  const sizeClasses = {
    sm: 'text-lg font-black',
    lg: 'text-3xl font-black'
  };

  return (
    <span className={`${sizeClasses[size]} tabular-nums text-white leading-none`}>
      {score ?? 0}
    </span>
  );
}
