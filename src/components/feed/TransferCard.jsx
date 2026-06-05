import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { getPostTimeLabel, getPostTimestamp } from '@/lib/timestampUtils';
import { useGlobalData } from '@/lib/GlobalDataContext';
import UserLink from '@/components/profile/UserLink';
import LikeButton from '@/components/interactions/LikeButton';
import CommentsSheet from '@/components/comments/CommentsSheet';
import { MessageCircle, Share2, Bookmark, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';

function TeamLogo({ team }) {
  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt=""
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="w-8 h-8 rounded object-contain bg-secondary/40 border border-border/40 flex-shrink-0"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded bg-secondary/40 border border-border/40 flex-shrink-0" />
  );
}

export default function TransferCard({ post, isLiked }) {
  const { teams } = useGlobalData();

  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  const teamsMap = useMemo(() => {
    const map = {};

    teams.forEach(team => {
      map[team.id] = team;
    });

    return map;
  }, [teams]);

  const timeAgo = getPostTimeLabel(getPostTimestamp(post));

  const fromTeam = post.teamIds?.[0] ? teamsMap[post.teamIds[0]] : null;
  const toTeam = post.teamIds?.[1] ? teamsMap[post.teamIds[1]] : null;
  const lines = post.text?.split('\n') || [];
  const playerName = lines[0] || 'Transfer';

  const description = lines.length > 2
    ? lines.slice(2).join('\n').trim()
    : '';

  return (
    <article className="border-b border-border/30 pb-4 mb-4">
      <div className="flex items-start gap-3 px-4 mb-3">
        <UserLink
          userId={post.authorId}
          username={post.authorUsername}
          avatar={post.authorAvatar}
          verified={post.authorVerified}
          variant="avatar"
        />

        <div className="flex-1 min-w-0">
          <UserLink
            userId={post.authorId}
            username={post.authorUsername}
            avatar={post.authorAvatar}
            verified={post.authorVerified}
          />

          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>

        <Badge className="bg-primary/20 text-primary border-0">
          Transfer
        </Badge>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-card border border-primary/20 rounded-lg p-4">
          <h3 className="font-bold text-base mb-3">
            {playerName}
          </h3>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <TeamLogo team={fromTeam} />

              <span className="text-xs font-semibold truncate">
                {fromTeam?.shortName || fromTeam?.name || 'TBA'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />

            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              <span className="text-xs font-semibold truncate text-right">
                {toTeam?.shortName || toTeam?.name || 'TBA'}
              </span>

              <TeamLogo team={toTeam} />
            </div>
          </div>
        </div>
      </div>

      {description && (
        <p className="text-sm text-foreground/90 px-4 mb-3 whitespace-pre-wrap leading-relaxed break-words">
          {description}
        </p>
      )}

      <div className="flex items-center gap-6 px-4">
        <LikeButton
          postId={post.id}
          initialLiked={isLiked}
          initialCount={post.likesCount || 0}
        />

        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="flex items-center gap-1.5 group"
        >
          <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />

          {commentCount > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
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
          className="group"
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
          className="ml-auto group"
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