import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import useSetHeader from '@/hooks/useSetHeader';
import { useLeagueTheme } from '@/lib/useLeagueTheme';
import ClubHeader from '@/components/club/ClubHeader';
import ClubPostsTab from '@/components/club/ClubPostsTab';
import ClubGamesTab from '@/components/club/ClubGamesTab';
import ClubRosterTab from '@/components/club/ClubRosterTab';
import ClubCoachesTab from '@/components/club/ClubCoachesTab';
import ClubInfoTab from '@/components/club/ClubInfoTab';
import ClubStandingsTab from '@/components/club/ClubStandingsTab';
import ClubPartnersTab from '@/components/club/ClubPartnersTab';
import { Loader2 } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'posts',    label: 'Beiträge'  },
  { id: 'games',    label: 'Spiele'    },
  { id: 'table',    label: 'Tabelle'   },
  { id: 'roster',   label: 'Kader'     },
  { id: 'coaches',  label: 'Coaches'   },
  { id: 'partners', label: 'Partner'   },
  { id: 'info',     label: 'Info'      },
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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground">Verein nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <ClubHeader club={club} />

      {/* Scrollable tab bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/40 overflow-x-auto hide-scrollbar">
        <div className="flex gap-0 min-w-max px-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={activeTab === tab.id && theme.color ? { borderColor: theme.color, color: theme.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-2">
        {activeTab === 'overview' && <ClubOverviewTab club={club} theme={theme} onTabChange={setActiveTab} />}
        {activeTab === 'posts'    && <ClubPostsTab club={club} />}
        {activeTab === 'games'    && <ClubGamesTab club={club} />}
        {activeTab === 'table'    && <ClubStandingsTab club={club} />}
        {activeTab === 'roster'   && <ClubRosterTab club={club} />}
        {activeTab === 'coaches'  && <ClubCoachesTab club={club} />}
        {activeTab === 'partners' && <ClubPartnersTab club={club} />}
        {activeTab === 'info'     && <ClubInfoTab club={club} />}
      </div>
    </div>
  );
}

// ── Overview tab (quick summary) ──────────────────────────────────────────────
function ClubOverviewTab({ club, theme, onTabChange }) {
  const { leagues, leaguesById, teams, games, standingsConfigs } = useGlobalData();
  const league = leaguesById?.get(club.leagueId);
  const recentGames = useMemo(() =>
    games
      .filter(g => (g.homeTeamId === club.id || g.awayTeamId === club.id) && g.status === 'final')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3),
    [games, club.id]
  );

  return (
    <div className="px-3 py-4 space-y-4">
      {/* Description */}
      {club.description && (
        <div className="rounded-2xl bg-card border border-border/50 p-4">
          <p className="text-sm text-foreground/80 leading-relaxed">{club.description}</p>
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        {club.city && (
          <div className="rounded-xl bg-card border border-border/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Stadt</p>
            <p className="text-xs font-bold truncate">{club.city}</p>
          </div>
        )}
        {club.stadium && (
          <div className="rounded-xl bg-card border border-border/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Stadion</p>
            <p className="text-xs font-bold truncate">{club.stadium}</p>
          </div>
        )}
        {club.founded && (
          <div className="rounded-xl bg-card border border-border/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Gegründet</p>
            <p className="text-xs font-bold">{club.founded}</p>
          </div>
        )}
      </div>

      {/* League info */}
      {league && (
        <div className="rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3">
          {league.logo && (
            <img src={league.logo} alt={league.name} className="w-8 h-8 object-contain flex-shrink-0" onError={e=>e.target.style.display='none'} />
          )}
          <div>
            <p className="text-[10px] text-muted-foreground">Liga</p>
            <p className="text-xs font-bold">{league.name}</p>
          </div>
        </div>
      )}

      {/* Recent games preview */}
      {recentGames.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Letzte Spiele</p>
            <button onClick={() => onTabChange('games')} className="text-[10px] text-primary hover:underline">Alle →</button>
          </div>
          <div className="space-y-2">
            {recentGames.map(g => <MiniGameRow key={g.id} game={g} clubId={club.id} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniGameRow({ game, clubId }) {
  const { teamsById } = useGlobalData();
  const isHome = game.homeTeamId === clubId;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
  const opponent = teamsById[opponentId];
  const myScore = isHome ? (game.scoreHome ?? 0) : (game.scoreAway ?? 0);
  const oppScore = isHome ? (game.scoreAway ?? 0) : (game.scoreHome ?? 0);
  const won = myScore > oppScore;
  const lost = myScore < oppScore;

  return (
    <div className="flex items-center justify-between rounded-xl bg-card border border-border/50 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${won ? 'bg-green-500/20 text-green-400' : lost ? 'bg-red-500/20 text-red-400' : 'bg-secondary text-muted-foreground'}`}>
          {won ? 'W' : lost ? 'L' : 'T'}
        </span>
        <span className="text-xs font-semibold truncate">{opponent?.shortName || opponent?.name || '???'}</span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">{isHome ? 'H' : 'A'}</span>
      </div>
      <span className="text-xs font-bold tabular-nums">{myScore} – {oppScore}</span>
    </div>
  );
}