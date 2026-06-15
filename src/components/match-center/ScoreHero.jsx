import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "@/lib/imageUtils";

function TeamLogo({ logo, name, className = "h-20 w-20" }) {
  if (logo) {
    return (
      <img
        src={getImageUrl(logo)}
        alt={name || ""}
        className={`${className} object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]`}
        onError={event => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Shield className="h-8 w-8 text-white/56" />
    </div>
  );
}

function getKickoffDate(game) {
  if (game?.date) {
    const rawTime = game.time || game.kickoffTime || "00:00";
    const [year, month, day] = String(game.date).split("-").map(Number);
    const [hour, minute] = String(rawTime).split(":").map(Number);

    if (year && month && day) {
      return new Date(
        year,
        month - 1,
        day,
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0
      );
    }
  }

  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}

function getEffectiveStatus(game, kickoff) {
  const rawStatus = String(game?.status || "scheduled").toLowerCase();

  if (rawStatus === "cancelled") return "cancelled";
  if (rawStatus === "final") return "final";
  if (rawStatus === "live") return "live";

  if (kickoff && kickoff.getTime() <= Date.now()) {
    return "live";
  }

  return "scheduled";
}

function hasPlayableScore(game) {
  return (
    game?.scoreHome !== undefined &&
    game?.scoreAway !== undefined &&
    game?.scoreHome !== null &&
    game?.scoreAway !== null &&
    game?.scoreHome !== "" &&
    game?.scoreAway !== "" &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

export default function ScoreHero({ game, home, away, league }) {
  const [animateWinner, setAnimateWinner] = useState(false);
  const navigate = useNavigate();

  const kickoff = getKickoffDate(game);
  const status = getEffectiveStatus(game, kickoff);
  const isLive = status === "live";
  const isFinal = status === "final" && hasPlayableScore(game);
  const hasScore = (isLive || isFinal) && hasPlayableScore(game);

  const homeColor = home?.primaryColor || home?.colorPrimary || "#013369";
  const awayColor = away?.primaryColor || away?.colorPrimary || "#c20f1a";

  const leagueName = league?.name ? `${league.name}${game.groupId ? ` - ${game.groupId}` : ""}` : "";
  const weekLabel = game.week ? `Spieltag ${game.week}` : "";
  const roundLabel = game.roundName || "";

  const homeName = home?.name || home?.shortName || "Heimteam";
  const awayName = away?.name || away?.shortName || "Gastteam";

  const homeScore = game.scoreHome ?? 0;
  const awayScore = game.scoreAway ?? 0;

  const homeWins = hasScore && Number(homeScore) > Number(awayScore);
  const awayWins = hasScore && Number(awayScore) > Number(homeScore);
  const isDraw = hasScore && Number(homeScore) === Number(awayScore);
  const hasWinner = isFinal && !isDraw && (homeWins || awayWins);

  useEffect(() => {
    if (hasWinner) setAnimateWinner(true);
  }, [hasWinner]);

  const homeDimmed = isFinal && awayWins;
  const awayDimmed = isFinal && homeWins;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black text-white shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0 grid grid-cols-2">
          <div style={{ background: homeColor }} />
          <div style={{ background: awayColor }} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-black/12" />
        <div className="absolute inset-y-6 left-1/2 z-10 w-px -translate-x-1/2 bg-white/18" />

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          {(leagueName || weekLabel || roundLabel) && (
            <div className="mb-5 text-center text-[10px] font-black uppercase tracking-wider text-white/78 whitespace-normal break-words">
              {[leagueName, weekLabel, roundLabel].filter(Boolean).join(" - ")}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
            <button
              type="button"
              className={`min-w-0 flex items-center gap-3 text-left transition-opacity ${homeDimmed ? "opacity-55" : "opacity-100"}`}
              onClick={() => game.homeTeamId && navigate(`/team/${game.homeTeamId}`)}
            >
              <div
                className={`shrink-0 transition-all ${homeWins && animateWinner ? "winner-animation" : ""} ${homeWins && isFinal ? "winner-glow" : ""}`}
                style={homeWins ? { "--winner-color": homeColor } : {}}
              >
                <TeamLogo logo={home?.logo} name={home?.name} className="h-[74px] w-[74px] sm:h-[96px] sm:w-[96px]" />
              </div>

              <span className="w-full max-w-[220px] whitespace-normal break-words text-left text-[24px] font-black italic leading-[0.98] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.42)] sm:max-w-[320px] sm:text-[34px]">
                {homeName}
              </span>
            </button>

            <div className="relative z-20 flex min-w-[132px] flex-shrink-0 flex-col items-center justify-center gap-1.5 px-2 text-center sm:min-w-[184px]">
              {status === "cancelled" ? (
                <>
                  <span className="text-[18px] font-black uppercase tracking-[0.22em] text-orange-200 sm:text-[22px]">VS</span>
                  <span className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-orange-200">ABGESAGT</span>
                </>
              ) : hasScore ? (
                <>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.34)] sm:gap-4">
                    <span className="text-right text-[34px] font-black leading-none tabular-nums sm:text-[52px]">{homeScore}</span>
                    <span className="text-center text-[15px] font-black uppercase tracking-[0.25em] text-white/72 sm:text-[18px]">VS</span>
                    <span className="text-left text-[34px] font-black leading-none tabular-nums sm:text-[52px]">{awayScore}</span>
                  </div>
                  <span className={`mt-2 text-[10px] font-black uppercase tracking-[0.22em] ${isLive ? "text-[#ff2338]" : "text-white/72"}`}>
                    {isLive && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ff2338] align-middle shadow-[0_0_10px_rgba(255,35,56,0.9)]" />}
                    {isLive ? "LIVE" : "FINAL"}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[13px] font-black uppercase tracking-[0.24em] text-white/72">VS</span>
                  <span className="mt-1 text-[36px] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.36)] sm:text-[52px]">
                    {game.time || game.kickoffTime || "--:--"}
                  </span>
                  <span className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/72">
                    {kickoff ? kickoff.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "KICKOFF"}
                  </span>
                  <span className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/56">KICKOFF</span>
                </>
              )}
            </div>

            <button
              type="button"
              className={`min-w-0 flex items-center justify-end gap-3 text-right transition-opacity ${awayDimmed ? "opacity-55" : "opacity-100"}`}
              onClick={() => game.awayTeamId && navigate(`/team/${game.awayTeamId}`)}
            >
              <span className="w-full max-w-[220px] whitespace-normal break-words text-right text-[24px] font-black italic leading-[0.98] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.42)] sm:max-w-[320px] sm:text-[34px]">
                {awayName}
              </span>

              <div
                className={`shrink-0 transition-all ${awayWins && animateWinner ? "winner-animation" : ""} ${awayWins && isFinal ? "winner-glow" : ""}`}
                style={awayWins ? { "--winner-color": awayColor } : {}}
              >
                <TeamLogo logo={away?.logo} name={away?.name} className="h-[74px] w-[74px] sm:h-[96px] sm:w-[96px]" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
