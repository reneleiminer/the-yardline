import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchIntervalInBackground: false,
      refetchOnReconnect: true,
      staleTime: 60_000,
      gcTime: 1000 * 60 * 45,
      retry: 1,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 6000),
      placeholderData: previousData => previousData,
    },
    mutations: {
      retry: 0,
    },
  },
});
