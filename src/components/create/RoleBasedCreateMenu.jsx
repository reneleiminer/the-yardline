import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppUser } from '@/lib/useAppUser';
import { getRoleSlug } from '@/lib/roleDefinitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeftRight,
  BookOpen,
  Database,
  Info,
  Newspaper,
  Trophy,
} from 'lucide-react';

const CREATE_OPTIONS_BY_ROLE = {
  fan: [],
  creator: [],
  photographer: [],
  journalist: ['news', 'transfer'],
  official_media: ['announcement', 'news'],
  club: ['announcement', 'transfer'],
  league: ['announcement', 'news'],
  moderator: [],
  data_editor: [],
  admin: ['announcement', 'news', 'transfer'],
};

const CONTENT_OPTIONS = {
  announcement: {
    label: 'Ankündigung',
    route: '/create/announcement',
    icon: BookOpen,
  },
  news: {
    label: 'News-Artikel',
    route: '/create/news',
    icon: Newspaper,
  },
  transfer: {
    label: 'Transfer',
    route: '/create/transfer',
    icon: ArrowLeftRight,
  },
};

const DATA_EDITOR_OPTIONS = [
  {
    label: 'Spiel erstellen / bearbeiten',
    route: '/data-editor',
    icon: Database,
  },
  {
    label: 'Ergebnis eintragen',
    route: '/data-editor',
    icon: Trophy,
  },
  {
    label: 'Stream-Link verwalten',
    route: '/data-editor',
    icon: Info,
  },
];

export default function RoleBasedCreateMenu({ isOpen, onOpenChange }) {
  const navigate = useNavigate();
  const { appUser, loading } = useAppUser();

  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');
  const permissionKeys = CREATE_OPTIONS_BY_ROLE[roleSlug] || CREATE_OPTIONS_BY_ROLE.fan;
  const contentOptions = permissionKeys
    .map(key => CONTENT_OPTIONS[key])
    .filter(Boolean);

  const isDataEditor = roleSlug === 'data_editor';
  const isModerator = roleSlug === 'moderator';

  const handleSelect = route => {
    navigate(route);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 min-h-[60px]">
          {loading && (
            <div className="space-y-2">
              {[1, 2].map(index => (
                <div
                  key={index}
                  className="h-12 rounded-lg bg-secondary/30 animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && isDataEditor && DATA_EDITOR_OPTIONS.map(option => {
            const Icon = option.icon;

            return (
              <button
                key={option.label}
                onClick={() => handleSelect(option.route)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}

          {!loading && isModerator && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Für Moderatoren gibt es hier keine Erstellen-Aktionen.
            </p>
          )}

          {!loading && !isDataEditor && !isModerator && contentOptions.map(option => {
            const Icon = option.icon;

            return (
              <button
                key={option.route}
                onClick={() => handleSelect(option.route)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}

          {!loading && !isDataEditor && !isModerator && contentOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Für deine Rolle sind aktuell keine Erstellen-Aktionen verfügbar.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
