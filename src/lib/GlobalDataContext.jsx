import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const GlobalDataContext = createContext();

const CORE_ENTITY_CONFIG = [
  { key: "leagues", entity: "League" },
  { key: "teams", entity: "Team" },
  { key: "games", entity: "Game" },
  { key: "partners", entity: "Partner" },
  { key: "tournaments", entity: "Tournament" },
  { key: "clubs", entity: "Club" },
  { key: "standingsConfigs", entity: "StandingsConfig" },
  { key: "legalPages", entity: "LegalPage" },
];

const AUTO_LIVE_CHECK_INTERVAL_MS = 60 * 1000;
const AUTO_LIVE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function getGameDate(game) {
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
        Number.isFinite(minute) ? minute : 0,
        0,
        0
      );
    }
  }

  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}

function shouldAutoSwitchToLive(game, now = new Date()) {
  if (!game) return false;

  const status = String(game.status || "scheduled").toLowerCase();

  if (status !== "scheduled") return false;
  if (status === "cancelled" || status === "final" || status === "live") return false;

  const kickoff = getGameDate(game);
  if (!kickoff) return false;

  const diff = now.getTime() - kickoff.getTime();

  return diff >= 0 && diff <= AUTO_LIVE_MAX_AGE_MS;
}

function useRealtimeSubscriptions(queryClient, enabledKeys) {
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    const unsubs = CORE_ENTITY_CONFIG
      .filter(({ key }) => enabledKeys.has(key))
      .map(({ key, entity }) => {
      try {
        const entityApi = base44.entities[entity];
        if (!entityApi?.subscribe) return null;

        const unsub = entityApi.subscribe((event) => {
          queryClient.invalidateQueries({ queryKey: [key] });

          if (event?.id) {
            queryClient.invalidateQueries({ queryKey: [key, event.id] });
          }

          if (entity === "Game") {
            queryClient.invalidateQueries({ queryKey: ["standingsConfigs"] });
          }
        });

        return unsub;
      } catch {
        return null;
      }
    });

    unsubscribeRefs.current = unsubs;

    return () => {
      unsubscribeRefs.current.forEach((unsub) => {
        try {
          unsub?.();
        } catch {
          // noop
        }
      });
    };
  }, [queryClient, enabledKeys]);
}

function useAutomaticGameStatus(games, queryClient) {
  const runningRef = useRef(false);
  const touchedRef = useRef(new Set());

  const runCheck = useCallback(async () => {
    if (runningRef.current) return;
    if (!Array.isArray(games) || games.length === 0) return;

    const now = new Date();
    const candidates = games.filter(game =>
      shouldAutoSwitchToLive(game, now) &&
      !touchedRef.current.has(game.id)
    );

    if (candidates.length === 0) return;

    runningRef.current = true;

    try {
      await Promise.all(
        candidates.map(game => {
          touchedRef.current.add(game.id);

          return base44.entities.Game.update(game.id, {
            status: "live",
            updatedAtUtc: now.toISOString(),
          });
        })
      );

      queryClient.invalidateQueries({ queryKey: ["games"] });
    } catch (error) {
      candidates.forEach(game => touchedRef.current.delete(game.id));
      console.error("AUTO GAME STATUS UPDATE ERROR:", error);
    } finally {
      runningRef.current = false;
    }
  }, [games, queryClient]);

  useEffect(() => {
    runCheck();

    const interval = window.setInterval(runCheck, AUTO_LIVE_CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [runCheck]);
}

function makeListQuery({ key, entity, staleTime, sort, limit, enabled = true }) {
  return {
    queryKey: [key],
    queryFn: () => {
      if (sort && limit) return base44.entities[entity].list(sort, limit);
      if (sort) return base44.entities[entity].list(sort);
      return base44.entities[entity].list();
    },
    staleTime,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    enabled,
  };
}

function startsWithAny(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export const GlobalDataProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const pathname = location.pathname || "/";

  const needsCoreData =
    pathname === "/" ||
    startsWithAny(pathname, [
      "/spiele",
      "/game/",
      "/team/",
      "/club/",
      "/league/",
      "/tabellen",
      "/wettbewerbe",
      "/highlights",
      "/feed",
      "/post/",
      "/data-editor",
      "/admin",
    ]);

  const needsPartnerData = pathname === "/" || pathname.startsWith("/spiele") || pathname.startsWith("/tabellen") || pathname.startsWith("/wettbewerbe");
  const needsTournamentData = pathname === "/" || pathname.startsWith("/wettbewerbe") || pathname.startsWith("/admin/competitions");
  const needsStandingsData = startsWithAny(pathname, ["/tabellen", "/league/", "/club/", "/team/"]);
  const needsClubData = startsWithAny(pathname, ["/club/", "/team/"]);
  const needsLegalData = startsWithAny(pathname, ["/legal", "/impressum", "/datenschutz", "/nutzungsbedingungen", "/community-guidelines", "/admin/legal"]);

  const enabledRealtimeKeys = useMemo(() => {
    const keys = new Set();

    if (needsCoreData) {
      keys.add("leagues");
      keys.add("teams");
      keys.add("games");
    }

    if (needsPartnerData) keys.add("partners");
    if (needsTournamentData) keys.add("tournaments");
    if (needsStandingsData) keys.add("standingsConfigs");
    if (needsClubData) keys.add("clubs");
    if (needsLegalData) keys.add("legalPages");

    return keys;
  }, [
    needsClubData,
    needsCoreData,
    needsLegalData,
    needsPartnerData,
    needsStandingsData,
    needsTournamentData,
  ]);

  useRealtimeSubscriptions(queryClient, enabledRealtimeKeys);

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery(
    makeListQuery({
      key: "leagues",
      entity: "League",
      staleTime: 1000 * 60 * 5,
      sort: "name",
      enabled: needsCoreData,
    })
  );

  const { data: teams = [], isLoading: teamsLoading } = useQuery(
    makeListQuery({
      key: "teams",
      entity: "Team",
      staleTime: 1000 * 60 * 5,
      sort: "name",
      enabled: needsCoreData,
    })
  );

  const { data: games = [], isLoading: gamesLoading } = useQuery(
    makeListQuery({
      key: "games",
      entity: "Game",
      staleTime: 1000 * 30,
      sort: "-date",
      limit: 500,
      enabled: needsCoreData,
    })
  );

  useAutomaticGameStatus(games, queryClient);

  const { data: partners = [], isLoading: partnersLoading } = useQuery(
    makeListQuery({
      key: "partners",
      entity: "Partner",
      staleTime: 1000 * 60 * 15,
      enabled: needsPartnerData,
    })
  );

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery(
    makeListQuery({
      key: "tournaments",
      entity: "Tournament",
      staleTime: 1000 * 60 * 5,
      sort: "-created_date",
      limit: 100,
      enabled: needsTournamentData,
    })
  );

  const { data: clubs = [], isLoading: clubsLoading } = useQuery(
    makeListQuery({
      key: "clubs",
      entity: "Club",
      staleTime: 1000 * 60 * 10,
      sort: "name",
      limit: 500,
      enabled: needsClubData,
    })
  );

  const { data: standingsConfigs = [], isLoading: standingsConfigsLoading } = useQuery(
    makeListQuery({
      key: "standingsConfigs",
      entity: "StandingsConfig",
      staleTime: 1000 * 60 * 5,
      enabled: needsStandingsData,
    })
  );

  const { data: legalPages = [], isLoading: legalPagesLoading } = useQuery(
    makeListQuery({
      key: "legalPages",
      entity: "LegalPage",
      staleTime: 1000 * 60 * 30,
      enabled: needsLegalData,
    })
  );

  const lookupMaps = useMemo(
    () => ({
      leaguesById: new Map(leagues.map((league) => [league.id, league])),
      teamsById: new Map(teams.map((team) => [team.id, team])),
      gamesById: new Map(games.map((game) => [game.id, game])),
      clubsById: new Map(clubs.map((club) => [club.id, club])),
    }),
    [leagues, teams, games, clubs]
  );

  const refetch = useCallback(
    (entityType) => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
    },
    [queryClient]
  );

  const refetchAll = useCallback(() => {
    CORE_ENTITY_CONFIG.forEach(({ key }) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient]);

  const value = {
    leagues,
    teams,
    games,
    partners,
    tournaments,
    clubs,
    legalPages,
    standingsConfigs,

    leaguesLoading,
    teamsLoading,
    gamesLoading,
    partnersLoading,
    tournamentsLoading,
    clubsLoading,
    legalPagesLoading,
    standingsConfigsLoading,

    ...lookupMaps,
    refetch,
    refetchAll,
  };

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);

  if (!context) {
    throw new Error("useGlobalData must be used within GlobalDataProvider");
  }

  return context;
};
