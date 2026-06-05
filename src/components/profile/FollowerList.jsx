import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import FollowButton from './FollowButton';
import { useAppUser } from '@/lib/useAppUser';
import { getImageUrl } from '@/lib/imageUtils';
import { Loader2 } from 'lucide-react';

// Returns true if the user record should be excluded from lists/counts.
function isExcludedFromPublic(user) {
  if (!user) return true;
  if (user.deletionStatus === 'completed') return true;
  const slug = user.roleSlug || user.role?.toLowerCase();
  if (slug === 'admin') return true;
  return false;
}

export default function FollowerList({ userId, type = 'followers' }) {
  const navigate = useNavigate();
  const { appUser } = useAppUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const fetchUsers = async () => {
      try {
        let follows;

        if (type === 'followers') {
          // People following this user: targetId = userId, targetType = "user"
          follows = await base44.entities.Follow.filter({ targetId: userId, targetType: 'user' });
          const followerIds = follows.map(f => f.followerId);

          const userResults = await Promise.all(followerIds.map(id => base44.entities.AppUser.filter({ id })));
          const fetched = userResults.map(r => r[0]).filter(u => u && !isExcludedFromPublic(u));
          setUsers(fetched);
        } else {
          // People this user follows (all targetTypes)
          follows = await base44.entities.Follow.filter({ followerId: userId });

          // Only show user-type follows in the "following" modal
          const userFollows = follows.filter(f => f.targetType === 'user');
          const targetIds = userFollows.map(f => f.targetId);

          const userResults = await Promise.all(targetIds.map(id => base44.entities.AppUser.filter({ id })));
          const fetched = userResults.map(r => r[0]).filter(u => u && !isExcludedFromPublic(u));
          setUsers(fetched);
        }
      } catch (err) {
        console.error('Error fetching follower list:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {type === 'followers' ? 'Noch keine Follower' : 'Folgt niemandem'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map(user => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-3 hover:bg-secondary/30 rounded-lg cursor-pointer group"
          onClick={() => navigate(`/profile/${user.username}`)}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={getImageUrl(user.avatar)} />
            <AvatarFallback className="bg-secondary text-xs font-bold">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-semibold text-sm truncate">{user.username}</span>
              {user.verified && <span className="text-primary text-xs">✓</span>}
              {user.deletionStatus === 'pending' && (
                <span className="text-xs text-muted-foreground italic">· Wird gelöscht</span>
              )}
            </div>
            {user.role && (
              <Badge variant="outline" className="text-xs mt-1 w-fit">
                {user.role}
              </Badge>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton
              userId={user.id}
              username={user.username}
            />
          </div>
        </div>
      ))}
    </div>
  );
}