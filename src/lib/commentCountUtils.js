import { base44 } from '@/api/base44Client';

/**
 * Load all comments and calculate counts per post
 */
export async function loadCommentCounts() {
  const comments = await base44.entities.Comment.list();
  const counts = {};
  
  comments.forEach(comment => {
    if (comment.isDeleted || comment.isHidden) return;
    counts[comment.postId] = (counts[comment.postId] || 0) + 1;
  });
  
  return counts;
}

/**
 * Attach comment counts to posts
 */
export function attachCommentCounts(posts, commentCounts) {
  return posts.map(post => ({
    ...post,
    commentCount: commentCounts[post.id] || 0
  }));
}

/**
 * Get comment count for a single post
 */
export async function getCommentCountForPost(postId) {
  const comments = await base44.entities.Comment.filter({ postId });
  return comments.filter(c => !c.isDeleted && !c.isHidden).length;
}