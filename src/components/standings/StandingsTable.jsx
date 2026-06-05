import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const ZONE_STYLES = {
  playoffs: {
    bar: 'bg-green-500',
    bg: 'bg-green-500/5',
    label: 'text-green-400',
    dot: 'bg-green-500',
  },
  playdowns: {
    bar: 'bg-yellow-500',
    bg: 'bg-yellow-500/5',
    label: 'text-yellow-400',
    dot: 'bg-yellow-500',
  },
  abstieg: {
    bar: 'bg-red-500',
    bg: 'bg-red-500/5',
    label: 'text-red-400',
    dot: 'bg-red-500',
  },
};

function getZoneForRank(rank, zones = []) {
  return zones.find(zone => {
    const fromRank = Number(zone.fromRank || 0);
    const toRank = Number(zone.toRank || fromRank);

    return rank >= fromRank && rank <= toRank;
  }) || null;
}

function TeamLogo({ logo, name, withdrawn = false }) {
  const [errored, setErrored] = useState(false);

  if (logo && !errored) {
    return (
      <div
        className={`w-8 h-8 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center flex-shrink-0 p-1 ${
          withdrawn ? 'opacity-50 grayscale' : ''
        }`}
      >
        <img
          src={getImageUrl(logo)}
          alt={name || ''}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
          onError={() => setErrored(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 border border-border/30 ${
        withdrawn ? 'opacity-50' : ''
      }`}
    >
      <Shield className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function getClubId(team, clubsById) {
  if (!team || !clubsById) return null;

  if (clubsById.get?.(team.id)) return team.id;

  for (const [id, club] of clubsById.entries()) {
    if (club.name === team.name || club.shortName === team.shortName) {
      return id;
    }
  }

  return null;
}

function getPercentage(wins, losses, ties) {
  const played = wins + losses + ties;
  if (played === 0) return '.000';

  return ((wins + ties * 0.5) / played).toFixed(3).replace(/^0/, '');
}

function getDisplayRank(rows, currentIndex) {
  const activeBeforeCurrent = rows
    .slice(0, currentIndex + 1)
    .filter(row => row.withdrawn !== true);

  return activeBeforeCurrent.length;
}

export default function StandingsTable({
  rows,
  teamsById,
  zones = [],
  highlightTeamId,
  clubsById,
}) {
  const navigate = useNavigate();

  const hasWithdrawnTeam = Array.isArray(rows)
    ? rows.some(row => row.withdrawn === true || teamsById?.[row.teamId]?.withdrawn === true)
    : false;

  const hasLegend = zones.length > 0 || hasWithdrawnTeam;

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Keine Daten vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
      <div className="grid grid-cols-[24px_36px_minmax(120px,1fr)_54px_54px] sm:grid-cols-[24px_36px_minmax(96px,1fr)_30px_30px_30px_42px_42px_44px] gap-x-1.5 px-3 py-2 bg-secondary/60 text-[9px] font-black text-muted-foreground uppercase tracking-wider">
        <span className="text-center">#</span>
        <span />
        <span>Team</span>
        <span className="text-center sm:hidden">Bilanz</span>
        <span className="text-center sm:hidden">PF:PA</span>

        <span className="hidden sm:block text-center">S</span>
        <span className="hidden sm:block text-center">N</span>
        <span className="hidden sm:block text-center">U</span>
        <span className="hidden sm:block text-center">PF</span>
        <span className="hidden sm:block text-center">PA</span>
        <span className="hidden sm:block text-center">%</span>
      </div>

      {rows.map((row, index) => {
        const team = teamsById[row.teamId];
        const rank = index + 1;
        const displayRank = row.withdrawn ? '–' : getDisplayRank(rows, index);
        const wins = Number(row.w ?? row.won ?? 0);
        const losses = Number(row.l ?? row.lost ?? 0);
        const ties = Number(row.t ?? row.tied ?? 0);
        const pointsFor = Number(row.pf ?? row.pointsFor ?? 0);
        const pointsAgainst = Number(row.pa ?? row.pointsAgainst ?? 0);
        const percentage = getPercentage(wins, losses, ties);

        const zone = row.withdrawn ? null : getZoneForRank(displayRank || rank, zones);
        const zoneStyle = zone ? ZONE_STYLES[zone.type] : null;
        const isHighlighted = highlightTeamId && row.teamId === highlightTeamId;
        const clubId = getClubId(team, clubsById);
        const isWithdrawn = row.withdrawn === true || team?.withdrawn === true;
        const isWithdrawnBeforeSeason =
          row.withdrawnBeforeSeason === true ||
          (team?.withdrawn === true && team?.withdrawnBeforeSeason === true);

        return (
          <div
            key={row.teamId || index}
            onClick={() => {
              if (clubId) {
                navigate(`/club/${clubId}`);
                return;
              }

              if (row.teamId) navigate(`/team/${row.teamId}`);
            }}
            className={`relative grid grid-cols-[24px_36px_minmax(120px,1fr)_54px_54px] sm:grid-cols-[24px_36px_minmax(96px,1fr)_30px_30px_30px_42px_42px_44px] gap-x-1.5 items-center px-3 py-2.5 border-t border-border/30 transition-colors ${
              zoneStyle?.bg || ''
            } ${
              isHighlighted ? 'bg-secondary/70' : ''
            } ${
              isWithdrawn ? 'bg-orange-500/5 opacity-75' : ''
            } ${
              row.teamId ? 'cursor-pointer hover:bg-secondary/40 active:scale-[0.995]' : ''
            }`}
          >
            {zoneStyle && (
              <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${zoneStyle.bar}`} />
            )}

            {isWithdrawn && (
              <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500" />
            )}

            <span className="text-center text-[10px] font-black text-muted-foreground tabular-nums">
              {displayRank}
            </span>

            <TeamLogo
              logo={team?.logo}
              name={team?.shortName || team?.name}
              withdrawn={isWithdrawn}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <p
                  className={`text-xs font-black leading-tight whitespace-normal break-words sm:truncate ${
                    isWithdrawn ? 'text-muted-foreground line-through decoration-orange-400/50' : ''
                  }`}
                >
                  {team?.shortName || team?.name || 'Team offen'}
                </p>

                {isWithdrawn && (
                  <span className="inline-flex items-center rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-orange-300">
                    Zurückgezogen
                  </span>
                )}
              </div>

              {team?.city && (
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {team.city}
                </p>
              )}

              {isWithdrawnBeforeSeason && (
                <p className="text-[9px] text-orange-300 truncate leading-tight mt-0.5">
                  Vor der Season zurückgezogen · 0-Wertung
                </p>
              )}

              {isWithdrawn && !isWithdrawnBeforeSeason && (
                <p className="text-[9px] text-orange-300 truncate leading-tight mt-0.5">
                  Während der Season zurückgezogen
                </p>
              )}
            </div>

            <span
              className={`sm:hidden text-center text-xs font-black tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : ''
              }`}
            >
              {wins}-{losses}-{ties}
            </span>

            <span
              className={`sm:hidden text-center text-xs font-black tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : ''
              }`}
            >
              {pointsFor}:{pointsAgainst}
            </span>

            <span
              className={`hidden sm:block text-center text-xs font-black tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : 'text-green-400'
              }`}
            >
              {wins}
            </span>

            <span className="hidden sm:block text-center text-xs font-semibold text-muted-foreground tabular-nums">
              {losses}
            </span>

            <span className="hidden sm:block text-center text-xs font-semibold text-muted-foreground tabular-nums">
              {ties}
            </span>

            <span
              className={`hidden sm:block text-center text-xs font-semibold tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : ''
              }`}
            >
              {pointsFor}
            </span>

            <span
              className={`hidden sm:block text-center text-xs font-semibold tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : ''
              }`}
            >
              {pointsAgainst}
            </span>

            <span
              className={`hidden sm:block text-center text-xs font-black tabular-nums ${
                isWithdrawn ? 'text-muted-foreground' : 'text-primary'
              }`}
            >
              {percentage}
            </span>
          </div>
        );
      })}

      {hasLegend && (
        <div className="flex flex-wrap gap-3 px-3 py-2 bg-secondary/30 border-t border-border/30">
          {zones.map((zone, index) => {
            const style = ZONE_STYLES[zone.type] || ZONE_STYLES.playoffs;

            return (
              <div key={`${zone.type}-${zone.fromRank}-${zone.toRank}-${index}`} className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-semibold ${style.label}`}>
                  {zone.label || zone.type} #{zone.fromRank}
                  {Number(zone.toRank) !== Number(zone.fromRank) ? `-${zone.toRank}` : ''}
                </span>
              </div>
            );
          })}

          {hasWithdrawnTeam && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-[10px] font-semibold text-orange-300">
                Zurückgezogen
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}