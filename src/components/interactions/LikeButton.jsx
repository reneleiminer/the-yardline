import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAppUser } from '@/lib/useAppUser';
import { isAdminBySlug, isModeratorBySlug, isDataEditorBySlug, isAdmin, isModerator, isDataEditor } from '@/lib/roleDefinitions';

function isInternalUser(appUser) {
  if (!appUser) return false;
  const slug = appUser.roleSlug;
  const role = appUser.role;
  if (slug) return isAdminBySlug(slug) || isModeratorBySlug(slug) || isDataEditorBySlug(slug);
  return isAdmin(role) || isModerator(role) || isDataEditor(role);
}

export default function LikeButton({ postId, initialLiked = false, initialCount = 0, onCountChange }) {
  const { appUser } = useAppUser();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    
    if (!appUser || loading) return;

    setLoading(true);
    const previousLiked = liked;
    const previousCount = count;
    let resolvedCount = previousCount;

    try {
      // Optimistic update
      const newLiked = !liked;
      setLiked(newLiked);
      setCount(newLiked ? count + 1 : Math.max(0, count - 1));

      if (newLiked) {
        // Create like record in database
        await base44.entities.Like.create({
          postId,
          userId: appUser.id,
          createdAtUtc: new Date().toISOString()
        });
        
        // Fetch all likes for this post to get accurate count
        const allLikes = await base44.entities.Like.filter({ postId });
        const newCount = allLikes.length;
        resolvedCount = newCount;
        
        // Update post with real count
        await base44.entities.Post.update(postId, { likesCount: newCount });
        setCount(newCount);
        
        // Create notification
        await base44.functions.invoke('createPostLikeNotification', { postId });
      } else {
        // Find and delete like
        const existingLikes = await base44.entities.Like.filter({
          postId,
          userId: appUser.id
        });
        
        if (existingLikes.length > 0) {
          await base44.entities.Like.delete(existingLikes[0].id);
          
          // Fetch all remaining likes for this post
          const allLikes = await base44.entities.Like.filter({ postId });
          const newCount = allLikes.length;
          resolvedCount = newCount;
          
          // Update post with real count
          await base44.entities.Post.update(postId, { likesCount: newCount });
          setCount(newCount);
        }
      }

      onCountChange?.(resolvedCount);
    } catch (err) {
      console.error('Like error:', err);
      // Revert on error
      setLiked(previousLiked);
      setCount(previousCount);
    } finally {
      setLoading(false);
    }
  };

  if (isInternalUser(appUser)) return null;

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className="flex items-center gap-1.5 group"
    >
      <Heart
        className={`w-5 h-5 transition-all ${
          liked
            ? 'fill-red-500 text-red-500 scale-110'
            : 'text-muted-foreground group-hover:text-red-400'
        } ${loading ? 'opacity-50' : ''}`}
      />
      {count > 0 && (
        <span className={`text-xs font-medium transition-colors ${
          liked ? 'text-red-500' : 'text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
