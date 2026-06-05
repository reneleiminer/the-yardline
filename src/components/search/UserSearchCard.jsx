import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, Users } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { getRoleDisplayLabel, getRoleSlug, showBadge } from '@/lib/roleDefinitions';
import FollowButton from '@/components/profile/FollowButton';
import { useAppUser } from '@/lib/useAppUser';

const ROLE_COLORS = {
  creator: 'bg-purple-500/15 text-purple-400',
  journalist: 'bg-blue-500/15 text-blue-400',
  photographer: 'bg-amber-500/15 text-amber-400',
  official_media: 'bg-emerald-500/15 text-emerald-400',
  club: 'bg-green-500/15 text-green-400',
  league: 'bg-primary/15 text-primary',
  fan: 'bg-secondary text-muted-foreground',
  admin: 'bg-red-500/15 text-red-400',
  moderator: 'bg-orange-500/15 text-orange-400',
};

export default function UserSearchCard({ user }) {
  const navigate = useNavigate();
  const { appUser } = useAppUser();

  const slug = user.roleSlug || getRoleSlug(user.role);
  const label = getRoleDisplayLabel(slug);
  const colorClass = ROLE_COLORS[slug] || ROLE_COLORS.fan;
  const isVerified = user.verified || showBadge(user.roleSlug || user.role);
  const isOwnProfile = appUser?.id === user.id;

  return (
    <div
      className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl hover:border-primary/20 transition-colors cursor-pointer active:bg-secondary/30"
      onClick={() => navigate(`/profile/${user.username}`)}
    >
      <Avatar className="w-11 h-11 flex-shrink-0">
        <AvatarImage src={getImageUrl(user.avatar)} />
        <AvatarFallback className="bg-secondary text-sm font-bold">
          {user.username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm truncate">{user.displayName || user.username}</p>
          {isVerified && <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colorClass}`}>
            {label}
          </span>
          {user.followersCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3 h-3" />
              {user.followersCount}
            </span>
          )}
        </div>
      </div>

      {!isOwnProfile && (
        <div onClick={e => e.stopPropagation()}>
          <FollowButton userId={user.id} isFollowing={false} />
        </div>
      )}
    </div>
  );
}