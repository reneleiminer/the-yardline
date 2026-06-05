import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify caller is admin — check both platform role and AppUser roleSlug
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the AppUser profile to check roleSlug
    const [callerProfile] = await base44.asServiceRole.entities.AppUser.filter({ email: caller.email });
    const isAdmin = caller.role === 'admin' || callerProfile?.roleSlug === 'admin' || callerProfile?.isOwner === true;
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId) {
      return Response.json({ error: 'targetUserId required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (callerProfile && targetUserId === callerProfile.id) {
      return Response.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const [appUser] = await base44.asServiceRole.entities.AppUser.filter({ id: targetUserId });
    if (!appUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect owner accounts
    if (appUser.isOwner) {
      return Response.json({ error: 'Cannot delete owner account' }, { status: 403 });
    }

    const userId = appUser.id;

    // 1. Unlink from Club (keep club, remove user reference)
    if (appUser.connectedClubId || appUser.linkedClubId) {
      const clubId = appUser.connectedClubId || appUser.linkedClubId;
      try {
        await base44.asServiceRole.entities.Club.update(clubId, {
          assignedUserId: null,
          managedByUserId: null,
        });
      } catch (e) {
        console.warn('Club unlink failed:', e.message);
      }
    }

    // 2. Unlink from Team (keep team, remove user reference)
    if (appUser.connectedTeamId) {
      try {
        await base44.asServiceRole.entities.Team.update(appUser.connectedTeamId, {
          assignedUserId: null,
          managedByUserId: null,
        });
      } catch (e) {
        console.warn('Team unlink failed:', e.message);
      }
    }

    // 3. Delete posts by this user
    const posts = await base44.asServiceRole.entities.Post.filter({ authorId: userId });
    for (const post of posts) {
      // Delete likes on this post
      const postLikes = await base44.asServiceRole.entities.Like.filter({ postId: post.id });
      for (const l of postLikes) await base44.asServiceRole.entities.Like.delete(l.id);
      // Delete comments on this post
      const postComments = await base44.asServiceRole.entities.Comment.filter({ postId: post.id });
      for (const c of postComments) await base44.asServiceRole.entities.Comment.delete(c.id);
      // Delete the post itself
      await base44.asServiceRole.entities.Post.delete(post.id);
    }

    // 4. Delete comments by this user (on other posts)
    const comments = await base44.asServiceRole.entities.Comment.filter({ authorId: userId });
    for (const comment of comments) {
      await base44.asServiceRole.entities.Comment.delete(comment.id);
    }

    // 5. Delete likes by this user
    const likes = await base44.asServiceRole.entities.Like.filter({ userId });
    for (const like of likes) {
      await base44.asServiceRole.entities.Like.delete(like.id);
    }

    // 6. Delete follows WHERE this user is follower
    const followsOut = await base44.asServiceRole.entities.Follow.filter({ followerId: userId });
    for (const f of followsOut) await base44.asServiceRole.entities.Follow.delete(f.id);

    // 7. Delete follows WHERE this user is the target (followers of this user)
    const followsIn = await base44.asServiceRole.entities.Follow.filter({ targetId: userId });
    for (const f of followsIn) await base44.asServiceRole.entities.Follow.delete(f.id);

    // 8. Delete notifications for this user
    const notifications = await base44.asServiceRole.entities.Notification.filter({ userId });
    for (const n of notifications) await base44.asServiceRole.entities.Notification.delete(n.id);

    // 9. Delete support tickets
    const tickets = await base44.asServiceRole.entities.SupportTicket.filter({ userId });
    for (const t of tickets) await base44.asServiceRole.entities.SupportTicket.delete(t.id);

    // 10. Delete support requests
    const supportRequests = await base44.asServiceRole.entities.SupportRequest.filter({ userId });
    for (const sr of supportRequests) await base44.asServiceRole.entities.SupportRequest.delete(sr.id);

    // 11. Delete role applications
    const applications = await base44.asServiceRole.entities.RoleApplication.filter({ userId });
    for (const a of applications) await base44.asServiceRole.entities.RoleApplication.delete(a.id);

    // 12. Delete notification settings
    const notifSettings = await base44.asServiceRole.entities.NotificationSettings.filter({ userId });
    for (const ns of notifSettings) await base44.asServiceRole.entities.NotificationSettings.delete(ns.id);

    // 13. Delete club follows
    const clubFollows = await base44.asServiceRole.entities.ClubFollow.filter({ userId });
    for (const cf of clubFollows) await base44.asServiceRole.entities.ClubFollow.delete(cf.id);

    // 14. Delete league follows
    const leagueFollows = await base44.asServiceRole.entities.LeagueFollow.filter({ userId });
    for (const lf of leagueFollows) await base44.asServiceRole.entities.LeagueFollow.delete(lf.id);

    // 15. Delete moderation logs targeting this user
    const modLogs = await base44.asServiceRole.entities.ModerationLog.filter({ targetUserId: userId });
    for (const ml of modLogs) await base44.asServiceRole.entities.ModerationLog.delete(ml.id);

    // 16. Hard-delete the AppUser profile
    await base44.asServiceRole.entities.AppUser.delete(userId);

    // 17. Delete auth/Base44 user account if email exists
    if (appUser.email) {
      try {
        // Attempt to delete the auth user via Base44 API
        await base44.asServiceRole.auth.deleteUser(appUser.email);
        console.log(`Auth user ${appUser.email} deleted`);
      } catch (authError) {
        // If deleteUser is not available or fails, log warning but continue
        // The app profile is already deleted, which is the primary requirement
        console.warn(`Could not delete auth user ${appUser.email}:`, authError.message);
      }
    }

    console.log(`Admin ${caller.email} permanently deleted user ${userId} (${appUser.email})`);

    return Response.json({ success: true, deletedUserId: userId });
  } catch (error) {
    console.error('adminDeleteUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});