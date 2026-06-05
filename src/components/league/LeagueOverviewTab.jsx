import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { useAppUser } from '@/lib/useAppUser';
import { getRoleSlug } from '@/lib/roleDefinitions';
import { getImageUrl } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  ChevronRight,
  Globe,
  MapPin,
  Settings,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function formatGameDate(date) {
  if (!date) return 'offen';

  const parsed = new Date(date);

  if (!isValid(parsed)) return date;

  return format(parsed, 'd. MMM', { locale: de });
}

function formatRelativeDate(date) {
  if (!date) return '';

  const parsed = new Date(date);

  if (!isValid(parsed)) return '';

  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale: de,
  });
}

export default function LeagueOverviewTab({ league, onTabChange }) {
  const { games, teamsById, posts } = useGlobalData();
  const { appUser } = useAppUser();

  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 300000,
  });

  const leagueTeams = useMemo(() => {
    return allTeams
      .filter(team => team.leagueId === league.id)
      .slice(0, 6);
  }, [allTeams, league.id]);

  const totalLeagueTeams = useMemo(() => {
    return allTeams.filter(team => team.leagueId === league.id).length;
  }, [allTeams, league.id]);

  const leagueGames = useMemo(() => {
    return games.filter(game => game.leagueId === league.id);
  }, [games, league.id]);

  const upcomingGames = useMemo(() => {
    return leagueGames
      .filter(game => game.status !== 'final')
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .slice(0, 3);
  }, [leagueGames]);

  const pastGames = useMemo(() => {
    return leagueGames
      .filter(game => game.status === 'final')
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 3);
  }, [leagueGames]);

  const leaguePosts = useMemo(() => {
    return posts
      .filter(post => post.leagueId === league.id && !post.isHidden && !post.isDeleted)
      .sort((a, b) => new Date(b.created_date || b.publishedAtUtc || 0) - new Date(a.created_date || a.publishedAtUtc || 0))
      .slice(0, 3);
  }, [posts, league.id]);

  const roleSlug = getRoleSlug(appUser?.roleSlug || appUser?.role || 'fan');
  const isAdmin = roleSlug === 'admin';
  const isDataEditor = roleSlug === 'data_editor';
  const isLeagueManager = roleSlug === 'league' && appUser?.linkedLeagueId === league.id;
  const canEditLeague = isAdmin || isDataEditor || isLeagueManager;

  return (
    <div className="px-3 sm:px-4 pb-24 space-y-6">
      <div className="space-y-3">
        <SectionTitle>Liga Info</SectionTitle>

        <div className="bg-card border border-border/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              {league.logo ? (
                <img
                  src={getImageUrl(league.logo)}
                  alt=""
                  className="w-full h-full object-contain p-1"
                  onError={event => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Zap className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">
                {league.name}
              </p>

              {league.shortName && league.shortName !== league.name && (
                <p className="text-xs text-muted-foreground">
                  {league.shortName}
                </p>
              )}

              {league.tierLabel && (
                <p className="text-xs text-primary font-semibold mt-1">
                  {league.tierLabel}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
            {league.country && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {league.country}
                </span>
              </div>
            )}

            {league.regionState && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {league.regionState}
                </span>
              </div>
            )}

            {league.season && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {league.season}
                </span>
              </div>
            )}
          </div>

          {league.groupsEnabled && Array.isArray(league.groups) && league.groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
              {league.groups.map((group, index) => (
                <span
                  key={group.id || group.name || index}
                  className="px-2 py-1 text-[10px] font-semibold rounded-full bg-primary/10 text-primary"
                >
                  {group.name || group.shortName || group.id || group}
                </span>
              ))}
            </div>
          )}

          {canEditLeague && (
            <button
              onClick={() => {
                window.location.href = `/admin/leagues?edit=${league.id}`;
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Liga bearbeiten
            </button>
          )}
        </div>
      </div>

      {upcomingGames.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Nächste Spiele</SectionTitle>

          <div className="space-y-2">
            {upcomingGames.map(game => {
              const home = teamsById.get(game.homeTeamId);
              const away = teamsById.get(game.awayTeamId);

              return (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <div className="bg-card border border-border/40 rounded-xl px-3 py-2 hover:border-primary/30 transition-all active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {home?.logo && (
                          <img
                            src={getImageUrl(home.logo)}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}

                        <span className="text-[10px] font-semibold truncate">
                          {home?.shortName || home?.name || game.homeTeamPlaceholder || 'Heim'}
                        </span>
                      </div>

                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        vs
                      </span>

                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-[10px] font-semibold truncate">
                          {away?.shortName || away?.name || game.awayTeamPlaceholder || 'Gast'}
                        </span>

                        {away?.logo && (
                          <img
                            src={getImageUrl(away.logo)}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      {formatGameDate(game.date)} {game.time || '-'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onTabChange('games')}
          >
            Alle Spiele
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {upcomingGames.length === 0 && pastGames.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Spiele vorhanden.
        </div>
      )}

      {pastGames.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Letzte Ergebnisse</SectionTitle>

          <div className="space-y-2">
            {pastGames.map(game => {
              const home = teamsById.get(game.homeTeamId);
              const away = teamsById.get(game.awayTeamId);

              return (
                <Link key={game.id} to={`/game/${game.id}`}>
                  <div className="bg-card border border-border/40 rounded-xl px-3 py-2 hover:border-primary/30 transition-all active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {home?.logo && (
                          <img
                            src={getImageUrl(home.logo)}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}

                        <span className="text-[10px] font-semibold truncate">
                          {home?.shortName || home?.name || game.homeTeamPlaceholder || 'Heim'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {game.scoreHome ?? 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground">:</span>
                        <span className="text-xs font-bold text-primary">
                          {game.scoreAway ?? 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-[10px] font-semibold truncate">
                          {away?.shortName || away?.name || game.awayTeamPlaceholder || 'Gast'}
                        </span>

                        {away?.logo && (
                          <img
                            src={getImageUrl(away.logo)}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {game.date && (
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">
                        {formatRelativeDate(game.date)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {leagueTeams.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>Teams</SectionTitle>

          <div className="grid grid-cols-3 gap-2">
            {leagueTeams.map(team => (
              <Link key={team.id} to={`/team/${team.id}`}>
                <div className="bg-card border border-border/40 rounded-xl p-2 hover:border-primary/30 transition-all active:scale-[0.99] flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    {team.logo ? (
                      <img
                        src={getImageUrl(team.logo)}
                        alt=""
                        className="w-full h-full object-contain p-1"
                        onError={event => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {team.name?.[0] || '?'}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-semibold text-center line-clamp-2">
                    {team.shortName || team.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {leagueTeams.length < totalLeagueTeams && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onTabChange('teams')}
            >
              Alle Teams
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}

      {leagueTeams.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Teams hinterlegt.
        </div>
      )}

      {leaguePosts.length > 0 && (
        <div className="space-y-3">
          <SectionTitle>News & Ankündigungen</SectionTitle>

          <div className="space-y-2">
            {leaguePosts.map(post => (
              <Link key={post.id} to={`/post/${post.id}`}>
                <div className="bg-card border border-border/40 rounded-xl px-3 py-2.5 hover:border-primary/30 transition-all active:scale-[0.99]">
                  <p className="text-xs font-semibold line-clamp-2">
                    {post.title || post.text}
                  </p>

                  {(post.created_date || post.publishedAtUtc) && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatRelativeDate(post.created_date || post.publishedAtUtc)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {leaguePosts.length < posts.filter(post => post.leagueId === league.id && !post.isHidden && !post.isDeleted).length && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onTabChange('posts')}
            >
              Alle Beiträge
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}