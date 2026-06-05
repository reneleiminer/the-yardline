import React from 'react';
import { Button } from '@/components/ui/button';
import { useAppUser } from '@/lib/useAppUser';
import { useFollow } from '@/hooks/useFollow';
import { isAdminBySlug, isModeratorBySlug, isDataEditorBySlug, isAdmin, isModerator, isDataEditor } from '@/lib/roleDefinitions';

function isInternalUser(appUser) {
  if (!appUser) return false;
  const slug = appUser.roleSlug;
  const role = appUser.role;
  if (slug) return isAdminBySlug(slug) || isModeratorBySlug(slug) || isDataEditorBySlug(slug);
  return isAdmin(role) || isModerator(role) || isDataEditor(role);
}

export default function FollowButton({ userId, onFollowChange }) {
  const { appUser } = useAppUser();
  const { isFollowing, loading, checked, toggle } = useFollow({
    targetId: userId,
    targetType: 'user',
    onFollowChange,
  });

  if (!appUser || appUser.id === userId || isInternalUser(appUser)) return null;
  if (!checked) return null; // wait until we know follow state

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      className="rounded-full"
    >
      {loading ? '...' : isFollowing ? 'Entfolgen' : 'Folgen'}
    </Button>
  );
}