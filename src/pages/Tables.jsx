import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";
import { Loader2, ChevronDown, ChevronUp, Search, Globe2 } from "lucide-react";
import { useLeagueTheme } from "@/lib/useLeagueTheme";
import { sortLeagues } from "@/lib/leagueSort";

const INTERNATIONAL_GROUP = "Europa / International";

function isInternationalLeague(league) {
  const country = String(league?.country || "").toLowerCase();

  return (
    league?.isEuropeanLeague === true ||
    league?.regionType === "international" ||
    country === "europe" ||
    country === "europa" ||
    country === "international" ||
    country === INTERNATIONAL_GROUP.toLowerCase()
  );
}

function getLeagueCountryGroup(league) {
  if (isInternationalLeague(league)) return INTERNATIONAL_GROUP;
  return league.country || "Unbekannt";
}

function sortCountryGroups(groups) {
  return [...groups].sort((a, b) => {
    if (a.country === INTERNATIONAL_GROUP) return -1;
    if (b.country === INTERNATIONAL_GROUP) return 1;
    return a.country.localeCompare(b.country, "de");
  });
}

function groupLeaguesByCountry(leagues) {
  const map = new Map();

  leagues.forEach((league) => {
    const country = getLeagueCountryGroup(league);

    if (!map.has(country)) {
      map.set(country, {
        country,
        leagues: [],
      });
    }

    map.get(country).leagues.push(league);
  });

  return sortCountryGroups(
    Array.from(map.values()).map((group) => ({
      ...group,
      leagues: sortLeagues(group.leagues),
    }))
  );
}

function LeagueLogo({ league }) {
  if (league.logo) {
    return (
      <img
        src={getImageUrl(league.logo)}
        alt={league.name || ""}
        className="max-w-10 max-h-10 w-auto h-auto object-contain"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <span className="text-base font-black text-muted-foreground">
      {league.name?.[0] || "?"}
    </span>
  );
}

function LeagueRow({ league }) {
  const theme = useLeagueTheme(league.primaryColor);
  const region = league.regionState || league.stateRegion || "";
  const country = getLeagueCountryGroup(league);

  const metaParts = [];
  if (region && country !== INTERNATIONAL_GROUP) metaParts.push(region);
  if (country) metaParts.push(country);
  if (league.season) metaParts.push(league.season);

  return (
    <Link to={`/tabellen/${league.id}`} className="block">
      <div
        className="relative flex items-center gap-3 p-3 bg-card border border-border/50 rounded-2xl hover:border-primary/30 active:scale-[0.99] transition-all overflow-hidden"
        style={{ ...theme.borderLeft, ...theme.glowBg }}
      >
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-secondary/40 border border-white/5 overflow-hidden">
          <LeagueLogo league={league} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">
            {league.name}
          </p>

          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            {league.tierLabel && (
              <span
                className="text-[10px] font-bold mr-1 flex-shrink-0"
                style={theme.accentText}
              >
                {league.tierLabel}
              </span>
            )}

            {metaParts.length > 0 && (
              <span className="text-[10px] text-muted-foreground truncate">
                {metaParts.join(" · ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-primary text-xs font-bold flex-shrink-0">
          Tabelle
          <span>›</span>
        </div>
      </div>
    </Link>
  );
}

function CountrySection({ country, leagues }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full flex items-center justify-between mb-2 group px-1"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe2 className="w-4 h-4 text-primary flex-shrink-0" />

          <h2 className="text-sm font-black group-hover:text-primary transition-colors truncate">
            {country}
          </h2>

          <span className="text-[10px] text-muted-foreground bg-secondary/70 rounded-full px-2 py-0.5">
            {leagues.length}
          </span>
        </div>

        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-2">
          {leagues.map((league) => (
            <LeagueRow key={league.id} league={league} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompactEmptyState() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card px-4 py-5 text-center">
      <p className="text-sm font-semibold">
        Keine Ligen gefunden
      </p>
    </div>
  );
}

export default function Tables() {
  const { leagues, leaguesLoading } = useGlobalData();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return leagues;

    return leagues.filter((league) => {
      const haystack = [
        league.name,
        league.shortName,
        league.country,
        league.regionState,
        league.stateRegion,
        league.season,
        league.tierLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [leagues, search]);

  const grouped = useMemo(() => {
    return groupLeaguesByCountry(filtered);
  }, [filtered]);

  if (leaguesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 py-4 pb-24">
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Liga suchen..."
          className="w-full h-11 rounded-2xl bg-card border border-border/60 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
      </div>

      {grouped.length === 0 ? (
        <CompactEmptyState />
      ) : (
        <div>
          {grouped.map(({ country, leagues: groupLeagues }) => (
            <CountrySection
              key={country}
              country={country}
              leagues={groupLeagues}
            />
          ))}
        </div>
      )}
    </div>
  );
}