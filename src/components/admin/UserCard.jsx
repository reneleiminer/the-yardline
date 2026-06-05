import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Landmark,
  MoreVertical,
  Radio,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const roleColors = {
  fan: 'bg-slate-500/20 text-slate-400',
  creator: 'bg-blue-500/20 text-blue-400',
  photographer: 'bg-cyan-500/20 text-cyan-400',
  journalist: 'bg-purple-500/20 text-purple-400',
  official_media: 'bg-pink-500/20 text-pink-400',
  club: 'bg-emerald-500/20 text-emerald-400',
  league: 'bg-indigo-500/20 text-indigo-400',
  moderator: 'bg-orange-500/20 text-orange-400',
  data_editor: 'bg-green-500/20 text-green-400',
  admin: 'bg-red-500/20 text-red-400',
};

const statusDot = {
  active: 'bg-green-500',
  warned: 'bg-yellow-500',
  suspended: 'bg-amber-600',
  banned: 'bg-red-500',
};

const fallbackRoleNames = {
  fan: 'Fan',
  creator: 'Creator',
  photographer: 'Fotograf',
  journalist: 'Journalist',
  official_media: 'Offizielle Medien',
  club: 'Verein',
  league: 'Liga',
  moderator: 'Moderator',
  data_editor: 'Daten-Editor',
  admin: 'Admin',
};

function getInitials(user) {
  return (user.displayName || user.username || '?')
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserCard({
  user,
  roleMap,
  teams = [],
  clubs = [],
  leagues = [],
  onChangeRole,
  onConnectClub,
  onConnectLeague,
  onDisconnectOrganization,
  onWarn,
  onSuspend,
  onUnsuspend,
  onDelete,
}) {
  const roleSlug = (user.roleSlug || 'fan').toLowerCase();
  const status = user.status || 'active';

  const isAdmin = roleSlug === 'admin';
  const isClub = roleSlug === 'club';
  const isLeague = roleSlug === 'league';
  const isOfficialMedia = roleSlug === 'official_media';
  const isOfficialOrganization = isClub || isLeague || isOfficialMedia;

  const initials = getInitials(user);

  const connectedTeam = user.connectedTeamId
    ? teams.find(team => team.id === user.connectedTeamId)
    : null;

  const legacyConnectedClub = (user.connectedClubId || user.linkedClubId)
    ? clubs.find(club => club.id === (user.connectedClubId || user.linkedClubId))
    : null;

  const connectedLeague = user.linkedLeagueId
    ? leagues.find(league => league.id === user.linkedLeagueId)
    : null;

  const connectedClubName =
    connectedTeam?.name ||
    legacyConnectedClub?.name ||
    null;

  const hasBrokenClubConnection = isClub && !connectedTeam;
  const hasBrokenLeagueConnection = isLeague && !connectedLeague;

  const roleName =
    roleMap[roleSlug]?.name ||
    fallbackRoleNames[roleSlug] ||
    roleSlug;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-border/80 transition-all duration-200">
      <div className="flex-shrink-0 relative">
        {!isAdmin && user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold ${
              isAdmin
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gradient-to-br from-primary/40 to-primary/20 text-primary'
            }`}
          >
            {isAdmin ? 'A' : initials}
          </div>
        )}

        {!isAdmin && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${
              statusDot[status] || 'bg-slate-500'
            } border-2 border-card`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isAdmin ? (
          <>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm">Admin</span>
            </div>

            <p className="text-xs text-muted-foreground">Systemkonto</p>

            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge className="text-[10px] px-2 py-0 bg-red-500/20 text-red-400">
                admin
              </Badge>

              {user.isOwner && (
                <Badge className="text-[10px] px-2 py-0 bg-amber-500/20 text-amber-400">
                  Owner
                </Badge>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm truncate">
                {user.displayName || user.username}
              </span>

              {user.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate">
              @{user.username} · {user.email}
            </p>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge className={`text-[10px] px-2 py-0 ${roleColors[roleSlug] || roleColors.fan}`}>
                {roleName}
              </Badge>

              {isClub && connectedClubName && (
                <Badge className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />
                  {connectedClubName}
                </Badge>
              )}

              {isLeague && connectedLeague && (
                <Badge className="text-[10px] px-2 py-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                  <Landmark className="w-2.5 h-2.5" />
                  {connectedLeague.shortName || connectedLeague.name}
                </Badge>
              )}

              {isOfficialMedia && (
                <Badge className="text-[10px] px-2 py-0 bg-pink-500/10 text-pink-400 border border-pink-500/30 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" />
                  Medienkonto
                </Badge>
              )}

              {user.warningsCount > 0 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-500/30 text-amber-400">
                  {user.warningsCount}x Warnung
                </Badge>
              )}
            </div>

            {isClub && connectedClubName && (
              <p className="text-[10px] text-emerald-400 mt-1">
                Verein verbunden: {connectedClubName}
              </p>
            )}

            {isLeague && connectedLeague && (
              <p className="text-[10px] text-indigo-400 mt-1">
                Liga verbunden: {connectedLeague.shortName || connectedLeague.name}
              </p>
            )}

            {hasBrokenClubConnection && (
              <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Verein-Rolle ohne verbundene Team-Seite
              </p>
            )}

            {hasBrokenLeagueConnection && (
              <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Liga-Rolle ohne verbundene Liga
              </p>
            )}
          </>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {isAdmin ? (
            !user.isOwner && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(user)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Nutzer löschen
              </DropdownMenuItem>
            )
          ) : (
            <>
              {!user.isOwner && (
                <DropdownMenuItem onClick={() => onChangeRole(user)}>
                  Rolle ändern
                </DropdownMenuItem>
              )}

              {isClub ? (
                <>
                  {connectedTeam && (
                    <DropdownMenuItem asChild>
                      <Link to={`/team/${connectedTeam.id}`}>
                        Verein anzeigen
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => onConnectClub(user)}>
                    Verein wechseln
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => onConnectClub(user)}>
                  Verein verbinden
                </DropdownMenuItem>
              )}

              {isLeague ? (
                <>
                  {connectedLeague && (
                    <DropdownMenuItem asChild>
                      <Link to={`/league/${connectedLeague.id}`}>
                        Liga anzeigen
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => onConnectLeague(user)}>
                    Liga wechseln
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => onConnectLeague(user)}>
                  Liga verbinden
                </DropdownMenuItem>
              )}

              {isOfficialOrganization && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDisconnectOrganization(user)}
                >
                  Verbindung entfernen
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to={`/profile/${user.username}`}>
                  Profil ansehen
                </Link>
              </DropdownMenuItem>

              {!user.isOwner && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-amber-400 focus:text-amber-400"
                    onClick={() => onWarn(user)}
                  >
                    Verwarnen
                  </DropdownMenuItem>

                  {user.status === 'suspended' ? (
                    <DropdownMenuItem
                      className="text-green-400 focus:text-green-400"
                      onClick={() => onUnsuspend(user)}
                    >
                      Entsperren
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onSuspend(user)}
                    >
                      Sperren
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(user)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Nutzer löschen
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}