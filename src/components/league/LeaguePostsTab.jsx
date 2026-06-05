import React, { useMemo } from 'react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import PostCard from '@/components/feed/PostCard';
import OfficialCard from '@/components/feed/OfficialCard';
import NewsCard from '@/components/feed/NewsCard';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';

export default function LeaguePostsTab({ league }) {
  const { posts } = useGlobalData();
  const { appUser } = useAppUser();

  const { data: likes = [] } = useQuery({
    queryKey: ['myLikes', appUser?.id],
    queryFn: () => appUser ? base44.entities.Like.filter({ userId: appUser.id }) : [],
    enabled: !!appUser,
  });

  const likedPostIds = new Set(likes.map(l => l.postId));

  const leaguePosts = useMemo(() => {
    return posts
      .filter(p => p.leagueId === league.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [posts, league.id]);

  if (leaguePosts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Noch keine Beiträge.</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {leaguePosts.map(post => {
        if (post.type === 'official') {
          return (
            <OfficialCard
              key={post.id}
              post={post}
              isLiked={likedPostIds.has(post.id)}
            />
          );
        }
        if (post.type === 'news') {
          return (
            <NewsCard
              key={post.id}
              post={post}
              isLiked={likedPostIds.has(post.id)}
            />
          );
        }
        return (
          <PostCard
            key={post.id}
            post={post}
            isLiked={likedPostIds.has(post.id)}
          />
        );
      })}
    </div>
  );
}