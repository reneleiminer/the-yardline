import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addDays, format, isAfter, isBefore, startOfDay, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Radio,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

import useSetHeader from '@/hooks/useSetHeader';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getEffectiveGameStatus, getGameDate, hasPlayableScore } from '@/lib/gameStatusUtils';
import { getImageUrl } from '@/lib/imageUtils';
import ScoreDisplay from '@/components/ui/ScoreDisplay';

function getGameTimeLabel(game) {
  const date = getGameDate(game);

  if (date) return format(date, 'HH:mm', { locale: de });
  if (game.time) return game.time;
  if (game.kickoffTime) return game.kickoffTime;

  return 'Uhrzeit offen';
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || 'Offen';
}

function getTeamColor(team, fallback = '#2563eb') {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function hasStream(game) {
  const status = getEffectiveGameStatus(game);
  if (status === 'final' || status === 'cancelled') return false;
  if (game.streamEnabled === false) return false;
  if (game.streamUrl) return true;

  return Array.isArray(game.streamLinks)
    ? game.streamLinks.some(link => link?.url && link?.enabled !== false && link?.status !== 'rejected')
    : false;
}

function LogoBox({ logo, name, fallback = 'L', size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-20 h-20 rounded-2xl p-3' : 'w-12 h-12 rounded-xl p-1.5';

  if (logo) {
    return (
      <div className={`${sizeClass} bg-card border border-border/50 flex items-center justify-center flex-shrink-0`}>
        <img
          src={getImageUrl(logo)}
          alt={name || ''}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} bg-secondary border border-border/50 flex items-center justify-center flex-shrink-0`}>
      <span className="text-sm font-black text-muted-foreground">
        {fallback}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, to }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <h2 className="text-sm font-black truncate">{title}</h2>
      </div>

      {to && (
        <Link to={to} className="text-xs text-primary font-bold flex items-center gap-1 flex-shrink-0">
          Alle
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyCard({ label }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card px-4 py-5 text-center">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ game }) {
  const status = getEffectiveGameStatus(game);

  if (status === 'live') {
    return (
      <span className="text-[9px] font-black text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
        LIVE
      </span>
    );
  }

  if (status === 'final') {
    return (
      <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
        FINAL
      </span>
    );
  }

  return null;
}

function LeagueGameCard({ game, teamsById, league }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || '#2563eb');
  const awayColor = getTeamColor(away, '#ef4444');

  const status = getEffectiveGameStatus(game);
  const showScore = (status === 'final' || status === 'live') && hasPlayableScore(game);

  return (
    <Link
      to={`/game/${game.id}`}
      className="relative block rounded-2xl border border-border/50 bg-card overflow-hidden active:scale-[0.99] transition-transform"
      style={{
        boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
      }}
    >
      <div className="px-3 pt-3 pb-3">
        <div className="relative mb-2 min-h-5">
          <p className="text-[10px] font-semibold text-muted-foreground truncate pr-20">
            {getGameTimeLabel(game)}
          </p>

          <div className="absolute right-0 top-0 flex items-center gap-2">
            {hasStream(game) && <Radio className="w-[18px] h-[18px] text-primary" />}
            {(game.isCompetitionGame || game.competitionId || game.tournamentId) && (
              <Trophy className="w-4 h-4 text-yellow-400" />
            )}
            <StatusBadge game={game} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 justify-center">
              <LogoBox logo={home?.logo} name={homeName} fallback={homeName?.[0]} size="sm" />
            </div>

            <div className="flex min-w-[92px] justify-center">
              {showScore ? (
                <ScoreDisplay
                  homeScore={game.scoreHome ?? 0}
                  awayScore={game.scoreAway ?? 0}
                  size="sm"
                />
              ) : (
                <span className="inline-flex rounded-xl bg-secondary/70 border border-border/50 px-4 py-1.5 text-xs font-black">
                  VS
                </span>
              )}
            </div>

            <div className="flex min-w-0 justify-center">
              <LogoBox logo={away?.logo} name={awayName} fallback={awayName?.[0]} size="sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <p className="hyphens-auto whitespace-normal break-words text-center text-[12px] font-black leading-[1.12]">
              {homeName}
            </p>
            <p className="hyphens-auto whitespace-normal break-words text-center text-[12px] font-black leading-[1.12]">
              {awayName}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TeamRow({ team }) {
  return (
    <Link
      to={`/team/${team.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-3 py-3 active:scale-[0.99] transition-transform"
    >
      <LogoBox logo={team.logo} name={team.name} fallback={team.shortName?.[0] || team.name?.[0] || 'T'} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black truncate">{team.name}</p>
        {team.city && (
          <p className="text-[10px] text-muted-foreground truncate">
            {team.city}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const [activeTab, setActiveTab] = useState('spiele');

  const { leagues, teams, games, leaguesLoading } = useGlobalData();
  const league = leagues.find(item => item.id === leagueId);
  const color = league?.primaryColor || '#2563eb';

  useSetHeader({ mode: 'back', title: league?.shortName || league?.name || 'Liga' });

  const leagueTeams = useMemo(() => {
    if (!league) return [];

    return teams
      .filter(team => team.leagueId === league.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  }, [league, teams]);

  const teamsById = useMemo(() => {
    return new Map(teams.map(team => [team.id, team]));
  }, [teams]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const sevenDaysAgo = useMemo(() => subDays(today, 7), [today]);
  const sevenDaysAhead = useMemo(() => addDays(today, 7), [today]);

  const leagueGames = useMemo(() => {
    if (!league) return [];

    return games.filter(game => game.leagueId === league.id);
  }, [games, league]);

  const upcomingGames = useMemo(() => {
    return leagueGames
      .filter(game => {
        const date = getGameDate(game);
        if (game.status === 'final') return false;
        if (!date) return true;
        return isAfter(date, today) && isBefore(date, sevenDaysAhead);
      })
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 7);
  }, [leagueGames, sevenDaysAhead, today]);

  const recentResults = useMemo(() => {
    return leagueGames
      .filter(game => {
        const date = getGameDate(game);
        if (game.status !== 'final') return false;
        if (!date) return true;
        return isAfter(date, sevenDaysAgo) && isBefore(date, today);
      })
      .sort((a, b) => (getGameDate(b)?.getTime() || 0) - (getGameDate(a)?.getTime() || 0))
      .slice(0, 7);
  }, [leagueGames, sevenDaysAgo, today]);

  if (leaguesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="text-center py-12 px-4">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Liga nicht gefunden</p>
      </div>
    );
  }

  const tabs = [
    { id: 'spiele', label: 'Spiele' },
    { id: 'teams', label: 'Teams' },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      <section
        className="px-4 pt-4 pb-5 border-b border-border/30"
        style={{
          background: `linear-gradient(135deg, ${color}33 0%, ${color}10 52%, hsl(var(--background)) 100%)`,
        }}
      >
        <div className="flex items-center gap-4">
          <LogoBox
            logo={league.logo}
            name={league.name}
            fallback={league.shortName?.[0] || league.name?.[0] || 'L'}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-primary font-black uppercase tracking-wider">
              Liga
            </p>

            <h1 className="text-2xl font-black leading-tight truncate">
              {league.name}
            </h1>

            <p className="text-xs text-muted-foreground mt-1 truncate">
              {[league.country, league.regionState, league.season].filter(Boolean).join(' · ') || 'Football Liga'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <Link to={`/tabellen/${league.id}`} className="rounded-2xl bg-card/70 border border-border/50 p-3 active:scale-[0.99] transition-transform">
            <Trophy className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-black">Tabelle</p>
            <p className="text-[10px] text-muted-foreground">Standings</p>
          </Link>

          <div className="rounded-2xl bg-card/70 border border-border/50 p-3">
            <Users className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-black">{leagueTeams.length}</p>
            <p className="text-[10px] text-muted-foreground">Teams</p>
          </div>

          <div className="rounded-2xl bg-card/70 border border-border/50 p-3">
            <CalendarDays className="w-4 h-4 text-primary mb-2" />
            <p className="text-lg font-black">{leagueGames.length}</p>
            <p className="text-[10px] text-muted-foreground">Spiele</p>
          </div>
        </div>
      </section>

      <div className="px-4 mt-4 mb-4">
        <div className="flex gap-0 border-b border-border/40">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative flex-1 text-xs font-semibold pb-2.5 pt-1.5 transition-colors"
                style={
                  isActive
                    ? { color }
                    : { color: 'hsl(var(--muted-foreground))' }
                }
              >
                {tab.label}

                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'spiele' && (
        <div className="px-4 space-y-5">
          <section>
            <SectionTitle icon={CalendarDays} title="Kommende Spiele" to="/match-center" />

            {upcomingGames.length > 0 ? (
              <div className="space-y-2">
                {upcomingGames.map(game => (
                  <LeagueGameCard
                    key={game.id}
                    game={game}
                    teamsById={teamsById}
                    league={league}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard label="Keine kommenden Spiele" />
            )}
          </section>

          <section>
            <SectionTitle icon={Trophy} title="Letzte Ergebnisse" to="/match-center" />

            {recentResults.length > 0 ? (
              <div className="space-y-2">
                {recentResults.map(game => (
                  <LeagueGameCard
                    key={game.id}
                    game={game}
                    teamsById={teamsById}
                    league={league}
                  />
                ))}
              </div>
            ) : (
              <EmptyCard label="Keine Ergebnisse" />
            )}
          </section>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="px-4 space-y-2">
          {leagueTeams.length > 0 ? (
            leagueTeams.map(team => (
              <TeamRow key={team.id} team={team} />
            ))
          ) : (
            <EmptyCard label="Keine Teams vorhanden" />
          )}
        </div>
      )}

      {activeTab === 'info' && (
        <div className="px-4">
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <InfoRow icon={Globe} label="Land" value={league.country} />
            <InfoRow icon={MapPin} label="Region" value={league.regionState || league.stateRegion} />
            <InfoRow icon={CalendarDays} label="Saison" value={league.season} />
            <InfoRow icon={Trophy} label="Level" value={league.tierLabel || league.level} />
          </div>
        </div>
      )}
    </div>
  );
}
