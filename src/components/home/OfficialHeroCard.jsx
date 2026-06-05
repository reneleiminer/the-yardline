import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { getPostTimeLabel, getPostTimestamp } from '@/lib/timestampUtils';
import { BadgeCheck, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePostAuthors, getPostAuthorData } from '@/hooks/usePostAuthors';
import { getRoleDisplayLabel } from '@/lib/roleDefinitions';

export default function OfficialHeroCard({ post }) {
  const userMap = usePostAuthors(post ? [post.authorId] : []);
  const authorData = post ? getPostAuthorData(post.authorId, userMap) : null;

  if (!post || !authorData) return null;

  const timeAgo = getPostTimeLabel(getPostTimestamp(post));
  const image = post.images?.[0];
  const roleLabel = getRoleDisplayLabel(authorData.role || authorData.legacyRole) || 'Offiziell';
  const excerpt = post.teaser || post.text;

  return (
    <Link
      to={`/announcement/${post.id}`}
      className="block rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-2xl hover:shadow-black/40 active:scale-[0.99] transition-all duration-200 group"
    >
      <div className="relative w-full overflow-hidden bg-secondary" style={{ aspectRatio: '16/9' }}>
        {image ? (
          <img
            src={getImageUrl(image)}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/35 pointer-events-none" />

        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm shadow-lg">
          <Megaphone className="w-3 h-3 text-white" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wide">
            {roleLabel}
          </span>
        </div>

        {post.authorId && (
          <Link
            to={`/profile/${post.authorId}`}
            onClick={event => event.stopPropagation()}
            className="absolute top-3.5 right-3.5 flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg hover:border-primary/50 transition-colors"
          >
            {authorData.avatar ? (
              <img
                src={getImageUrl(authorData.avatar)}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/20 flex-shrink-0" />
            )}

            <span className="text-[11px] font-semibold text-white leading-none truncate max-w-[110px]">
              {authorData.username}
            </span>

            {authorData.verified && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </Link>
        )}
      </div>

      <div className="px-4 sm:px-5 pt-4 pb-4">
        {post.title && (
          <h2 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-foreground mb-2">
            {post.title}
          </h2>
        )}

        {excerpt && excerpt.trim() !== (post.title || '').trim() && (
          <p className="text-xs sm:text-sm text-foreground/60 line-clamp-2 leading-relaxed mb-2.5">
            {excerpt}
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          {timeAgo}
        </p>
      </div>
    </Link>
  );
}