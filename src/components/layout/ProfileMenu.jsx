import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { useAuth } from '@/lib/AuthContext';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  Building2,
  Database,
  Landmark,
  LogOut,
  Megaphone,
  Newspaper,
  Radio,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';
import {
  getRoleSlug,
  isAdminBySlug,
  isDataEditorBySlug,
  isModeratorBySlug,
} from '@/lib/roleDefinitions';
import { isSystemRole, YARDLINE_LOGO_URL } from '@/lib/systemRoleUtils';

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { appUser } = useAppUser();
  const { user: base44User, logout } = useAuth();
  const { teams = [], leagues = [] } = useGlobalData();

  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');

  const isUserAdmin = roleSlug
    ? isAdminBySlug(roleSlug)
    : base44User?.role === 'Admin';

  const isUserModeratorOnly =
    isModeratorBySlug(roleSlug) &&
    !isAdminBySlug(roleSlug);

  const isUserDataEditorOnly =
    isDataEditorBySlug(roleSlug) &&
    !isAdminBySlug(roleSlug);

  const isMediaPartner = roleSlug === 'media_partner';
  const isPodcastPartner = roleSlug === 'podcast_partner';
  const isClub = roleSlug === 'club';
  const isLeague = roleSlug === 'league';
  const isOfficialMedia = roleSlug === 'official_media';

  const isInternalSystemUser =
    isSystemRole(appUser?.roleSlug || appUser?.role) ||
    isUserAdmin ||
    isMediaPartner ||
    isPodcastPartner;

  const connectedTeam = useMemo(() => {
    if (!appUser?.connectedTeamId) return null;
    return teams.find(team => team.id === appUser.connectedTeamId) || null;
  }, [appUser?.connectedTeamId, teams]);

  const connectedLeague = useMemo(() => {
    if (!appUser?.linkedLeagueId) return null;
    return leagues.find(league => league.id === appUser.linkedLeagueId) || null;
  }, [appUser?.linkedLeagueId, leagues]);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        return;
      }

      await base44.auth.logout();
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  if (!appUser) {
    return null;
  }

  const avatarUrl = (() => {
    if (isInternalSystemUser) return YARDLINE_LOGO_URL;

    if (isClub) {
      return connectedTeam?.logo ? getImageUrl(connectedTeam.logo) : appUser.avatar || '';
    }

    if (isLeague) {
      return connectedLeague?.logo ? getImageUrl(connectedLeague.logo) : appUser.avatar || '';
    }

    return appUser.avatar || '';
  })();

  const avatarLetter = (() => {
    if (isInternalSystemUser) return 'Y';
    if (isClub) return connectedTeam?.name?.[0] || appUser.displayName?.[0] || 'V';
    if (isLeague) return connectedLeague?.name?.[0] || appUser.displayName?.[0] || 'L';
    return appUser.displayName?.[0] || appUser.username?.[0] || '?';
  })();

  const displayName = (() => {
    if (isUserAdmin) return 'Admin';
    if (isMediaPartner) return appUser.displayName || 'Media';
    if (isPodcastPartner) return appUser.displayName || 'Podcast';
    if (isUserModeratorOnly) return 'Moderator';
    if (isUserDataEditorOnly) return 'Datenpflege';
    if (isClub) return connectedTeam?.name || appUser.displayName || appUser.username;
    if (isLeague) return connectedLeague?.name || appUser.displayName || appUser.username;
    return appUser.displayName || appUser.username;
  })();

  const displayHandle = (() => {
    if (isUserAdmin) return 'Systemkonto';
    if (isMediaPartner) return 'Media-Zugang';
    if (isPodcastPartner) return 'Podcast-Zugang';
    if (isUserModeratorOnly || isUserDataEditorOnly) return 'Ehrenamt';
    if (isClub) return 'Vereinskonto';
    if (isLeague) return 'Ligakonto';
    if (isOfficialMedia) return 'Medienkonto';
    return `@${appUser.username}`;
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-9 h-9 rounded-full overflow-hidden bg-secondary flex items-center justify-center border border-border/50">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={event => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xs font-bold text-foreground uppercase">
              {avatarLetter}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-sm font-semibold truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {displayHandle}
          </p>
        </div>

        <DropdownMenuSeparator />

        {!isInternalSystemUser && (
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Mein Profil
          </DropdownMenuItem>
        )}

        {isUserAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <Users className="w-4 h-4 mr-2" />
            Admin-Dashboard
          </DropdownMenuItem>
        )}

        {isUserAdmin && (
          <DropdownMenuItem onClick={() => navigate('/user/statistics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Game Statistics
          </DropdownMenuItem>
        )}

        {isMediaPartner && (
          <DropdownMenuItem onClick={() => navigate('/data-editor')}>
            <Newspaper className="w-4 h-4 mr-2" />
            Media-Bereich
          </DropdownMenuItem>
        )}

        {isPodcastPartner && (
          <DropdownMenuItem onClick={() => navigate('/podcast')}>
            <Radio className="w-4 h-4 mr-2" />
            Podcast-Bereich
          </DropdownMenuItem>
        )}

        {isClub && (
          <DropdownMenuItem onClick={() => navigate('/dashboard/club')}>
            <Building2 className="w-4 h-4 mr-2" />
            Vereins-Dashboard
          </DropdownMenuItem>
        )}

        {isLeague && (
          <DropdownMenuItem onClick={() => navigate('/dashboard/league')}>
            <Landmark className="w-4 h-4 mr-2" />
            Liga-Dashboard
          </DropdownMenuItem>
        )}

        {isOfficialMedia && (
          <DropdownMenuItem onClick={() => navigate('/dashboard/media')}>
            <Megaphone className="w-4 h-4 mr-2" />
            Medien-Dashboard
          </DropdownMenuItem>
        )}

        {isUserModeratorOnly && (
          <DropdownMenuItem onClick={() => navigate('/moderation')}>
            <Shield className="w-4 h-4 mr-2" />
            Moderation
          </DropdownMenuItem>
        )}

        {isUserDataEditorOnly && (
          <DropdownMenuItem onClick={() => navigate('/data-editor')}>
            <Database className="w-4 h-4 mr-2" />
            Datenpflege
          </DropdownMenuItem>
        )}

        {isUserDataEditorOnly && (
          <DropdownMenuItem onClick={() => navigate('/user/statistics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Game Statistics
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Einstellungen
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
