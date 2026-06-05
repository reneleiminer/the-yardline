import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export default function StreamButton({ game, size = 'sm', className = '' }) {
  const isAvailable =
    game?.streamEnabled &&
    game?.streamStatus === 'approved' &&
    game?.streamUrl;

  if (!isAvailable) return null;

  const handleClick = () => {
    window.open(game.streamUrl, '_blank');
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant="outline"
      className={`gap-1.5 ${className}`}
    >
      <Play className="w-3.5 h-3.5" />
      Stream ansehen
    </Button>
  );
}