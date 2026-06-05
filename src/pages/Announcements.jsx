import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { BadgeCheck, Loader2, Megaphone } from 'lucide-react';

import LeagueFilter from '@/components/home/LeagueFilter';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import useSetHeader from '@/hooks/useSetHeader';

function getRoleLabel(role) {
  const normalized = String(role || '').trim().toLowerCase();

  const labels = {
    fan: 'Fan',
    journalist: 'Journalist',
    photographer: 'Fotograf',
    fotograf: 'Fotograf',
    creator: 'Creator',
    official_media: 'Offizielle Medien',
    officialmedia: 'Offizielle Medien',
    'official media': 'Offizielle Medien',
    'offizielle medien': 'Offizielle Medien',
    media_partner: 'Media',
    media: 'Media',
    club: 'Verein',
    verein: 'Verein',
    league: 'Liga',
    liga: 'Liga',
    moderator: 'Moderator',
    data_editor: 'Data Editor',
    dataeditor: 'Data Editor',
    'data editor': 'Data Editor',
    admin: 'Admin',
  };

  return labels[normalized] || role || 'Offiziell';
}

function getPostImages(post) {
  if (Array.isArray(post?.images)) return post.images.filter(Boolean);
  if (post?.imageUrl) return [post.imageUrl];
  if (post?.image) return [post.image];

  return [];
}

function getPostTeamIds(post) {
  const ids = [];

  if (Array.isArray(post?.teamIds)) ids.push(...post.teamIds);
  if (post?.teamId) ids.push(post.teamId);
  if (post?.clubId) ids.push(post.clubId);
  if (post?.connectedTeamId) ids.push(post.connectedTeamId);

  return Array.from(new Set(ids.filter(Boolean)));
}

function getPostDate(post) {
  return (
    post?.publishedAtUtc ||
    post?.createdAtUtc ||
    post?.created_date ||
    post?.createdAt ||
    ''
  );
}

function isClubNews(post) {
  return post?.sourceType === 'club_news';
}

function isVisibleFeedPost(post) {
  if (!post) return false;
  if (post.isHidden || post.isDeleted) return false;
  if (post.isActive === false) return false;

  return post.type === 'official' || post.type === 'news';
}

export default function Announcements() {
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState(null);
  const { leagues, posts, postsLoading, appUsersById } = useGlobalData();

  useSetHeader({
    mode: 'back',
    title: 'Feed',
    onBack: () => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
    },
  });

  const announcements = useMemo(() => {
    const visibleAnnouncements = posts
      .filter(isVisibleFeedPost)
      .sort((a, b) => {
        const dateA = new Date(getPostDate(a) || 0).getTime();
        const dateB = new Date(getPostDate(b) || 0).getTime();

        return dateB - dateA;
      });

    if (selectedLeague) {
      return visibleAnnouncements.filter(post =>
        post.leagueId === selectedLeague ||
        getPostTeamIds(post).includes(selectedLeague)
      );
    }

    return visibleAnnouncements;
  }, [posts, selectedLeague]);

  if (postsLoading && announcements.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <LeagueFilter leagues={leagues} selected={selectedLeague} onSelect={setSelectedLeague} />

      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">
          Feed
        </h1>

        {announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Keine Beiträge vorhanden.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(post => {
              const author = post.authorId ? appUsersById?.get(post.authorId) : null;

              const roleValue =
                author?.roleSlug ||
                author?.role ||
                post.authorRoleSlug ||
                post.authorRole ||
                '';

              const roleLabel = roleValue ? getRoleLabel(roleValue) : 'Offiziell';

              const authorUsername =
                author?.username ||
                post.authorUsername ||
                post.created_by ||
                'theyardlinemedia';

              const authorAvatar =
                author?.avatar ||
                post.authorAvatar ||
                '';

              const authorVerified =
                author?.verified ??
                post.authorVerified ??
                false;

              const postDate = getPostDate(post);
              const timeAgo = postDate
                ? formatDistanceToNow(new Date(postDate), { addSuffix: true, locale: de })
                : '';

              const image = getPostImages(post)[0];
              const excerpt = post.teaser || post.text;
              const clubNews = isClubNews(post);

              return (
                <Link
                  key={post.id}
                  to={`/post/${post.id}`}
                  className="block rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-black/30 active:scale-[0.99] transition-all duration-200 group"
                >
                  {image ? (
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <img
                        src={getImageUrl(image)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        onError={event => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />

                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm">
                        <Megaphone className="w-2.5 h-2.5 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                          {clubNews ? 'Vereinsnews' : post.category || roleLabel}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5 h-7 px-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                        {authorAvatar ? (
                          <img
                            src={getImageUrl(authorAvatar)}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
                        )}

                        <span className="text-[10px] font-semibold text-white leading-none truncate max-w-[90px]">
                          {authorUsername}
                        </span>

                        {authorVerified && (
                          <BadgeCheck className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-10 bg-primary/10 flex items-center px-4 gap-2">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/80">
                        <Megaphone className="w-2.5 h-2.5 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                          {clubNews ? 'Vereinsnews' : post.category || roleLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="px-4 pt-3.5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      {clubNews && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 rounded-full px-2 py-0.5">
                          Vereinsnews
                        </span>
                      )}

                      {post.category && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          {post.category}
                        </span>
                      )}
                    </div>

                    {post.title && (
                      <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 text-foreground mb-1.5">
                        {post.title}
                      </h3>
                    )}

                    {excerpt && excerpt.trim() !== (post.title || '').trim() && (
                      <p className="text-xs text-foreground/60 line-clamp-2 leading-relaxed mb-2">
                        {excerpt}
                      </p>
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      {timeAgo}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}