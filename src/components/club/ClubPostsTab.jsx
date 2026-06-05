import React, { useMemo } from 'react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { useAppUser } from '@/lib/useAppUser';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PostCard from '@/components/feed/PostCard';
import OfficialCard from '@/components/feed/OfficialCard';
import TransferCard from '@/components/feed/TransferCard';
import NewsCard from '@/components/feed/NewsCard';

export default function ClubPostsTab({ club }) {
  const { posts, appUsers } = useGlobalData();
  const { appUser } = useAppUser();

  const { data: likes = [] } = useQuery({
    queryKey: ['myLikes', appUser?.id],
    queryFn: () => appUser ? base44.entities.Like.filter({ userId: appUser.id }) : [],
    enabled: !!appUser,
  });

  const likedPostIds = new Set(likes.map(l => l.postId));

  // Verein accounts linked to this club
  const vereinUserIds = useMemo(() =>
  new Set(
    appUsers
      .filter(u =>
        u.linkedClubId === club.id ||
        u.connectedClubId === club.id ||
        u.connectedTeamId === club.id
      )
      .map(u => u.id)
  ),
  [appUsers, club.id]
);

  const clubPosts = useMemo(() => {
    return posts
      .filter(p =>
        p.authorId === club.id ||
        (p.teamIds && p.teamIds.includes(club.id)) ||
        vereinUserIds.has(p.authorId)
      )
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [posts, club.id, vereinUserIds]);

  if (clubPosts.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Noch keine Beiträge.</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {clubPosts.map(post => {
        if (post.type === 'official') return <OfficialCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />;
        if (post.type === 'transfer') return <TransferCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />;
        if (post.type === 'news')     return <NewsCard     key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />;
        return <PostCard key={post.id} post={post} isLiked={likedPostIds.has(post.id)} />;
      })}
    </div>
  );
}