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
  { key: "appUpdates", entity: "AppUpdate" },
];

const LIVE_SCORE_POLL_INTERVAL_MS = 10 * 1000;

function mergeItemIntoList(list, item) {
  if (!item?.id || !Array.isArray(list)) return list;

  let found = false;
  const next = list.map((current) => {
    if (current?.id !== item.id) return current;
    found = true;
    return { ...current, ...item };
  });

  return found ? next : [item, ...next];
}

function removeItemFromList(list, itemId) {
  if (!itemId || !Array.isArray(list)) return list;
  return list.filter((item) => item?.id !== itemId);
}

function updateEntityCache(queryClient, key, event) {
  if (!event?.id) return;

  queryClient.setQueriesData({ queryKey: [key] }, (current) => {
    if (!Array.isArray(current)) return current;
    if (event.type === "DELETE") return removeItemFromList(current, event.id);
    return mergeItemIntoList(current, event.item);
  });

  if (event.type === "DELETE") {
    queryClient.removeQueries({ queryKey: [key, event.id], exact: true });
    return;
  }

  if (event.item) {
    queryClient.setQueryData([key, event.id], (current) => ({
      ...(current && typeof current === "object" ? current : {}),
      ...event.item,
    }));
  }
}

function invalidateAppUpdateDrivenQueries(queryClient) {
  [
    "appUpdates",
    "home-overview-updates",
    "game-highlights",
    "admin-game-highlights",
    "admin-count-highlights",
    "home-game-highlights",
  ].forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key], refetchType: "active" });
  });
}

function invalidateGameDrivenQueries(queryClient, gameId) {
  queryClient.invalidateQueries({ queryKey: ["games"], refetchType: "active" });
  if (gameId) {
    queryClient.invalidateQueries({ queryKey: ["game", gameId], refetchType: "active" });
    queryClient.invalidateQueries({ queryKey: ["games", gameId], refetchType: "active" });
  }
  queryClient.invalidateQueries({ queryKey: ["standingsConfigs"], refetchType: "active" });
  queryClient.invalidateQueries({ queryKey: ["home-overview-games"], refetchType: "active" });
  queryClient.invalidateQueries({ predicate: (query) => {
    const [first] = query.queryKey || [];
    return typeof first === "string" && first.toLowerCase().includes("game");
  }, refetchType: "active" });
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
          updateEntityCache(queryClient, key, event);
          queryClient.invalidateQueries({ queryKey: [key], refetchType: "active" });

          if (event?.id) {
            queryClient.invalidateQueries({ queryKey: [key, event.id], refetchType: "active" });
          }

          if (entity === "Game") {
            invalidateGameDrivenQueries(queryClient, event?.id);
          }

          if (entity === "AppUpdate") {
            invalidateAppUpdateDrivenQueries(queryClient);
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

function useLiveScorePolling(enabled, queryClient) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const interval = window.setInterval(() => {
      invalidateGameDrivenQueries(queryClient);
    }, LIVE_SCORE_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, queryClient]);
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
      "/match-center",
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

  const needsPartnerData = pathname === "/" || startsWithAny(pathname, ["/spiele", "/match-center", "/tabellen", "/wettbewerbe"]);
  const needsTournamentData = pathname === "/" || startsWithAny(pathname, ["/match-center", "/wettbewerbe", "/admin/competitions"]);
  const needsStandingsData = startsWithAny(pathname, ["/match-center", "/tabellen", "/league/", "/club/", "/team/"]);
  const needsClubData = startsWithAny(pathname, ["/club/", "/team/"]);
  const needsLegalData = startsWithAny(pathname, ["/legal", "/impressum", "/datenschutz", "/nutzungsbedingungen", "/community-guidelines", "/admin/legal"]);

  const enabledRealtimeKeys = useMemo(() => {
    const keys = new Set();

    if (needsCoreData) {
      keys.add("leagues");
      keys.add("teams");
      keys.add("games");
      keys.add("appUpdates");
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
  useLiveScorePolling(needsCoreData, queryClient);

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
