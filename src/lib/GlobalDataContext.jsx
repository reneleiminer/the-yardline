import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useGameStatusAutoCheck } from "@/hooks/useGameStatusAutoCheck";

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

function useRealtimeSubscriptions(queryClient) {
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    const unsubs = CORE_ENTITY_CONFIG.map(({ key, entity }) => {
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
  }, [queryClient]);
}

function makeListQuery({ key, entity, staleTime, sort, limit }) {
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
  };
}

export const GlobalDataProvider = ({ children }) => {
  const queryClient = useQueryClient();

  useGameStatusAutoCheck();
  useRealtimeSubscriptions(queryClient);

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery(
    makeListQuery({
      key: "leagues",
      entity: "League",
      staleTime: 1000 * 60 * 5,
      sort: "name",
    })
  );

  const { data: teams = [], isLoading: teamsLoading } = useQuery(
    makeListQuery({
      key: "teams",
      entity: "Team",
      staleTime: 1000 * 60 * 5,
      sort: "name",
    })
  );

  const { data: games = [], isLoading: gamesLoading } = useQuery(
    makeListQuery({
      key: "games",
      entity: "Game",
      staleTime: 1000 * 30,
      sort: "-date",
      limit: 500,
    })
  );

  const { data: partners = [], isLoading: partnersLoading } = useQuery(
    makeListQuery({
      key: "partners",
      entity: "Partner",
      staleTime: 1000 * 60 * 15,
    })
  );

  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery(
    makeListQuery({
      key: "tournaments",
      entity: "Tournament",
      staleTime: 1000 * 60 * 5,
      sort: "-created_date",
      limit: 100,
    })
  );

  const { data: clubs = [], isLoading: clubsLoading } = useQuery(
    makeListQuery({
      key: "clubs",
      entity: "Club",
      staleTime: 1000 * 60 * 10,
      sort: "name",
      limit: 500,
    })
  );

  const { data: standingsConfigs = [], isLoading: standingsConfigsLoading } = useQuery(
    makeListQuery({
      key: "standingsConfigs",
      entity: "StandingsConfig",
      staleTime: 1000 * 60 * 5,
    })
  );

  const { data: legalPages = [], isLoading: legalPagesLoading } = useQuery(
    makeListQuery({
      key: "legalPages",
      entity: "LegalPage",
      staleTime: 1000 * 60 * 30,
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