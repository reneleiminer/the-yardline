import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/imageUtils';
import { BadgeCheck, Camera, FileText, Trophy, Megaphone } from 'lucide-react';
import { showBadge, getRoleDisplayLabel, getRoleSlug } from '@/lib/roleDefinitions';
import { isSystemRole, getAvatarForRole } from '@/lib/systemRoleUtils';

export default function UserLink({
  userId,
  username,
  avatar,
  displayName,
  verified,
  role,
  className,
  variant = 'inline',
}) {
  const roleSlug = getRoleSlug(role);
  const roleLabel = getRoleDisplayLabel(role);
  const isAdmin = roleSlug === 'admin';

  if (variant === 'avatar') {
    return (
      <Avatar
        className={`w-9 h-9 ${className || ''}`}
      >
        <AvatarImage src={getImageUrl(isSystemRole(role) ? getAvatarForRole({ avatar, role }) : avatar)} />
        <AvatarFallback className="bg-secondary text-xs font-bold">
          {isSystemRole(role) ? 'Y' : username?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  const getRoleBadge = () => {
    if (!showBadge(role)) return null;

    if (roleSlug === 'creator') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-semibold">
          Creator
        </span>
      );
    }

    if (roleSlug === 'official_media') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-semibold">
          <Megaphone className="w-3 h-3" />
          {roleLabel}
        </span>
      );
    }

    if (roleSlug === 'photographer') {
      return <Camera className="w-3.5 h-3.5 text-primary flex-shrink-0" />;
    }

    if (roleSlug === 'journalist') {
      return <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />;
    }

    if (roleSlug === 'club' || roleSlug === 'league') {
      return <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />;
    }

    if (roleSlug === 'admin') {
      return <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />;
    }

    return (
      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-semibold">
        {roleLabel}
      </span>
    );
  };

  if (isAdmin) {
    return (
      <span className={`flex items-center gap-1 text-sm font-semibold text-muted-foreground ${className || ''}`}>
        Admin
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 ${className || ''}`}
    >
      <span className="font-semibold text-sm">{displayName || username}</span>
      {getRoleBadge()}
      {verified && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
    </span>
  );
}
