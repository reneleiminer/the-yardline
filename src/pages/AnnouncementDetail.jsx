import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useSetHeader from "@/hooks/useSetHeader";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Play, PlaySquare, Search } from "lucide-react";
import { getImageUrl } from "@/lib/imageUtils";

const HIGHLIGHT_VERSION = "game_highlight";

function normalizeUrl(value) {
  return String(value || "").trim();
}

function parseHighlightMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {
      description: message,
    };
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getLeagueLabel(highlight, leaguesById = new Map()) {
  const league =
    leaguesById.get(highlight.league_id) ||
    leaguesById.get(highlight.leagueId);

  return (
    highlight.league_name ||
    highlight.leagueName ||
    highlight.league ||
    league?.shortName ||
    league?.name ||
    highlight.source_name ||
    "Highlight"
  );
}

function normalizeHighlight(item) {
  const meta = parseHighlightMessage(item.message);

  return {
    ...item,
    title: item.title || meta.title || "",
    description: meta.description || "",
    thumbnail_url: meta.thumbnail_url || meta.thumbnailUrl || item.imageUrl || "",
    external_video_url:
      meta.external_video_url ||
      meta.externalVideoUrl ||
      meta.videoUrl ||
      meta.url ||
      "",
    source_name: meta.source_name || meta.sourceName || "",
    league_id: meta.league_id || meta.leagueId || "",
    league_name: meta.league_name || meta.leagueName || meta.league || "",
    game_id: meta.game_id || meta.gameId || "",
    team_id: meta.team_id || meta.teamId || "",
    date: meta.date || "",
    active: item.isActive !== false && meta.active !== false,
    preview_video_url: meta.preview_video_url || meta.previewVideoUrl || "",
    duration: meta.duration || meta.video_duration || meta.videoDuration || "",
  };
}

function openExternalUrl(url) {
  const externalUrl = normalizeUrl(url);
  if (!externalUrl) return;

  window.open(externalUrl, "_blank", "noopener,noreferrer");
}

function HighlightCard({ highlight, leaguesById }) {
  const externalUrl = normalizeUrl(highlight.external_video_url);
  const previewVideoUrl = normalizeUrl(highlight.preview_video_url);
  const thumbnailUrl = normalizeUrl(highlight.thumbnail_url);
  const leagueLabel = getLeagueLabel(highlight, leaguesById);
  const clickable = !!externalUrl;

  return (
    <article
      role={clickable ? "button" : "article"}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => openExternalUrl(externalUrl)}
      onKeyDown={(event) => {
        if (!clickable) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openExternalUrl(externalUrl);
        }
      }}
      className={`group relative aspect-video overflow-hidden rounded-[24px] bg-white ${
        clickable ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      {previewVideoUrl ? (
        <video
          src={previewVideoUrl}
          poster={thumbnailUrl || undefined}
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          playsInline
          muted
          loop
          preload="metadata"
        />
      ) : thumbnailUrl ? (
        <img
          src={getImageUrl(thumbnailUrl)}
          alt={highlight.title || ""}
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,91,255,0.35),transparent_35%),linear-gradient(135deg,#000,#07111f)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/12 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/78 to-transparent" />

      <div className="absolute left-3 top-3 right-16 flex items-center gap-2">
        <span className="max-w-full truncate rounded-full bg-red-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          {leagueLabel}
        </span>

        {highlight.source_name && highlight.source_name !== leagueLabel && (
          <span className="hidden sm:inline-flex rounded-full bg-black/55 border border-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur">
            {highlight.source_name}
          </span>
        )}
      </div>

      {clickable && (
        <div className="absolute right-3 top-3 w-11 h-11 rounded-full bg-black/55 border border-white/20 backdrop-blur flex items-center justify-center shadow-[0_0_24px_rgba(0,91,255,0.28)] transition-transform duration-300 group-hover:scale-105">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      )}

      <div className="absolute left-3 right-3 bottom-3">
        <h2 className="text-base font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] line-clamp-2">
          {highlight.title || "Game Highlight"}
        </h2>

        {highlight.description && (
          <p className="mt-1 text-[11px] text-white/70 leading-relaxed line-clamp-1">
            {highlight.description}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Zum Highlight
          </span>

          <div className="flex items-center gap-2">
            {highlight.duration && (
              <span className="rounded-lg bg-black/55 px-2 py-1 text-[10px] font-black text-white/90 backdrop-blur">
                {highlight.duration}
              </span>
            )}

            {externalUrl && (
              <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                <ExternalLink className="w-3.5 h-3.5 text-red-700" />
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
        active
          ? "bg-red-700 text-white"
          : "bg-white border border-black/10 text-black/55 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="w-full min-h-[calc(100dvh-140px)] px-4 py-8 pb-24 flex items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-5">
          <PlaySquare className="w-8 h-8 text-red-700" />
        </div>

          <h1 className="text-2xl font-black leading-tight text-black">
          Noch keine Highlights
        </h1>

        <p className="text-sm text-black/50 mt-2 leading-relaxed">
          Sobald Highlights verfügbar sind, findest du sie hier.
        </p>
      </div>
    </div>
  );
}

export default function Highlights() {
  useSetHeader({
    mode: "back",
    title: "Highlights",
  });

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: leagues = [] } = useQuery({
    queryKey: ["highlight-leagues"],
    queryFn: () => base44.entities.League.list(),
  });

  const leaguesById = useMemo(() => {
    return new Map(leagues.map((league) => [league.id, league]));
  }, [leagues]);

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["game-highlights"],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list("-created_date");

      return all
        .filter(item =>
          item.version === HIGHLIGHT_VERSION &&
          item.isActive !== false
        )
        .map(normalizeHighlight)
        .filter(item => item.active !== false);
    },
  });

  const sortedHighlights = useMemo(() => {
    return [...highlights].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAtUtc || a.created_date || 0).getTime();
      const dateB = new Date(b.date || b.createdAtUtc || b.created_date || 0).getTime();

      return dateB - dateA;
    });
  }, [highlights]);

  const filterOptions = useMemo(() => {
    const labels = sortedHighlights
      .map(highlight => getLeagueLabel(highlight, leaguesById))
      .map(label => normalizeText(label))
      .filter(Boolean);

    return ["all", ...Array.from(new Set(labels))];
  }, [sortedHighlights, leaguesById]);

  const visibleHighlights = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortedHighlights.filter(highlight => {
      const leagueLabel = getLeagueLabel(highlight, leaguesById);
      const matchesFilter =
        activeFilter === "all" ||
        leagueLabel.toLowerCase() === activeFilter.toLowerCase();

      if (!matchesFilter) return false;

      if (!query) return true;

      const haystack = [
        highlight.title,
        highlight.description,
        highlight.source_name,
        leagueLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeFilter, leaguesById, search, sortedHighlights]);

  if (isLoading) {
    return <div className="min-h-[calc(100dvh-140px)] pb-24" />;
  }

  if (sortedHighlights.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5 pb-24">
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Highlights suchen..."
          className="w-full h-12 rounded-2xl bg-white border border-black/10 pl-10 pr-3 text-sm font-semibold text-black placeholder:text-black/35 outline-none focus:border-blue-600"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-2">
        {filterOptions.map(option => (
          <FilterPill
            key={option}
            active={activeFilter === option}
            onClick={() => setActiveFilter(option)}
          >
            {option === "all" ? "Alle" : option}
          </FilterPill>
        ))}
      </div>

      {visibleHighlights.length === 0 ? (
        <div className="rounded-[24px] bg-white px-4 py-8 text-center">
          <p className="text-sm font-semibold text-black/45">
            Keine passenden Highlights gefunden.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleHighlights.map(highlight => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              leaguesById={leaguesById}
            />
          ))}
        </div>
      )}
    </div>
  );
}
