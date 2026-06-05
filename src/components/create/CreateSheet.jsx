import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppUser } from '@/lib/useAppUser';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { getRoleSlug } from '@/lib/roleDefinitions';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Camera,
  Database,
  FileText,
  Flag,
  Globe,
  Info,
  Layers,
  Megaphone,
  MessageCircle,
  Mic,
  Newspaper,
  Radio,
  Shield,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';

const ADMIN_ACTIONS = {
  subtitle: 'Admin-Tools',
  items: [
    {
      label: 'Neues Spiel',
      icon: Trophy,
      route: '/admin/games?action=create',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Ergebnis eintragen',
      icon: BarChart3,
      route: '/admin/game-result',
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'Neue Liga',
      icon: Layers,
      route: '/admin/leagues?action=create',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Neuer Verein',
      icon: Shield,
      route: '/admin/teams?action=create',
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Wettbewerb',
      icon: Trophy,
      route: '/admin/competitions?action=create',
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'App-Update',
      icon: Radio,
      route: '/admin/updates?action=create',
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
    {
      label: 'Nutzer & Rollen',
      icon: Users,
      route: '/admin/users',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
  ],
};

const DATA_EDITOR_ACTIONS = {
  subtitle: 'Ehrenamtliche Datenpflege',
  items: [
    {
      label: 'Datenpflege öffnen',
      icon: Database,
      route: '/data-editor',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Ergebnis eintragen',
      icon: BarChart3,
      route: '/data-editor',
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'Stream eintragen',
      icon: Radio,
      route: '/data-editor',
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
    {
      label: 'Tabellen prüfen',
      icon: Database,
      route: '/tabellen',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
  ],
};

const MODERATOR_ACTIONS = {
  subtitle: 'Ehrenamtliche Moderation',
  items: [
    {
      label: 'Moderation öffnen',
      icon: Flag,
      route: '/moderation',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
    },
    {
      label: 'Gemeldete Beiträge',
      icon: AlertTriangle,
      route: '/moderation',
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Nutzer prüfen',
      icon: UserCheck,
      route: '/moderation',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ],
};

const JOURNALIST_ACTIONS = {
  subtitle: 'Beitrag erstellen',
  items: [
    {
      label: 'News-Artikel',
      icon: Newspaper,
      route: '/create/news',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Transfer-News',
      icon: ArrowLeftRight,
      route: '/create/transfer',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Community-Beitrag',
      icon: MessageCircle,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ],
};

const CREATOR_ACTIONS = {
  subtitle: 'Beitrag erstellen',
  items: [
    {
      label: 'Community-Beitrag',
      icon: MessageCircle,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Highlight-Beitrag',
      icon: Trophy,
      route: '/create/community',
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'Video-Beitrag',
      icon: Mic,
      route: '/create/community',
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
  ],
};

const PHOTOGRAPHER_ACTIONS = {
  subtitle: 'Beitrag erstellen',
  items: [
    {
      label: 'Fotos hochladen',
      icon: Camera,
      route: '/create/community',
      color: 'text-pink-400',
      bg: 'bg-pink-400/10',
    },
    {
      label: 'Galerie erstellen',
      icon: Layers,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ],
};

const CLUB_ACTIONS = appUser => ({
  subtitle: 'Vereins-Tools',
  items: [
    {
      label: 'Vereinsbeitrag erstellen',
      icon: Megaphone,
      route: '/create/announcement',
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Transfer melden',
      icon: ArrowLeftRight,
      route: '/create/transfer',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Community-Beitrag',
      icon: MessageCircle,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Vereinsseite öffnen',
      icon: Globe,
      route: appUser?.connectedTeamId ? `/team/${appUser.connectedTeamId}` : '/profile',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
  ],
});

const LEAGUE_ACTIONS = appUser => ({
  subtitle: 'Liga-Tools',
  items: [
    {
      label: 'Ankündigung erstellen',
      icon: Megaphone,
      route: '/create/announcement',
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'News-Artikel',
      icon: Newspaper,
      route: '/create/news',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Community-Beitrag',
      icon: MessageCircle,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Ligaseite öffnen',
      icon: Globe,
      route: appUser?.linkedLeagueId ? `/league/${appUser.linkedLeagueId}` : '/profile',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
  ],
});

const OFFICIAL_MEDIA_ACTIONS = {
  subtitle: 'Offizielle Medien',
  items: [
    {
      label: 'Offizielle News',
      icon: Newspaper,
      route: '/create/news',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Ankündigung',
      icon: Megaphone,
      route: '/create/announcement',
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
    },
    {
      label: 'Community-Beitrag',
      icon: MessageCircle,
      route: '/create/community',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ],
};

const FAN_ACTIONS = {
  subtitle: null,
  items: [],
};

function getMenuForRole(roleSlug, appUser) {
  switch (roleSlug) {
    case 'admin':
      return ADMIN_ACTIONS;
    case 'data_editor':
      return DATA_EDITOR_ACTIONS;
    case 'moderator':
      return MODERATOR_ACTIONS;
    case 'journalist':
      return JOURNALIST_ACTIONS;
    case 'creator':
      return CREATOR_ACTIONS;
    case 'photographer':
      return PHOTOGRAPHER_ACTIONS;
    case 'club':
      return CLUB_ACTIONS(appUser);
    case 'official_media':
      return OFFICIAL_MEDIA_ACTIONS;
    case 'league':
      return LEAGUE_ACTIONS(appUser);
    default:
      return FAN_ACTIONS;
  }
}

export default function CreateSheet({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { appUser } = useAppUser();

  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');
  const menu = getMenuForRole(roleSlug, appUser);

  const handleSelect = route => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-4 pb-8 pt-2"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center mb-4 pt-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="mb-5 px-1">
          <h2 className="text-base font-bold">Schnellzugriff</h2>

          {menu.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {menu.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          {menu.items.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={`${item.label}-${item.route}`}
                onClick={() => handleSelect(item.route)}
                className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-secondary/70 active:scale-[0.98] transition-all text-left"
              >
                <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>

                <p className="text-sm font-semibold">
                  {item.label}
                </p>
              </button>
            );
          })}

          {menu.items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Info className="w-8 h-8 text-muted-foreground" />

              <p className="text-sm text-muted-foreground">
                Du kannst aktuell keine Inhalte erstellen.
              </p>

              <p className="text-xs text-muted-foreground">
                Besuche <strong>Mitmachen</strong> in den Einstellungen, um eine Rolle zu aktivieren.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}