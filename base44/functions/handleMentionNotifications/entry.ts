import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Triggered when a post or comment with mentions is created
 * Sends notifications to mentioned users
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity, entityType, mentions, authorId } = await req.json();

    if (!mentions || mentions.length === 0) {
      return Response.json({ success: true, notified: 0 });
    }

    let notified = 0;

    for (const mention of mentions) {
      // Don't notify user if they mentioned themselves
      if (mention.userId === authorId) continue;

      const user = await base44.entities.AppUser.filter({ id: mention.userId });
      if (!user?.[0]) continue;

      const author = await base44.entities.AppUser.filter({ id: authorId });
      const authorName = author?.[0]?.displayName || author?.[0]?.username || 'Jemand';

      let title = `${authorName} hat dich erwähnt`;
      let message = entityType === 'comment'
        ? `${authorName} hat dich in einem Kommentar erwähnt`
        : `${authorName} hat dich in einem Beitrag erwähnt`;

      const targetId = entityType === 'comment' ? entity.postId : entity.id;

      await base44.entities.Notification.create({
        userId: mention.userId,
        type: entityType === 'comment' ? 'comment_mention' : 'post_mention',
        title,
        message,
        targetType: entityType === 'comment' ? 'comment' : 'post',
        targetId,
        iconType: 'bell',
        isRead: false,
      });

      notified++;
    }

    return Response.json({ success: true, notified });
  } catch (error) {
    console.error('Mention notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});