import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function can be called by: scheduler (no user) or admin (user with admin role)
    // For scheduled calls, use service role throughout
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetUserId = body.targetUserId || null; // Admin forcing deletion of specific user
    const isAdminForce = !!targetUserId;

    // If admin force-delete, verify caller is admin
    if (isAdminForce) {
      const caller = await base44.auth.me();
      if (!caller || caller.role !== 'Admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();

    // Find users due for deletion
    let usersToDelete = [];
    if (isAdminForce) {
      const found = await base44.asServiceRole.entities.AppUser.filter({ id: targetUserId });
      usersToDelete = found;
    } else {
      // Get all deletion-pending users and filter in JS (no complex query operators needed)
      const pending = await base44.asServiceRole.entities.AppUser.filter({ deletionStatus: 'pending' });
      usersToDelete = pending.filter(u => u.deleteAfterUtc && new Date(u.deleteAfterUtc) <= now);
    }

    const results = [];

    for (const appUser of usersToDelete) {
      try {
        const userId = appUser.id;
        const userEmail = appUser.email;

        // 1. Unlink from club/team/league (keep the entity, remove user reference)
        if (appUser.connectedTeamId) {
          // No team-level user field to clear, just removing the link from appUser side
        }

        // 2. Delete posts
        const posts = await base44.asServiceRole.entities.Post.filter({ authorId: userId });
        for (const post of posts) {
          await base44.asServiceRole.entities.Post.delete(post.id);
        }

        // 3. Delete comments
        const comments = await base44.asServiceRole.entities.Comment.filter({ authorId: userId });
        for (const comment of comments) {
          await base44.asServiceRole.entities.Comment.delete(comment.id);
        }

        // 4. Delete likes
        const likes = await base44.asServiceRole.entities.Like.filter({ userId });
        for (const like of likes) {
          await base44.asServiceRole.entities.Like.delete(like.id);
        }

        // 5. Delete follows (both as follower and following)
        const followsAsFollower = await base44.asServiceRole.entities.Follow.filter({ followerId: userId });
        for (const f of followsAsFollower) {
          await base44.asServiceRole.entities.Follow.delete(f.id);
        }
        const followsAsFollowing = await base44.asServiceRole.entities.Follow.filter({ followingId: userId });
        for (const f of followsAsFollowing) {
          await base44.asServiceRole.entities.Follow.delete(f.id);
        }

        // 6. Delete notifications for this user
        const notifications = await base44.asServiceRole.entities.Notification.filter({ userId });
        for (const n of notifications) {
          await base44.asServiceRole.entities.Notification.delete(n.id);
        }

        // 7. Delete support tickets
        const tickets = await base44.asServiceRole.entities.SupportTicket.filter({ userId });
        for (const t of tickets) {
          await base44.asServiceRole.entities.SupportTicket.delete(t.id);
        }

        // 8. Delete support requests
        const supportRequests = await base44.asServiceRole.entities.SupportRequest.filter({ userId });
        for (const sr of supportRequests) {
          await base44.asServiceRole.entities.SupportRequest.delete(sr.id);
        }

        // 9. Delete role applications
        const applications = await base44.asServiceRole.entities.RoleApplication.filter({ userId });
        for (const a of applications) {
          await base44.asServiceRole.entities.RoleApplication.delete(a.id);
        }

        // 10. Delete notification settings
        const notifSettings = await base44.asServiceRole.entities.NotificationSettings.filter({ userId });
        for (const ns of notifSettings) {
          await base44.asServiceRole.entities.NotificationSettings.delete(ns.id);
        }

        // 11. Delete club/league follows
        const clubFollows = await base44.asServiceRole.entities.ClubFollow.filter({ userId });
        for (const cf of clubFollows) {
          await base44.asServiceRole.entities.ClubFollow.delete(cf.id);
        }
        const leagueFollows = await base44.asServiceRole.entities.LeagueFollow.filter({ userId });
        for (const lf of leagueFollows) {
          await base44.asServiceRole.entities.LeagueFollow.delete(lf.id);
        }

        // 12. Delete moderation logs targeting this user
        const modLogs = await base44.asServiceRole.entities.ModerationLog.filter({ targetUserId: userId });
        for (const ml of modLogs) {
          await base44.asServiceRole.entities.ModerationLog.delete(ml.id);
        }

        // 13. Finally delete the AppUser profile itself
        await base44.asServiceRole.entities.AppUser.update(userId, {
          deletionStatus: 'completed',
          username: `deleted_${userId.substring(0, 8)}`,
          displayName: 'Gelöschter Nutzer',
          email: `deleted_${userId}@deleted`,
          bio: null,
          avatar: null,
          banner: null,
          website: null,
          instagram: null,
          twitter: null,
          tiktok: null,
          youtube: null,
        });

        // After a short delay, hard-delete the AppUser record
        await base44.asServiceRole.entities.AppUser.delete(userId);

        results.push({ userId, status: 'deleted', email: userEmail });
        console.log(`Deleted account for user ${userId} (${userEmail})`);
      } catch (err) {
        console.error(`Failed to delete user ${appUser.id}:`, err.message);
        results.push({ userId: appUser.id, status: 'error', error: err.message });
      }
    }

    return Response.json({
      processed: results.length,
      results,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('processAccountDeletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});