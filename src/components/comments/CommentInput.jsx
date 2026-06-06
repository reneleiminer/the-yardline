import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { isAdminBySlug, isModeratorBySlug, isDataEditorBySlug, isAdmin, isModerator, isDataEditor } from '@/lib/roleDefinitions';
import { parseMentions } from '@/lib/mentionUtils';

function isInternalUser(appUser) {
  if (!appUser) return false;
  const slug = appUser.roleSlug;
  const role = appUser.role;
  if (slug) return isAdminBySlug(slug) || isModeratorBySlug(slug) || isDataEditorBySlug(slug);
  return isAdmin(role) || isModerator(role) || isDataEditor(role);
}
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function CommentInput({ postId, onCommentAdded }) {
  const { appUser } = useAppUser();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState([]);

  const createCommentMutation = useMutation({
    mutationFn: async (commentText) => {
      // Resolve mentions to include userId
      const resolvedMentions = [];
      for (const mention of mentions) {
        const users = await base44.entities.AppUser.filter({ username: mention.username });
        if (users.length > 0) {
          resolvedMentions.push({
            userId: users[0].id,
            username: users[0].username,
            displayName: users[0].displayName
          });
        }
      }
      
      const comment = await base44.entities.Comment.create({
        postId,
        authorId: appUser.id,
        text: commentText,
        mentions: resolvedMentions.length > 0 ? resolvedMentions : null,
        createdAtUtc: new Date().toISOString()
      });

      // Update post commentsCount
      const posts = await base44.entities.Post.filter({ id: postId });
      if (posts[0]) {
        const currentCount = posts[0].commentsCount || 0;
        await base44.entities.Post.update(postId, { commentsCount: currentCount + 1 });
      }

      return comment;
    },
    onMutate: async (commentText) => {
        await queryClient.cancelQueries({ queryKey: ['comments', postId] });
        const previous = queryClient.getQueryData(['comments', postId]);
        const createdAtUtc = new Date().toISOString();
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          postId,
          authorId: appUser.id,
          text: commentText,
          createdAtUtc,
          _optimistic: true,
          _optimisticAuthor: {
            id: appUser.id,
            username: appUser.username,
            displayName: appUser.displayName,
            avatar: appUser.avatar,
            verified: appUser.verified,
            role: appUser.role,
            roleSlug: appUser.roleSlug,
          },
        };
        queryClient.setQueryData(['comments', postId], (old = []) => [optimistic, ...old]);
        setText('');
        return { previous };
      },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['comments', postId], ctx.previous);
      toast.error('Kommentar konnte nicht gespeichert werden');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onCommentAdded?.();
    },
  });

  const handleSubmit = () => {
    if (!text.trim()) return;
    setMentions(parseMentions(text));
    createCommentMutation.mutate(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!appUser || isInternalUser(appUser)) return null;

  return (
    <div className="sticky bottom-0 bg-background border-t border-border/30 p-4">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={appUser.avatar} />
          <AvatarFallback className="bg-secondary text-xs font-semibold">
            {appUser.displayName?.[0] || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Kommentieren als @${appUser.username}`}
            className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm resize-none border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-24"
            rows="1"
          />

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || createCommentMutation.isPending}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
