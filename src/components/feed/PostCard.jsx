import React, { useState } from 'react';
import { MessageCircle, Bookmark, Share2 } from 'lucide-react';
import PostActionsMenu from '@/components/post/PostActionsMenu';
import { getImageUrl } from '@/lib/imageUtils';
import { base44 } from '@/api/base44Client';
import UserLink from '@/components/profile/UserLink';
import MentionText from '@/components/mentions/MentionText';
import LikeButton from '@/components/interactions/LikeButton';
import PhotoCredit from '@/components/feed/PhotoCredit';
import CommentsSheet from '@/components/comments/CommentsSheet';
import { useAppUser } from '@/lib/useAppUser';
import { usePostAuthors, getPostAuthorData } from '@/hooks/usePostAuthors';
import {
  isAdminBySlug,
  isModeratorBySlug,
  isDataEditorBySlug,
  isAdmin,
  isModerator,
  isDataEditor,
} from '@/lib/roleDefinitions';
import { getPostTimestamp } from '@/lib/timestampUtils';
import useRelativeTime from '@/hooks/useRelativeTime';

function isInternalUser(appUser) {
  if (!appUser) return false;

  const slug = appUser.roleSlug;
  const role = appUser.role;

  if (slug) {
    return (
      isAdminBySlug(slug) ||
      isModeratorBySlug(slug) ||
      isDataEditorBySlug(slug)
    );
  }

  return isAdmin(role) || isModerator(role) || isDataEditor(role);
}

export default function PostCard({ post, isLiked, author }) {
  const { appUser } = useAppUser();
  const userMap = usePostAuthors([post.authorId]);
  const authorData = getPostAuthorData(post.authorId, userMap);
  const internal = isInternalUser(appUser);

  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [deleted, setDeleted] = useState(false);

  const isNews = post.type === 'news';
  const timeAgo = useRelativeTime(getPostTimestamp(post));

  if (deleted || post.isDeleted) return null;

  return (
    <article className="border-b border-border/30 pb-4 mb-4 w-full overflow-x-hidden">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 mb-3 min-w-0">
        <UserLink
          userId={authorData.id}
          username={authorData.username}
          avatar={authorData.avatar}
          verified={authorData.verified}
          variant="avatar"
        />

        <div className="flex-1 min-w-0">
          <UserLink
            userId={authorData.id}
            username={authorData.username}
            avatar={authorData.avatar}
            verified={authorData.verified}
          />

          <span className="text-xs text-muted-foreground">
            {timeAgo}
            {post.updatedAtUtc && (
              <span className="ml-1 opacity-60">
                · bearbeitet
              </span>
            )}
          </span>
        </div>

        {post.category && (
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
            {post.category}
          </span>
        )}

        <PostActionsMenu post={post} onDeleted={() => setDeleted(true)} />
      </div>

      {isNews && post.title && (
        <h3 className="font-bold text-sm sm:text-base px-3 sm:px-4 mb-2 leading-tight break-words">
          {post.title}
        </h3>
      )}

      {post.text && (
        <p className="text-sm text-foreground/90 px-3 sm:px-4 mb-3 whitespace-pre-wrap leading-relaxed break-words">
          <MentionText
            text={isNews ? post.teaser || post.text : post.text}
            mentions={post.mentions}
          />
        </p>
      )}

      {post.images && post.images.length > 0 && (
        <div className="mb-3 flex flex-col">
          {post.images.length === 1 ? (
            <>
              <img
                src={getImageUrl(post.images[0])}
                alt=""
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                className="w-full aspect-[4/3] object-cover bg-secondary/30"
                onError={event => {
                  event.currentTarget.src = getImageUrl();
                }}
              />

              {author && <PhotoCredit author={author} />}
            </>
          ) : (
            <div className="flex gap-0.5 overflow-x-auto hide-scrollbar">
              {post.images.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={getImageUrl(image)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  className="w-64 h-48 object-cover flex-shrink-0 first:ml-4 last:mr-4 bg-secondary/30"
                  onError={event => {
                    event.currentTarget.src = getImageUrl();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 sm:gap-6 px-3 sm:px-4 min-w-0">
        {!internal && (
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.likesCount || 0}
          />
        )}

        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-1.5 group flex-shrink-0"
        >
          <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />

          {commentCount > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {commentCount}
            </span>
          )}
        </button>

        {!internal && (
          <>
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
          </>
        )}
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