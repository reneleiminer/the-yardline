import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await req.json();
    
    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    const post = await base44.entities.Post.get(postId);
    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    // Don't notify if self-action
    if (user.id === post.authorId) {
      return Response.json({ success: true, notificationCreated: false });
    }

    // Check for existing like notification to avoid duplicates
    const existingNotifications = await base44.entities.Notification.filter({
      userId: post.authorId,
      type: 'post_like',
      targetId: postId,
      targetType: 'post'
    }, '-created_date', 1);

    // If notification exists and was created recently (within 24 hours), skip
    if (existingNotifications.length > 0) {
      const lastNotifTime = new Date(existingNotifications[0].created_date);
      const now = new Date();
      const hoursDiff = (now - lastNotifTime) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return Response.json({ success: true, notificationCreated: false, duplicate: true });
      }
    }

    // Get author info
    const author = await base44.entities.AppUser.get(user.id);

    // Create notification
    const notification = await base44.entities.Notification.create({
      userId: post.authorId,
      type: 'post_like',
      title: `${author.username || 'Jemand'} gefällt dein Beitrag`,
      message: `${author.username || 'Jemand'} gefällt dein Beitrag`,
      targetType: 'post',
      targetId: postId,
      imageUrl: author.avatar,
      iconType: 'bell',
      isRead: false
    });

    return Response.json({ 
      success: true, 
      notificationCreated: true,
      notification 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});