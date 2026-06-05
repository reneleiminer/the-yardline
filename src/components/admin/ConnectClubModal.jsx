import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Landmark,
  Save,
  Search,
  X,
} from 'lucide-react';

function UserAvatar({ user }) {
  const initials = (user.displayName || user.username || '?')
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
      {initials}
    </div>
  );
}

function getLogoUrl(value) {
  if (!value) return '';
  return value;
}

export default function ConnectClubModal({
  user,
  type = 'club',
  open,
  onClose,
  onSuccess,
}) {
  const queryClient = useQueryClient();

  const isLeagueMode = type === 'league';
  const isClubMode = !isLeagueMode;

  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: open && isClubMode,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.list(),
    enabled: open && isClubMode,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
    enabled: open,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.AppUser.list(),
    enabled: open,
  });

  const leagueMap = useMemo(() => {
    const map = {};
    leagues.forEach(league => {
      map[league.id] = league;
    });
    return map;
  }, [leagues]);

  const userMap = useMemo(() => {
    const map = {};
    allUsers.forEach(item => {
      map[item.id] = item;
    });
    return map;
  }, [allUsers]);

  const clubItems = useMemo(() => {
    return teams.map(team => {
      const club =
        clubs.find(item =>
          item.leagueId === team.leagueId &&
          (
            item.name === team.name ||
            item.assignedUserId === user.id ||
            item.managedByUserId === user.id
          )
        ) ||
        null;

      return {
        id: team.id,
        type: 'club',
        team,
        club,
      };
    });
  }, [clubs, teams, user.id]);

  const leagueItems = useMemo(() => {
    return leagues.map(league => ({
      id: league.id,
      type: 'league',
      league,
    }));
  }, [leagues]);

  const items = isLeagueMode ? leagueItems : clubItems;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    if (isLeagueMode) {
      return items.filter(({ league }) => (
        league.name?.toLowerCase().includes(query) ||
        league.shortName?.toLowerCase().includes(query) ||
        league.country?.toLowerCase().includes(query) ||
        league.regionState?.toLowerCase().includes(query) ||
        league.season?.toLowerCase().includes(query)
      ));
    }

    return items.filter(({ team, club }) => {
      const league = leagueMap[team.leagueId];

      return (
        team.name?.toLowerCase().includes(query) ||
        team.shortName?.toLowerCase().includes(query) ||
        team.city?.toLowerCase().includes(query) ||
        league?.name?.toLowerCase().includes(query) ||
        league?.shortName?.toLowerCase().includes(query) ||
        club?.name?.toLowerCase().includes(query) ||
        club?.city?.toLowerCase().includes(query)
      );
    });
  }, [isLeagueMode, items, leagueMap, search]);

  const selectedAssignedUserId = selectedItem
    ? isLeagueMode
      ? selectedItem.league.assignedUserId || selectedItem.league.managedByUserId
      : selectedItem.team.assignedUserId || selectedItem.team.managedByUserId
    : null;

  const isAlreadyAssigned =
    !!selectedAssignedUserId &&
    selectedAssignedUserId !== user.id;

  const hasExistingConnection = isLeagueMode
    ? !!user?.linkedLeagueId
    : !!user?.connectedTeamId;

  const modalTitle = isLeagueMode
    ? 'Liga mit Nutzer verbinden'
    : 'Verein mit Nutzer verbinden';

  const modalSubtitle = isLeagueMode
    ? hasExistingConnection
      ? 'Liga wechseln oder neu setzen'
      : 'Wähle eine Liga für diesen Nutzer'
    : hasExistingConnection
    ? 'Verein wechseln oder neu setzen'
    : 'Wähle einen Verein für diesen Nutzer';

  const searchPlaceholder = isLeagueMode
    ? 'Liga, Region oder Land suchen...'
    : 'Verein, Stadt oder Liga suchen...';

  const emptyText = isLeagueMode
    ? search
      ? 'Keine Ligen gefunden'
      : 'Keine Ligen vorhanden'
    : search
    ? 'Keine Vereine gefunden'
    : 'Keine Vereine vorhanden';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;

      if (isLeagueMode) {
        const league = selectedItem.league;
        const oldLeagueId = user.linkedLeagueId;

        if (oldLeagueId && oldLeagueId !== league.id) {
          await base44.entities.League.update(oldLeagueId, {
            assignedUserId: null,
            managedByUserId: null,
          });
        }

        if (user.connectedTeamId) {
          await base44.entities.Team.update(user.connectedTeamId, {
            assignedUserId: null,
            managedByUserId: null,
            isClaimed: false,
          });
        }

        if (user.connectedClubId || user.linkedClubId) {
          const oldClubId = user.connectedClubId || user.linkedClubId;

          if (oldClubId && oldClubId !== user.connectedTeamId) {
            await base44.entities.Club.update(oldClubId, {
              assignedUserId: null,
              managedByUserId: null,
            });
          }
        }

        await base44.entities.AppUser.update(user.id, {
          roleSlug: 'league',
          role: 'Liga',
          verified: true,
          linkedLeagueId: league.id,
          connectedTeamId: null,
          connectedClubId: null,
          linkedClubId: null,
        });

        await base44.entities.League.update(league.id, {
          assignedUserId: user.id,
          managedByUserId: user.id,
        });

        return;
      }

      const { team, club } = selectedItem;
      const oldTeamId = user.connectedTeamId;
      const oldClubId = user.connectedClubId || user.linkedClubId;
      const oldLeagueId = user.linkedLeagueId;

      if (oldTeamId && oldTeamId !== team.id) {
        await base44.entities.Team.update(oldTeamId, {
          assignedUserId: null,
          managedByUserId: null,
          isClaimed: false,
        });
      }

      if (oldClubId && oldClubId !== (club?.id || null) && oldClubId !== team.id) {
        await base44.entities.Club.update(oldClubId, {
          assignedUserId: null,
          managedByUserId: null,
        });
      }

      if (oldLeagueId) {
        await base44.entities.League.update(oldLeagueId, {
          assignedUserId: null,
          managedByUserId: null,
        });
      }

      await base44.entities.AppUser.update(user.id, {
        roleSlug: 'club',
        role: 'Verein',
        verified: true,
        connectedTeamId: team.id,
        connectedClubId: club?.id || null,
        linkedClubId: club?.id || null,
        linkedLeagueId: null,
      });

      await base44.entities.Team.update(team.id, {
        assignedUserId: user.id,
        managedByUserId: user.id,
        isClaimed: true,
      });

      if (club) {
        await base44.entities.Club.update(club.id, {
          assignedUserId: user.id,
          managedByUserId: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success(isLeagueMode ? 'Liga wurde gespeichert.' : 'Verein wurde gespeichert.');
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      onSuccess?.();
      onClose?.();
    },
    onError: error => {
      toast.error(error.message || 'Fehler beim Speichern.');
    },
  });

  if (!open) return null;

  const HeaderIcon = isLeagueMode ? Landmark : Building2;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border/50 flex flex-col"
        style={{ height: 'min(90vh, 720px)', overflow: 'hidden' }}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isLeagueMode
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
            >
              <HeaderIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold truncate">{modalTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-b border-border/30 bg-secondary/20">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">
                  {user.displayName || user.username}
                </span>

                {user.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                @{user.username}
              </p>

              <Badge className="text-[10px] px-1.5 py-0 mt-1 bg-secondary text-secondary-foreground">
                {user.roleSlug || 'fan'}
              </Badge>
            </div>

            {hasExistingConnection && (
              <Badge className="text-[10px] px-2 bg-primary/10 text-primary border border-primary/30 flex-shrink-0">
                Verbunden
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-4 py-3 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="pl-9 h-9 bg-secondary/40 border-border/50 text-sm"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {emptyText}
            </div>
          )}

          {filtered.map(item => {
            if (isLeagueMode) {
              const league = item.league;
              const assignedUserId = league.assignedUserId || league.managedByUserId;
              const assignedUser = assignedUserId ? userMap[assignedUserId] : null;
              const isSelected = selectedItem?.league?.id === league.id;
              const isOtherUser = !!assignedUserId && assignedUserId !== user.id;
              const isCurrentUser = user.linkedLeagueId === league.id;
              const logo = getLogoUrl(league.logo);

              return (
                <button
                  key={league.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40'
                      : isOtherUser
                      ? 'bg-amber-500/5 border-amber-500/20 opacity-70'
                      : isCurrentUser
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-secondary/20 border-border/30 hover:bg-secondary/40 hover:border-border/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {logo ? (
                      <img
                        src={logo}
                        alt={league.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">
                        {league.name}
                      </span>

                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}

                      {isCurrentUser && !isSelected && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">
                          Aktuell
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {league.shortName && (
                        <span className="text-[10px] text-primary/70">
                          {league.shortName}
                        </span>
                      )}

                      {league.country && (
                        <span className="text-[10px] text-muted-foreground">
                          · {league.country}
                        </span>
                      )}

                      {league.regionState && (
                        <span className="text-[10px] text-muted-foreground">
                          · {league.regionState}
                        </span>
                      )}
                    </div>

                    {isOtherUser && assignedUser && (
                      <p className="text-[10px] text-amber-400 mt-0.5 truncate">
                        Verbunden mit: @{assignedUser.username}
                      </p>
                    )}
                  </div>
                </button>
              );
            }

            const { team, club } = item;
            const league = leagueMap[team.leagueId];
            const assignedUserId = team.assignedUserId || team.managedByUserId;
            const assignedUser = assignedUserId ? userMap[assignedUserId] : null;
            const isSelected = selectedItem?.team?.id === team.id;
            const isOtherUser = !!assignedUserId && assignedUserId !== user.id;
            const isCurrentUser = user.connectedTeamId === team.id;
            const logo = getLogoUrl(team.logo || club?.logo);

            return (
              <button
                key={team.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-primary/10 border-primary/40'
                    : isOtherUser
                    ? 'bg-amber-500/5 border-amber-500/20 opacity-70'
                    : isCurrentUser
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-secondary/20 border-border/30 hover:bg-secondary/40 hover:border-border/60'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {logo ? (
                    <img
                      src={logo}
                      alt={team.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">
                      {team.name}
                    </span>

                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}

                    {isCurrentUser && !isSelected && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary">
                        Aktuell
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {team.shortName && (
                      <span className="text-[10px] text-primary/70">
                        {team.shortName}
                      </span>
                    )}

                    {league && (
                      <span className="text-[10px] text-muted-foreground">
                        · {league.shortName || league.name}
                      </span>
                    )}

                    {team.city && (
                      <span className="text-[10px] text-muted-foreground">
                        · {team.city}
                      </span>
                    )}
                  </div>

                  {isOtherUser && assignedUser && (
                    <p className="text-[10px] text-amber-400 mt-0.5 truncate">
                      Verbunden mit: @{assignedUser.username}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {selectedItem && (
            <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
              {isAlreadyAssigned && (
                <div className="mx-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    Diese Auswahl ist bereits mit einem anderen Nutzer verbunden.
                  </p>
                </div>
              )}

              <div className="px-0 py-2">
                <p className="text-xs text-muted-foreground mb-2">Ausgewählt:</p>

                <p className="text-sm font-semibold">
                  {isLeagueMode
                    ? selectedItem.league.name
                    : selectedItem.team.name}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm"
                  onClick={onClose}
                >
                  Abbrechen
                </Button>

                <Button
                  className="flex-1 h-10 text-sm"
                  disabled={isAlreadyAssigned || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? 'Wird gespeichert...' : 'Auswahl speichern'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}