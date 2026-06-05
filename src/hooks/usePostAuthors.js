import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch and cache user data for post authors
 * Returns a map of userId -> user data
 */
export function usePostAuthors(authorIds = []) {
  const uniqueIds = useMemo(() => [...new Set(authorIds.filter(Boolean))], [authorIds]);

  const { data: users = [] } = useQuery({
    queryKey: ['postAuthors', uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      // Fetch multiple users efficiently
      const userPromises = uniqueIds.map(id =>
        base44.entities.AppUser.filter({ id }).catch(() => null)
      );
      const results = await Promise.all(userPromises);
      return results.filter(Boolean).flat();
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a map for quick lookup
  const userMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user.id] = user;
    });
    return map;
  }, [users]);

  return userMap;
}

/**
 * Get current author data for a post
 */
export function getPostAuthorData(authorId, userMap, defaultAvatar = null) {
  const user = userMap?.[authorId];
  return {
    id: authorId,
    username: user?.username || 'Unknown',
    displayName: user?.displayName || user?.username || 'Unknown User',
    avatar: user?.avatar || defaultAvatar,
    verified: user?.verified || false,
    role: user?.roleSlug || 'fan',
    legacyRole: user?.role,
  };
}