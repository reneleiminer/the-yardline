import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function AnnouncementsSection() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
      <h2 className="text-base font-bold">Ankündigungen</h2>
      <button
        onClick={() => navigate('/announcements')}
        className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
      >
        Alle
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}