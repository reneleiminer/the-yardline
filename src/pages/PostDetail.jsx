import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import useSetHeader from '@/hooks/useSetHeader';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import { getPostTimestamp } from '@/lib/timestampUtils';
import useRelativeTime from '@/hooks/useRelativeTime';
import UserLink from '@/components/profile/UserLink';
import { Badge } from '@/components/ui/badge';
import { Megaphone, MessageCircle, Share2, Bookmark, ArrowRight, Loader2 } from 'lucide-react';
import PostActionsMenu from '@/components/post/PostActionsMenu';
import LikeButton from '@/components/interactions/LikeButton';
import CommentsSheet from '@/components/comments/CommentsSheet';
import { useAppUser } from '@/lib/useAppUser';
import { hasLikedPost } from '@/lib/dataUtils';
import { toast } from 'sonner';

const POST_TYPE_CONFIG = {
  community: { label: 'Community', color: 'bg-secondary text-secondary-foreground' },
  official: { label: 'Ankündigung', color: 'bg-primary/90 text-primary-foreground' },
  news: { label: 'News', color: 'bg-accent text-accent-foreground' },
  transfer: { label: 'Transfer', color: 'bg-destructive/20 text-destructive' }
};

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

  return labels[normalized] || role || 'Fan';
}

export default function PostDetail() {
  const { id } = useParams();
  const { appUser } = useAppUser();
  const {
    postsById,
    teamsById,
    leaguesById,
    appUsersById,
    likes,
    postsLoading,
  } = useGlobalData();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [realCommentCount, setRealCommentCount] = useState(null);

  const post = useMemo(() => postsById?.get(id), [postsById, id]);
  const isLoading = postsLoading;
  const isLiked = appUser ? hasLikedPost(appUser.id, id, likes) : false;

  const typeLabel = post ? (POST_TYPE_CONFIG[post.type]?.label || 'Beitrag') : 'Beitrag';
  useSetHeader({ mode: 'back', title: typeLabel });

  const timeAgo = useRelativeTime(getPostTimestamp(post));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Beitrag nicht gefunden.
      </div>
    );
  }

  if (post.isDeleted) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Dieser Beitrag wurde gelöscht.
      </div>
    );
  }

  if (post.isHidden && !['Admin', 'Moderator', 'DataEditor', 'admin', 'moderator', 'data_editor'].includes(appUser?.role)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Dieser Beitrag wurde ausgeblendet.
      </div>
    );
  }

    const postImages = getPostImages(post);
  const primaryImage = postImages[0];
  const league = post.leagueId ? leaguesById?.get(post.leagueId) : null;
  const teamsList = getPostTeamIds(post).map(teamId => teamsById?.get(teamId)).filter(Boolean);
  const config = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.community;

  const author = post.authorId ? appUsersById?.get(post.authorId) : null;
  const authorRoleValue =
    author?.roleSlug ||
    author?.role ||
    post.authorRoleSlug ||
    post.authorRole ||
    'fan';

  const authorRoleLabel = getRoleLabel(authorRoleValue);
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

function isClubNews(post) {
  return post?.sourceType === 'club_news';
}

  const authorData = {
    id: author?.id || post.authorId || '',
    username: author?.username || post.authorUsername || post.created_by || 'theyardlinemedia',
    avatar: author?.avatar || post.authorAvatar || '',
    verified: author?.verified ?? post.authorVerified ?? false,
    role: authorRoleValue,
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = post.title || post.teaser || 'The Yardline Beitrag';
    const shareText =
      post.teaser ||
      post.text?.slice(0, 140) ||
      'Schau dir diesen Beitrag auf The Yardline an.';

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link kopiert');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link kopiert');
        } catch {
          toast.error('Teilen nicht möglich');
        }
      }
    }
  };

  const renderContent = () => {
    switch (post.type) {
      case 'official':
        return (
          <>
            {primaryImage && (
              <img
                src={getImageUrl(primaryImage)}
                alt=""
                className="w-full aspect-video object-cover mb-4 sm:mb-6 rounded-lg"
                onError={(event) => { event.currentTarget.src = getImageUrl(); }}
              />
            )}

            <div className="space-y-3 sm:space-y-4">
              {post.title && (
                <h1 className="text-xl sm:text-3xl font-bold leading-tight">{post.title}</h1>
              )}

              {post.teaser && (
                <p className="text-base sm:text-lg text-foreground/80 leading-relaxed">{post.teaser}</p>
              )}

              {post.text && (
                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {post.text}
                </div>
              )}
            </div>
          </>
        );

      case 'news':
        return (
          <>
            {primaryImage && (
              <img
                src={getImageUrl(primaryImage)}
                alt=""
                className="w-full aspect-video object-cover mb-6 rounded-lg"
                onError={(event) => { event.currentTarget.src = getImageUrl(); }}
              />
            )}

            <div className="space-y-4">
              {post.title && (
                <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
              )}

              {post.teaser && (
                <p className="text-lg text-foreground/70">{post.teaser}</p>
              )}

              {post.text && (
                <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none">
                  {post.text}
                </div>
              )}
            </div>
          </>
        );

      case 'transfer': {
        const lines = post.text?.split('\n') || [];
        const playerName = lines[0] || '';
        const fromTeam = post.teamIds?.[0] ? teamsById?.get(post.teamIds[0]) : null;
        const toTeam = post.teamIds?.[1] ? teamsById?.get(post.teamIds[1]) : null;

        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{playerName}</h1>

            <div className="bg-card border border-border/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {fromTeam?.logo && (
                  <img
                    src={getImageUrl(fromTeam.logo)}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                    onError={(event) => { event.currentTarget.src = getImageUrl(); }}
                  />
                )}

                <span className="text-sm font-semibold flex-1">{fromTeam?.shortName || 'TBA'}</span>
                <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-semibold flex-1 text-right">{toTeam?.shortName || 'TBA'}</span>

                {toTeam?.logo && (
                  <img
                    src={getImageUrl(toTeam.logo)}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                    onError={(event) => { event.currentTarget.src = getImageUrl(); }}
                  />
                )}
              </div>
            </div>

            {primaryImage && (
              <img
                src={getImageUrl(primaryImage)}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
                onError={(event) => { event.currentTarget.src = getImageUrl(); }}
              />
            )}

            {lines.length > 2 && lines.slice(2).join('\n').trim() && (
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {lines.slice(2).join('\n')}
              </p>
            )}
          </div>
        );
      }

      case 'community':
      default:
        return (
          <div className="space-y-4">
            {post.text && (
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-base">
                {post.text}
              </p>
            )}

            {post.images && post.images.length > 0 && (
              <div className="space-y-2">
                {post.images.map((img, index) => (
                  <img
                    key={index}
                    src={getImageUrl(img)}
                    alt=""
                    className="w-full aspect-auto object-cover rounded-lg"
                    onError={(event) => { event.currentTarget.src = getImageUrl(); }}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      <div className="px-3 sm:px-4 py-4 sm:py-6 w-full max-w-full overflow-x-hidden space-y-4">
        {post.type === 'official' && (
          <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1 flex items-center w-fit">
            <Megaphone className="w-3 h-3" />
            OFFIZIELL
          </Badge>
        )}

        {post.type === 'transfer' && (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        )}

                {post.type === 'news' && (
          <div className="flex flex-wrap gap-2">
            {isClubNews(post) && (
              <Badge className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Vereinsnews
              </Badge>
            )}

            {post.category && (
              <Badge className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {post.category}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 border-y border-border/30 min-w-0">
          <UserLink
            userId={authorData.id}
            username={authorData.username}
            avatar={authorData.avatar}
            verified={authorData.verified}
            role={authorData.role}
            variant="avatar"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <UserLink
                userId={authorData.id}
                username={authorData.username}
                avatar={authorData.avatar}
                verified={authorData.verified}
                role={authorData.role}
              />

              {authorRoleLabel && authorRoleLabel !== 'Fan' && (
                <Badge className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {authorRoleLabel}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {timeAgo}{post.updatedAtUtc && <span className="ml-1 opacity-60">· bearbeitet</span>}
            </p>
          </div>

          <PostActionsMenu post={post} />
        </div>

        {(league || teamsList.length > 0) && (
          <div className="flex flex-wrap gap-1 sm:gap-2 w-full overflow-x-hidden">
            {league?.logo && (
              <a href={`/league/${league.id}`} className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 hover:bg-secondary transition-colors">
                <img
                  src={getImageUrl(league.logo)}
                  alt=""
                  className="h-5 object-contain"
                  onError={(event) => { event.currentTarget.src = getImageUrl(); }}
                />
                <span className="text-xs font-medium">{league.name}</span>
              </a>
            )}

            {teamsList.map(team => (
              <a
                key={team.id}
                href={`/club/${team.id}`}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <img
                  src={getImageUrl(team.logo)}
                  alt=""
                  className="h-5 object-contain"
                  onError={(event) => { event.currentTarget.src = getImageUrl(); }}
                />
                <span className="text-xs font-medium">{team.shortName}</span>
              </a>
            ))}
          </div>
        )}

        <div className="py-4">
          {renderContent()}
        </div>

        <div className="flex items-center gap-4 sm:gap-6 py-3 sm:py-4 border-t border-border/30 min-w-0">
          <LikeButton
            postId={post.id}
            initialLiked={isLiked}
            initialCount={post.likesCount || 0}
          />

          <button onClick={() => setCommentsOpen(true)} className="flex items-center gap-1.5 group flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            {(realCommentCount ?? post.commentsCount) > 0 && (
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                {realCommentCount ?? post.commentsCount}
              </span>
            )}
          </button>

          <button onClick={handleShare} className="group flex-shrink-0">
            <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          <button className="ml-auto flex-shrink-0 group">
            <Bookmark className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>

      <CommentsSheet
        postId={post.id}
        isOpen={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCountChange={setRealCommentCount}
      />
    </div>
  );
}