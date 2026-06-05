import React, { useState } from 'react';
import { MessageCircle, Share2, Bookmark, BadgeCheck } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { base44 } from '@/api/base44Client';
import MentionText from '@/components/mentions/MentionText';
import LikeButton from '@/components/interactions/LikeButton';
import PhotoCredit from '@/components/feed/PhotoCredit';
import CommentsSheet from '@/components/comments/CommentsSheet';
import { usePostAuthors, getPostAuthorData } from '@/hooks/usePostAuthors';
import { getPostTimeLabel, getPostTimestamp } from '@/lib/timestampUtils';
import { getRoleDisplayLabel, getRoleSlug } from '@/lib/roleDefinitions';

const PROFESSIONAL_ROLES = new Set([
  'journalist',
  'creator',
  'photographer',
  'official_media',
]);

export default function NewsCard({ post, isLiked, author }) {
  const userMap = usePostAuthors([post.authorId]);
  const authorData = getPostAuthorData(post.authorId, userMap);

  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const timeAgo = getPostTimeLabel(getPostTimestamp(post));
  const image = post.images?.[0];

  const authorRole = authorData.legacyRole || authorData.role || authorData.roleSlug || '';
  const authorRoleSlug = getRoleSlug(authorRole);
  const roleLabel = authorRole ? getRoleDisplayLabel(authorRole) : '';
  const isProfessional = PROFESSIONAL_ROLES.has(authorRoleSlug);

  const rawDesc = post.teaser || post.text || null;
  const description =
    rawDesc && rawDesc.trim() !== (post.title || '').trim()
      ? rawDesc
      : null;

  return (
    <article className="border-b border-border/30 pb-4 mb-4 w-full overflow-x-hidden">
      {image && (
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40 z-10 pointer-events-none" />

          <img
            src={getImageUrl(image)}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="w-full aspect-[16/9] object-cover bg-secondary/30"
            onError={event => {
              event.currentTarget.style.display = 'none';
            }}
          />

          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-2.5">
            {roleLabel ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 border border-primary/50 backdrop-blur-sm">
                <span className="text-[10px] font-semibold text-white leading-none">
                  {roleLabel}
                </span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/10">
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

              <span className="text-[11px] font-semibold text-white leading-none">
                {authorData.username}
              </span>

              {authorData.verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              )}
            </div>
          </div>

          {author && <PhotoCredit author={author} />}
        </div>
      )}

      <div className="px-3 sm:px-4 mb-1.5">
        {post.title && (
          <h3 className="font-bold text-sm sm:text-base leading-tight break-words">
            {post.title}
          </h3>
        )}

        {!post.title && description && (
          <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
            <MentionText text={description} mentions={post.mentions} />
          </p>
        )}

        {post.title && description && (
          <p className="text-xs sm:text-sm text-foreground/70 break-words mt-1">
            <MentionText text={description} mentions={post.mentions} />
          </p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground px-3 sm:px-4 mb-3">
        {timeAgo}
      </p>

      <div className="flex items-center gap-4 sm:gap-6 px-3 sm:px-4 min-w-0">
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
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
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