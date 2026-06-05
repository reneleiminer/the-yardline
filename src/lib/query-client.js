import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch when user returns to the tab — catches any missed realtime events
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
      // Short global staleTime — realtime subscriptions handle instant updates,
      // this is just a safety net for poll-based fallback
      staleTime: 15_000,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      // Never flash empty state — keep previous data while new data loads
      placeholderData: (prev) => prev,
    },
  },
});