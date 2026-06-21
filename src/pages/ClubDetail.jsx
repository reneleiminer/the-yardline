import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import useSetHeader from '@/hooks/useSetHeader';
import { useLeagueTheme } from '@/lib/useLeagueTheme';
import { getImageUrl } from '@/lib/imageUtils';
import ClubHeader from '@/components/club/ClubHeader';
import ClubPostsTab from '@/components/club/ClubPostsTab';
import ClubGamesTab from '@/components/club/ClubGamesTab';
import ClubRosterTab from '@/components/club/ClubRosterTab';
import ClubCoachesTab from '@/components/club/ClubCoachesTab';
import ClubInfoTab from '@/components/club/ClubInfoTab';
import ClubStandingsTab from '@/components/club/ClubStandingsTab';
import ClubPartnersTab from '@/components/club/ClubPartnersTab';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Info,
  Loader2,
  MapPin,
  Newspaper,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Übersicht', icon: Shield },
  { id: 'posts', label: 'Beiträge', icon: Newspaper },
  { id: 'games', label: 'Spiele', icon: CalendarDays },
  { id: 'table', label: 'Tabelle', icon: Trophy },
  { id: 'roster', label: 'Kader', icon: Users },
  { id: 'coaches', label: 'Coaches', icon: ClipboardList },
  { id: 'partners', label: 'Partner', icon: Shield },
  { id: 'info', label: 'Info', icon: Info },
];

export default function ClubDetail() {
  const { clubId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const { clubsById, clubsLoading } = useGlobalData();

  const club = useMemo(() => clubsById?.get(clubId), [clubsById, clubId]);
  const theme = useLeagueTheme(club?.primaryColor);

  useSetHeader(club ? { mode: 'club', club } : { mode: 'back' });

  if (clubsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Verein nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <ClubHeader club={club} />

      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/92 px-3 py-2 backdrop-blur">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition-colors ${
                  active
                    ? 'border-transparent text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'border-border/50 bg-card text-muted-foreground hover:text-foreground'
                }`}
                style={active && theme.color ? { backgroundColor: theme.color } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' && <ClubOverviewTab club={club} theme={theme} onTabChange={setActiveTab} />}
      {activeTab === 'posts' && <ClubPostsTab club={club} />}
      {activeTab === 'games' && <ClubGamesTab club={club} />}
      {activeTab === 'table' && <ClubStandingsTab club={club} />}
      {activeTab === 'roster' && <ClubRosterTab club={club} />}
      {activeTab === 'coaches' && <ClubCoachesTab club={club} />}
      {activeTab === 'partners' && <ClubPartnersTab club={club} />}
      {activeTab === 'info' && <ClubInfoTab club={club} />}
    </div>
  );
}

function ClubOverviewTab({ club, theme, onTabChange }) {
  const navigate = useNavigate();
  const { leaguesById, games, teamsById } = useGlobalData();
  const league = leaguesById?.get(club.leagueId);
  const now = new Date();

  const clubGames = useMemo(() => games
    .filter(game => game.homeTeamId === club.id || game.awayTeamId === club.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date)),
  [games, club.id]);

  const finalGames = clubGames.filter(game => game.status === 'final');
  const upcomingGames = clubGames.filter(game => game.status !== 'final' && new Date(game.date) >= now);
  const recentGames = [...finalGames]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const nextGame = upcomingGames[0] || null;

  const record = finalGames.reduce(
    (acc, game) => {
      const isHome = game.homeTeamId === club.id;
      const myScore = Number(isHome ? game.scoreHome : game.scoreAway);
      const oppScore = Number(isHome ? game.scoreAway : game.scoreHome);

      if (!Number.isFinite(myScore) || !Number.isFinite(oppScore)) return acc;
      if (myScore > oppScore) acc.wins += 1;
      else if (myScore < oppScore) acc.losses += 1;
      else acc.ties += 1;

      return acc;
    },
    { wins: 0, losses: 0, ties: 0 },
  );

  const statCards = [
    { label: 'Bilanz', value: `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ''}` },
    { label: 'Spiele', value: clubGames.length },
    { label: 'Kader', value: club.roster?.length || 0 },
  ];

  return (
    <div className="space-y-4 px-3 py-4 pb-24">
      {club.description && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <p className="line-clamp-5 text-sm leading-relaxed text-foreground/82">
            {club.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {statCards.map(item => (
          <div key={item.label} className="rounded-2xl border border-border/50 bg-card p-3 text-center shadow-sm">
            <p className="text-xl font-black tabular-nums" style={theme.color ? { color: theme.color } : undefined}>
              {item.value}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {league && (
          <button
            type="button"
            onClick={() => navigate(`/league/${league.id}`)}
            className="rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/70 p-2">
                {league.logo ? (
                  <img src={getImageUrl(league.logo)} alt="" className="h-full w-full object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Trophy className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Liga</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-black leading-tight break-words">{league.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        )}

        {(club.city || club.stadium || club.founded || club.foundedYear) && (
          <button
            type="button"
            onClick={() => onTabChange('info')}
            className="rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/70">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verein</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-black leading-tight break-words">
                  {[club.city, club.stadium].filter(Boolean).join(' - ') || 'Details ansehen'}
                </p>
                {(club.foundedYear || club.founded) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gegründet {club.foundedYear || club.founded}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        )}
      </div>

      {nextGame && (
        <div>
          <SectionHeader title="Nächstes Spiel" action="Alle Spiele" onClick={() => onTabChange('games')} />
          <MiniGameRow game={nextGame} clubId={club.id} teamsById={teamsById} onOpen={() => navigate(`/game/${nextGame.id}`)} featured />
        </div>
      )}

      {recentGames.length > 0 && (
        <div>
          <SectionHeader title="Letzte Spiele" action="Alle Spiele" onClick={() => onTabChange('games')} />
          <div className="space-y-2">
            {recentGames.map(game => (
              <MiniGameRow
                key={game.id}
                game={game}
                clubId={club.id}
                teamsById={teamsById}
                onOpen={() => navigate(`/game/${game.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, action, onClick }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{title}</p>
      {action && (
        <button type="button" onClick={onClick} className="flex items-center gap-1 text-[10px] font-black text-primary">
          {action}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function MiniGameRow({ game, clubId, teamsById, onOpen, featured = false }) {
  const isHome = game.homeTeamId === clubId;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
  const opponent = teamsById?.get(opponentId);
  const myScore = isHome ? (game.scoreHome ?? 0) : (game.scoreAway ?? 0);
  const oppScore = isHome ? (game.scoreAway ?? 0) : (game.scoreHome ?? 0);
  const won = myScore > oppScore;
  const lost = myScore < oppScore;
  const dateLabel = game.date
    ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(game.date))
    : 'Ohne Datum';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card px-3 py-3 text-left shadow-sm transition-all hover:border-primary/30 active:scale-[0.99] ${featured ? 'p-4' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/70 p-2">
          {opponent?.logo ? (
            <img src={getImageUrl(opponent.logo)} alt="" className="h-full w-full object-contain" onError={event => { event.currentTarget.style.display = 'none'; }} />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black leading-tight break-words">
            {opponent?.shortName || opponent?.name || 'Gegner offen'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isHome ? 'Heim' : 'Auswärts'} - {dateLabel}
          </p>
        </div>
      </div>

      {game.status === 'final' ? (
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${won ? 'bg-green-500/15 text-green-400' : lost ? 'bg-red-500/15 text-red-400' : 'bg-secondary text-muted-foreground'}`}>
            {won ? 'W' : lost ? 'L' : 'T'}
          </span>
          <span className="text-sm font-black tabular-nums">
            {myScore}:{oppScore}
          </span>
        </div>
      ) : (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}
