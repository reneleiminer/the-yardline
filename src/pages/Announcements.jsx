import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import LeagueFilter from '@/components/home/LeagueFilter';
import { Megaphone, BadgeCheck, Loader2 } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
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

export default function Announcements() {
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState(null);
  const { leagues, posts, postsLoading, appUsersById } = useGlobalData();

  useSetHeader({
    mode: 'back',
    title: 'Alle Ankündigungen',
    onBack: () => {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
    }
  });

  const announcements = useMemo(() => {
    const visibleAnnouncements = posts
      .filter(post => {
        const isOfficial = post.type === 'official';
        const isFeaturedAnnouncement = post.featured && (post.type === 'news' || post.type === 'official');
        return (isOfficial || isFeaturedAnnouncement) && !post.isHidden;
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    if (selectedLeague) {
      return visibleAnnouncements.filter(post =>
        post.leagueId === selectedLeague ||
        post.teamIds?.includes(selectedLeague)
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
        <h1 className="text-2xl font-bold mb-6">Ankündigungen</h1>

        {announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Keine Ankündigungen vorhanden.
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

              const timeAgo = post.created_date
                ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: de })
                : '';

              const image = post.images?.[0];
              const excerpt = post.teaser || post.text;

              return (
                <Link
                  key={post.id}
                  to={`/announcement/${post.id}`}
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
                          {roleLabel}
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
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="px-4 pt-3.5 pb-4">
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

                    <p className="text-[11px] text-muted-foreground">{timeAgo}</p>
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