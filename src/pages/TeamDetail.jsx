import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Facebook,
  Globe,
  Info,
  Instagram,
  Landmark,
  Mail,
  MapPin,
  Music2,
  Newspaper,
  PlayCircle,
  Radio,
  Shield,
  Trophy,
  Twitter,
  Youtube,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import ScoreDisplay from '@/components/ui/ScoreDisplay';
import { base44 } from '@/api/base44Client';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import useSetHeader from '@/hooks/useSetHeader';

function getGameDate(game) {
  if (game.kickoffAt) return new Date(game.kickoffAt);
  if (game.date) return parseISO(game.date);
  return null;
}

function getGameTimeLabel(game) {
  const date = getGameDate(game);

  if (date) return format(date, 'HH:mm', { locale: de });
  if (game.time) return game.time;
  if (game.kickoffTime) return game.kickoffTime;

  return 'Uhrzeit offen';
}

function getEffectiveGameStatus(game) {
  if (!game) return 'scheduled';

  const rawStatus = String(game.status || 'scheduled').toLowerCase();

  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'final') return 'final';
  if (rawStatus === 'live') return 'live';

  const kickoff = getGameDate(game);
  if (kickoff && kickoff.getTime() <= Date.now()) {
    return 'live';
  }

  return 'scheduled';
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || 'Offen';
}

function getTeamColor(team, fallback = '#2563eb') {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function hasStream(game) {
  if (game.status === 'final') return false;
  if (game.streamEnabled === false) return false;
  if (game.streamUrl) return true;

  return Array.isArray(game.streamLinks)
    ? game.streamLinks.some(link => link?.url && link?.enabled !== false && link?.status !== 'rejected')
    : false;
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function formatStatus(status) {
  const labels = {
    active: 'Aktiv',
    inactive: 'Inaktiv',
    paused: 'Pausiert',
  };

  return labels[status] || status;
}

function getStadiums(team) {
  if (Array.isArray(team?.stadiums) && team.stadiums.length > 0) {
    return team.stadiums
      .map((stadium, index) => ({
        id: stadium.id || `${stadium.name || 'stadium'}-${index}`,
        name: stadium.name || '',
        address: stadium.address || '',
        city: stadium.city || '',
        notes: stadium.notes || '',
        isDefault: stadium.isDefault === true,
      }))
      .filter(stadium => stadium.name || stadium.address || stadium.city || stadium.notes);
  }

  if (team?.stadium || team?.stadiumAddress) {
    return [
      {
        id: 'main-stadium',
        name: team.stadium || '',
        address: team.stadiumAddress || '',
        city: team.city || '',
        notes: '',
        isDefault: true,
      },
    ];
  }

  return [];
}

function TeamLogo({ logo, name, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'w-24 h-24 rounded-2xl p-3' : 'w-12 h-12 rounded-xl p-1.5';

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
      <Shield className={size === 'lg' ? 'w-10 h-10 text-muted-foreground' : 'w-5 h-5 text-muted-foreground'} />
    </div>
  );
}

function StatusBadge({ game }) {
  if (game.status === 'live') {
    return (
      <span className="text-[9px] font-black text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
        LIVE
      </span>
    );
  }

  if (game.status === 'final') {
    return (
      <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
        FINAL
      </span>
    );
  }

  return null;
}

function FormBadge({ result }) {
  const config = {
    W: { label: 'S', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    L: { label: 'N', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    D: { label: 'U', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  }[result] || { label: 'U', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };

  return (
    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-black ${config.className}`}>
      {config.label}
    </span>
  );
}

function StandingBadge({ standing }) {
  if (!standing) return null;

  const diff = (standing.pf || 0) - (standing.pa || 0);

  return (
    <div className="grid grid-cols-4 gap-2 px-4 mt-4">
      <div className="rounded-2xl bg-card border border-border/50 p-3">
        <p className="text-[10px] text-muted-foreground font-semibold">Platz</p>
        <p className="text-xl font-black text-primary">{standing.rank}</p>
      </div>

      <div className="rounded-2xl bg-card border border-border/50 p-3">
        <p className="text-[10px] text-muted-foreground font-semibold">Siege</p>
        <p className="text-xl font-black text-green-400">{standing.w}</p>
      </div>

      <div className="rounded-2xl bg-card border border-border/50 p-3">
        <p className="text-[10px] text-muted-foreground font-semibold">Niederl.</p>
        <p className="text-xl font-black text-red-400">{standing.l}</p>
      </div>

      <div className="rounded-2xl bg-card border border-border/50 p-3">
        <p className="text-[10px] text-muted-foreground font-semibold">Diff.</p>
        <p className={`text-xl font-black ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
          {diff > 0 ? '+' : ''}{diff}
        </p>
      </div>
    </div>
  );
}

function buildSocialUrl(href, type) {
  const value = String(href || '').trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) return value;

  const clean = value.replace(/^@/, '').replace(/^\/+/, '');

  if (type === 'instagram') return `https://instagram.com/${clean}`;
  if (type === 'facebook') return `https://facebook.com/${clean}`;
  if (type === 'tiktok') return `https://tiktok.com/@${clean}`;
  if (type === 'youtube') return clean.includes('youtube.com') ? `https://${clean}` : `https://youtube.com/${clean}`;
  if (type === 'twitter') return `https://x.com/${clean}`;

  return `https://${clean}`;
}

function SocialLink({ href, icon: Icon, label, type }) {
  if (!href) return null;

  const url = buildSocialUrl(href, type);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:text-primary transition-colors"
    >
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
    </a>
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
        <p className="text-sm font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}

function TextInfoBlock({ icon: Icon, label, children }) {
  if (!children) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {label}
          </p>
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function StadiumInfoCard({ stadium, index }) {
  const title = stadium.name || `Stadion ${index + 1}`;
  const details = [stadium.address, stadium.city].filter(Boolean).join(' · ');

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <Landmark className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {stadium.isDefault ? 'Standard-Stadion' : `Stadion ${index + 1}`}
          </p>

          {stadium.isDefault && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Standard
            </span>
          )}
        </div>

        <p className="text-sm font-semibold break-words mt-0.5">
          {title}
        </p>

        {details && (
          <p className="text-xs text-muted-foreground mt-1 break-words">
            {details}
          </p>
        )}

        {stadium.notes && (
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
            {stadium.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function isPostLinkedToTeam(post, teamId) {
  if (!post || !teamId) return false;

  if (post.teamId === teamId) return true;
  if (post.clubId === teamId) return true;
  if (post.connectedTeamId === teamId) return true;

  if (Array.isArray(post.teamIds)) {
    return post.teamIds.includes(teamId);
  }

  return false;
}

function getPostDate(post) {
  const value =
    post.publishedAtUtc ||
    post.createdAtUtc ||
    post.created_date ||
    post.createdAt ||
    '';

  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return format(date, 'dd.MM.yyyy', { locale: de });
}

function TeamNewsCard({ post }) {
  const image = Array.isArray(post.images) ? post.images[0] : post.imageUrl;

  return (
    <Link
      to={`/post/${post.id}`}
      className="block bg-card border border-border/50 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
    >
      {image && (
        <img
          src={getImageUrl(image)}
          alt={post.title || ''}
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Vereinsnews
          </span>

          {getPostDate(post) && (
            <span className="text-[10px] text-muted-foreground">
              {getPostDate(post)}
            </span>
          )}
        </div>

        <h2 className="text-base font-black leading-tight">
          {post.title}
        </h2>

        {post.teaser && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3">
            {post.teaser}
          </p>
        )}
      </div>
    </Link>
  );
}

function TeamGameCard({ game, home, away, league }) {
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || '#2563eb');
  const awayColor = getTeamColor(away, '#ef4444');

  const showScore = getEffectiveGameStatus(game) === 'final' || getEffectiveGameStatus(game) === 'live';

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
              <TeamLogo logo={home?.logo} name={homeName} />
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
              <TeamLogo logo={away?.logo} name={awayName} />
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

export default function TeamDetail() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('spiele');

  const { teamsById, leaguesById, games } = useGlobalData();

  const { data: teamNews = [] } = useQuery({
    queryKey: ['teamNews', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const posts = await base44.entities.Post.list('-publishedAtUtc');

      return posts
        .filter(post =>
          post.type === 'news' &&
          isPostLinkedToTeam(post, teamId)
        )
        .slice(0, 10);
    },
  });

  const team = teamsById.get(teamId);
  const league = team ? leaguesById.get(team.leagueId) : null;
  const group = league?.groups?.find(item => item.id === team?.groupId);
  const color = team?.primaryColor || league?.primaryColor || '#2563eb';

  useSetHeader({ mode: 'back', title: team?.name || 'Team' });

  const teamGames = useMemo(() => {
    if (!team) return [];

    return games
      .filter(game => game.homeTeamId === team.id || game.awayTeamId === team.id)
      .sort((a, b) => (getGameDate(b)?.getTime() || 0) - (getGameDate(a)?.getTime() || 0));
  }, [games, team]);

  const pastGames = useMemo(() => {
    return teamGames
      .filter(game => game.status === 'final')
      .sort((a, b) => (getGameDate(b)?.getTime() || 0) - (getGameDate(a)?.getTime() || 0));
  }, [teamGames]);

  const upcomingGames = useMemo(() => {
    return teamGames
      .filter(game => game.status !== 'final')
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));
  }, [teamGames]);

  const form = useMemo(() => {
    if (!team) return [];

    return teamGames
      .filter(game => game.status === 'final')
      .slice(0, 5)
      .map(game => {
        const isHome = game.homeTeamId === team.id;
        const myScore = isHome ? game.scoreHome : game.scoreAway;
        const opponentScore = isHome ? game.scoreAway : game.scoreHome;

        if (myScore > opponentScore) return 'W';
        if (myScore < opponentScore) return 'L';
        return 'D';
      });
  }, [teamGames, team]);

  const leagueStanding = useMemo(() => {
    if (!team) return null;

    const leagueGames = games.filter(game =>
      game.leagueId === team.leagueId &&
      game.status === 'final'
    );

    const statsMap = {};

    leagueGames.forEach(game => {
      [game.homeTeamId, game.awayTeamId].forEach(id => {
        if (!id) return;

        if (!statsMap[id]) {
          statsMap[id] = {
            w: 0,
            l: 0,
            t: 0,
            pf: 0,
            pa: 0,
          };
        }
      });

      if (!statsMap[game.homeTeamId] || !statsMap[game.awayTeamId]) return;

      const homeScore = Number(game.scoreHome || 0);
      const awayScore = Number(game.scoreAway || 0);

      statsMap[game.homeTeamId].pf += homeScore;
      statsMap[game.homeTeamId].pa += awayScore;
      statsMap[game.awayTeamId].pf += awayScore;
      statsMap[game.awayTeamId].pa += homeScore;

      if (homeScore > awayScore) {
        statsMap[game.homeTeamId].w += 1;
        statsMap[game.awayTeamId].l += 1;
      } else if (awayScore > homeScore) {
        statsMap[game.awayTeamId].w += 1;
        statsMap[game.homeTeamId].l += 1;
      } else {
        statsMap[game.homeTeamId].t += 1;
        statsMap[game.awayTeamId].t += 1;
      }
    });

    const sorted = Object.entries(statsMap).sort(([, a], [, b]) => {
      const aPlayed = a.w + a.l + a.t;
      const bPlayed = b.w + b.l + b.t;
      const aPct = aPlayed > 0 ? (a.w + a.t * 0.5) / aPlayed : 0;
      const bPct = bPlayed > 0 ? (b.w + b.t * 0.5) / bPlayed : 0;

      if (bPct !== aPct) return bPct - aPct;
      return (b.pf - b.pa) - (a.pf - a.pa);
    });

    const index = sorted.findIndex(([id]) => id === team.id);

    if (index === -1 || !statsMap[team.id]) return null;

    return {
      rank: index + 1,
      ...statsMap[team.id],
    };
  }, [games, team]);

  if (!teamId) return null;

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-4" />

        <p className="text-muted-foreground mb-4">
          Team nicht gefunden
        </p>

        <Button variant="outline" onClick={() => navigate(-1)}>
          Zurück
        </Button>
      </div>
    );
  }

  const stadiums = getStadiums(team);
  const location = [team.city, team.region, team.country].filter(Boolean).join(' · ');
  const foundedYear = team.foundedYear || team.founded;
  const websiteUrl = normalizeUrl(team.website);
  const youtubeUrl = normalizeUrl(team.youtube);
  const streamUrl = normalizeUrl(team.streamUrl);
  const contactHref = team.contactEmail ? `mailto:${team.contactEmail}` : '';

  const hasSocials =
    team.website ||
    team.instagram ||
    team.facebook ||
    team.tiktok ||
    team.youtube ||
    team.twitter ||
    team.streamUrl ||
    team.contactEmail;

  const hasInfo =
    team.description ||
    location ||
    foundedYear ||
    team.status ||
    league?.name ||
    group?.name ||
    stadiums.length > 0 ||
    hasSocials;

  const tabs = [
    { id: 'spiele', label: 'Spiele' },
    ...(teamNews.length > 0 ? [{ id: 'news', label: 'News' }] : []),
    { id: 'info', label: 'Info' },
    ...(team.roster?.length > 0 ? [{ id: 'kader', label: 'Kader' }] : []),
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-28">
      <div className="relative w-full">
        {team.banner ? (
          <img
            src={getImageUrl(team.banner)}
            alt=""
            className="w-full h-40 object-cover"
          />
        ) : (
          <div
            className="w-full h-40"
            style={{
              background: `linear-gradient(135deg, ${color}40 0%, ${color}14 55%, hsl(var(--background)) 100%)`,
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="relative px-4 -mt-12 flex items-end gap-4">
        <TeamLogo logo={team.logo} name={team.name} size="lg" />

        <div className="pb-1 min-w-0">
          <h1 className="text-xl font-black leading-tight truncate">
            {team.name}
          </h1>

          {team.shortName && team.shortName !== team.name && (
            <p className="text-xs text-muted-foreground font-semibold truncate">
              {team.shortName}
            </p>
          )}

          {league && (
            <Link
              to={`/tabellen/${league.id}`}
              className="text-xs text-primary hover:underline mt-0.5 block truncate"
            >
              {league.name}
            </Link>
          )}
        </div>
      </div>

      <StandingBadge standing={leagueStanding} />

      <div className="px-4 mt-4">
        <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
            Form
          </p>

          {form.length > 0 ? (
            <div className="flex items-center gap-2">
              {form.map((result, index) => (
                <FormBadge key={`${result}-${index}`} result={result} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Noch keine Formdaten vorhanden
            </p>
          )}
        </div>
      </div>

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
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <p className="text-sm font-black">Kommende Spiele</p>
              </div>

              <span className="text-[10px] text-muted-foreground font-bold">
                {upcomingGames.length}
              </span>
            </div>

            {upcomingGames.length > 0 ? (
              <div className="space-y-2">
                {upcomingGames.map(game => (
                  <TeamGameCard
                    key={game.id}
                    game={game}
                    home={teamsById.get(game.homeTeamId)}
                    away={teamsById.get(game.awayTeamId)}
                    league={leaguesById.get(game.leagueId)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-card px-4 py-5 text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  Keine kommenden Spiele
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <p className="text-sm font-black">Letzte Ergebnisse</p>
              </div>

              <span className="text-[10px] text-muted-foreground font-bold">
                {pastGames.length}
              </span>
            </div>

            {pastGames.length > 0 ? (
              <div className="space-y-2">
                {pastGames.map(game => (
                  <TeamGameCard
                    key={game.id}
                    game={game}
                    home={teamsById.get(game.homeTeamId)}
                    away={teamsById.get(game.awayTeamId)}
                    league={leaguesById.get(game.leagueId)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-card px-4 py-5 text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  Keine Ergebnisse
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="w-4 h-4 text-primary" />
            <p className="text-sm font-black">Vereinsnews</p>
          </div>

          {teamNews.map(post => (
            <TeamNewsCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {activeTab === 'info' && (
        <div className="px-4 space-y-4">
          {team.description && (
            <TextInfoBlock icon={Info} label="Über das Team">
              {team.description}
            </TextInfoBlock>
          )}

          {(location || foundedYear || team.status || league?.name || group?.name) && (
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <InfoRow icon={MapPin} label="Standort" value={location} />
              <InfoRow icon={CalendarDays} label="Gegründet" value={foundedYear} />
              {team.status && team.status !== 'active' && (
                <InfoRow icon={Building2} label="Status" value={formatStatus(team.status)} />
              )}
              <InfoRow icon={Trophy} label="Liga" value={league?.name} />
              <InfoRow icon={Shield} label="Gruppe / Conference" value={group?.name} />
            </div>
          )}

          {stadiums.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              {stadiums.map((stadium, index) => (
                <StadiumInfoCard
                  key={stadium.id || index}
                  stadium={stadium}
                  index={index}
                />
              ))}
            </div>
          )}

          {hasSocials && (
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <SocialLink href={websiteUrl} icon={Globe} label={team.website} type="website" />
              <SocialLink href={team.instagram} icon={Instagram} label={team.instagram?.startsWith('@') ? team.instagram : `@${team.instagram}`} type="instagram" />
              <SocialLink href={team.facebook} icon={Facebook} label={team.facebook} type="facebook" />
              <SocialLink href={team.tiktok} icon={Music2} label={team.tiktok} type="tiktok" />
              <SocialLink href={youtubeUrl} icon={Youtube} label={team.youtube} type="youtube" />
              <SocialLink href={team.twitter} icon={Twitter} label={team.twitter} type="twitter" />
              <SocialLink href={streamUrl} icon={PlayCircle} label={team.streamUrl} type="website" />
              <SocialLink href={contactHref} icon={Mail} label={team.contactEmail} type="website" />
            </div>
          )}

          {!hasInfo && (
            <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
              <p className="text-sm font-semibold text-muted-foreground">
                Keine Teaminfos vorhanden
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'kader' && team.roster?.length > 0 && (
        <div className="px-4 space-y-2">
          {team.roster.map((player, index) => (
            <div
              key={player.id || index}
              className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {player.image ? (
                <img
                  src={getImageUrl(player.image)}
                  alt={player.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">
                    {player.number ?? '-'}
                  </span>
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{player.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{player.position}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
