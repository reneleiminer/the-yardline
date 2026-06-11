import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPostTimeLabel, getPostTimestamp } from '@/lib/timestampUtils';
import {
  BadgeCheck,
  Megaphone,
  MessageCircle,
  Share2,
  Bookmark,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getImageUrl } from '@/lib/imageUtils';
import LikeButton from '@/components/interactions/LikeButton';
import CommentsSheet from '@/components/comments/CommentsSheet';
import { usePostAuthors, getPostAuthorData } from '@/hooks/usePostAuthors';
import { getRoleDisplayLabel } from '@/lib/roleDefinitions';

function getOfficialAuthorData(post, userMap) {
  const liveAuthor = post.authorId ? userMap?.[post.authorId] : null;
  const hookAuthor = getPostAuthorData(post.authorId, userMap, post.authorAvatar);

  return {
    ...hookAuthor,
    id: post.authorId || '',
    username:
      liveAuthor?.username ||
      post.authorUsername ||
      post.authorName ||
      'The Yardline',
    displayName:
      liveAuthor?.displayName ||
      liveAuthor?.username ||
      post.authorUsername ||
      post.authorName ||
      'The Yardline',
    avatar:
      liveAuthor?.avatar ||
      post.authorAvatar ||
      '',
    verified:
      liveAuthor?.verified ??
      post.authorVerified ??
      true,
    role:
      liveAuthor?.roleSlug ||
      post.authorRoleSlug ||
      post.authorRole ||
      'official_media',
    legacyRole:
      liveAuthor?.role ||
      post.authorRole ||
      post.authorRoleSlug ||
      'official_media',
  };
}

export default function OfficialCard({ post, isLiked }) {
  const userMap = usePostAuthors([post.authorId]);
  const authorData = getOfficialAuthorData(post, userMap);

  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const timeAgo = getPostTimeLabel(getPostTimestamp(post));
  const image = post.images?.[0];
  const roleLabel = getRoleDisplayLabel(authorData.role || authorData.legacyRole) || 'Offiziell';
  const excerpt = post.teaser || post.text;

  return (
    <article className="mb-4 w-full overflow-x-hidden">
      <Link
        to={`/announcement/${post.id}`}
        className="block rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-black/30 active:scale-[0.99] transition-all duration-200 group"
      >
        {image ? (
          <div className="relative w-full aspect-[16/9] overflow-hidden">
            <img
              src={getImageUrl(image)}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover bg-secondary/30 group-hover:scale-[1.03] transition-transform duration-500"
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

            {authorData.username && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
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

                <span className="text-[11px] font-semibold text-white leading-none truncate max-w-[100px]">
                  {authorData.username}
                </span>

                {authorData.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-10 bg-primary/10 flex items-center px-4 gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/80">
              <Megaphone className="w-2.5 h-2.5 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                {roleLabel}
              </span>
            </div>

            {authorData.username && (
              <div className="ml-auto flex items-center gap-1.5">
                {authorData.avatar && (
                  <img
                    src={getImageUrl(authorData.avatar)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="w-5 h-5 rounded-full object-cover"
                    onError={event => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}

                <span className="text-[11px] font-semibold truncate max-w-[120px]">
                  {authorData.username}
                </span>

                {authorData.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-3.5 pb-3">
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

      <div className="flex items-center gap-4 px-2 pt-2 min-w-0">
        <LikeButton
          postId={post.id}
          initialLiked={isLiked}
          initialCount={post.likesCount || 0}
        />

        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-1.5 group flex-shrink-0"
        >
          <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />

          {commentCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {commentCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={async () => {
            await base44.functions.invoke('createPostShareNotification', {
              postId: post.id,
            });
          }}
          className="group flex-shrink-0"
        >
          <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        <button
          type="button"
          onClick={async () => {
            setSaved(current => !current);
            await base44.functions.invoke('createPostSaveNotification', {
              postId: post.id,
            });
          }}
          className="ml-auto flex-shrink-0 group"
        >
          <Bookmark
            className={`w-5 h-5 transition-all ${
              saved
                ? 'fill-primary text-primary'
                : 'text-muted-foreground group-hover:text-foreground'
            }`}
          />
        </button>
      </div>

      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          isOpen={commentsOpen}
          onOpenChange={setCommentsOpen}
          onCountChange={setCommentCount}
        />
      )}
    </article>
  );
}
