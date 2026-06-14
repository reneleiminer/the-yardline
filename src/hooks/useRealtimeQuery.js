/**
 * useRealtimeQuery
 *
 * Drop-in replacement for useQuery that:
 * 1. Runs a standard React Query fetch
 * 2. Subscribes to real-time entity changes and invalidates the query
 * 3. Falls back to polling every `pollInterval` ms if subscriptions aren't available
 *
 * Usage:
 *   const { data } = useRealtimeQuery({
 *     queryKey: ['games', leagueId],
 *     queryFn: () => base44.entities.Game.filter({ leagueId }),
 *     entity: 'Game',
 *     pollInterval: 15000, // optional fallback polling in ms
 *   });
 */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function mergeRealtimeEvent(current, event) {
  if (!event?.id) return current;

  if (Array.isArray(current)) {
    if (event.type === 'DELETE') {
      return current.filter(item => item?.id !== event.id);
    }

    let found = false;
    const next = current.map(item => {
      if (item?.id !== event.id) return item;
      found = true;
      return { ...item, ...event.item };
    });

    return found ? next : [event.item, ...next].filter(Boolean);
  }

  if (current && typeof current === 'object' && current.id === event.id) {
    if (event.type === 'DELETE') return null;
    return { ...current, ...event.item };
  }

  return current;
}

export function useRealtimeQuery({ entity, pollInterval = 15_000, ...queryOptions }) {
  const queryClient = useQueryClient();
  const pollingRef = useRef(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!entity || !base44.entities[entity]) return;

    let unsub = null;
    try {
      unsub = base44.entities[entity].subscribe((event) => {
        queryClient.setQueryData(queryOptions.queryKey, current => mergeRealtimeEvent(current, event));
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey, refetchType: 'active' });
      });
      subscribedRef.current = true;
    } catch {
      subscribedRef.current = false;
    }

    // Fallback polling if subscription failed or unavailable
    if (!subscribedRef.current && pollInterval > 0) {
      pollingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
      }, pollInterval);
    }

    return () => {
      try { unsub?.(); } catch {}
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [entity, pollInterval, queryClient, JSON.stringify(queryOptions.queryKey)]);

  return useQuery({
    ...queryOptions,
    // Keep previous data visible while refetching
    placeholderData: (prev) => prev,
  });
}
