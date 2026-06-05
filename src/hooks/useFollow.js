import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';

/**
 * Unified follow hook for users, clubs, and leagues.
 * targetType: "user" | "club" | "league"
 */
export function useFollow({ targetId, targetType, onFollowChange } = {}) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const refreshFollowCaches = () => {
    if (!appUser?.id) return;

    queryClient.invalidateQueries({ queryKey: ['following', appUser.id] });
    queryClient.invalidateQueries({ queryKey: ['followerCount', targetId] });
    queryClient.invalidateQueries({ queryKey: ['followingCount', appUser.id] });

    if (targetType === 'user') {
      queryClient.invalidateQueries({ queryKey: ['notifications', targetId] });
    }
  };

  useEffect(() => {
    if (!appUser || !targetId || !targetType) {
      setIsFollowing(false);
      setFollowId(null);
      setChecked(true);
      return;
    }

    let cancelled = false;

    setChecked(false);

    base44.entities.Follow.filter({
      followerId: appUser.id,
      targetId,
      targetType,
    })
      .then(rows => {
        if (cancelled) return;

        const existing = rows[0];

        setIsFollowing(!!existing);
        setFollowId(existing?.id || null);
      })
      .catch(error => {
        if (cancelled) return;

        console.error('Follow state load error:', error);
        setIsFollowing(false);
        setFollowId(null);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [appUser?.id, targetId, targetType]);

  const toggle = async () => {
    if (!appUser || !targetId || !targetType || loading) return;

    setLoading(true);

    try {
      if (isFollowing && followId) {
        await base44.entities.Follow.delete(followId);

        setIsFollowing(false);
        setFollowId(null);
        refreshFollowCaches();
        onFollowChange?.(false);
        return;
      }

      const existing = await base44.entities.Follow.filter({
        followerId: appUser.id,
        targetId,
        targetType,
      });

      if (existing.length > 0) {
        setIsFollowing(true);
        setFollowId(existing[0].id);
        refreshFollowCaches();
        onFollowChange?.(true);
        return;
      }

      const created = await base44.entities.Follow.create({
        followerId: appUser.id,
        targetId,
        targetType,
        createdAtUtc: new Date().toISOString(),
      });

      setIsFollowing(true);
      setFollowId(created.id);
      refreshFollowCaches();
      onFollowChange?.(true);

      if (targetType === 'user') {
        await base44.entities.Notification.create({
          userId: targetId,
          type: 'follow',
          title: 'Neuer Follower',
          message: `@${appUser.username || appUser.displayName || 'Jemand'} folgt dir jetzt`,
          targetType: 'profile',
          targetId: appUser.id,
          iconType: 'badge',
          isRead: false,
          createdAtUtc: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, loading, checked, toggle };
}