import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import UserLink from '@/components/profile/UserLink';
import MentionText from '@/components/mentions/MentionText';
import { Loader2 } from 'lucide-react';
import { useAppUser } from '@/lib/useAppUser';
import useRelativeTime from '@/hooks/useRelativeTime';
import CommentActionsMenu from '@/components/comments/CommentActionsMenu';

// Sub-component so each comment can call useRelativeTime (hooks must be at component top-level)
function CommentRow({ comment, postId, author, appUser }) {
  const timeAgo = useRelativeTime(comment.createdAtUtc || comment.created_date);
  const [currentText, setCurrentText] = React.useState(comment.text);
  const [isEdited, setIsEdited] = React.useState(!!comment.updatedAtUtc);

  // Keep local text in sync if comment data refreshes
  React.useEffect(() => {
    setCurrentText(comment.text);
    setIsEdited(!!comment.updatedAtUtc);
  }, [comment.text, comment.updatedAtUtc]);

  if (comment.isHidden) {
    return (
      <div className="pb-4 border-b border-border/20 last:border-0">
        <p className="text-xs text-muted-foreground italic py-2">Kommentar wurde entfernt.</p>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 pb-4 border-b border-border/20 last:border-0">
      <UserLink
        userId={author?.id}
        username={author?.username}
        avatar={author?.avatar || null}
        verified={author?.verified}
        variant="avatar"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <UserLink
                userId={author?.id}
                username={author?.username}
                avatar={author?.avatar}
                verified={author?.verified}
              />
              {author?.role && author.role !== 'Fan' && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {author.role}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {timeAgo}{isEdited && <span className="ml-1 opacity-60">· bearbeitet</span>}
            </p>
          </div>
          <CommentActionsMenu comment={comment} postId={postId} appUser={appUser} />
        </div>

        <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">
          <MentionText text={currentText} mentions={comment.mentions} />
        </p>
      </div>
    </div>
  );
}

export default function CommentsList({ postId, isOpen, onCountChange }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => base44.entities.Comment.filter({ postId }, '-created_date'),
    enabled: !!postId && isOpen,
  });

  useEffect(() => {
    if (!postId || !isOpen) return;
    const unsubscribe = base44.entities.Comment.subscribe((event) => {
      if (event.data?.postId === postId) refetch();
    });
    return unsubscribe;
  }, [postId, isOpen, refetch]);

  const { data: authors = {} } = useQuery({
    queryKey: ['commentAuthors', comments.map(c => c.authorId)],
    queryFn: async () => {
      const uniqueIds = [...new Set(comments.map(c => c.authorId))];
      const authorsMap = {};
      for (const id of uniqueIds) {
        const users = await base44.entities.AppUser.filter({ id });
        if (users[0]) authorsMap[id] = users[0];
      }
      return authorsMap;
    },
    enabled: comments.length > 0,
  });



  const activeComments = comments.filter(c => !c.isDeleted && !c.isHidden);

  useEffect(() => {
    if (!isLoading) onCountChange?.(activeComments.length);
  }, [activeComments.length, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (activeComments.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm font-medium text-foreground">Noch keine Kommentare</p>
        <p className="text-xs text-muted-foreground mt-1">Starte die Diskussion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeComments.map(comment => (
        <CommentRow
          key={comment.id}
          comment={comment}
          postId={postId}
          author={authors[comment.authorId] || comment._optimisticAuthor}
          appUser={appUser}
        />
      ))}
    </div>
  );
}
