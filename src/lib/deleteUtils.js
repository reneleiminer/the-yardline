export async function permanentlyDeletePost(base44, postId) {
  if (!postId) return;

  const comments = await safeFilter(base44, 'Comment', { postId });
  await safeDeleteMany(base44, 'Comment', comments);

  const likes = await safeFilter(base44, 'Like', { postId });
  await safeDeleteMany(base44, 'Like', likes);

  const notifications = await safeFilter(base44, 'Notification', { targetId: postId });
  await safeDeleteMany(base44, 'Notification', notifications);

  await safeDelete(base44, 'Post', postId);
}

export async function permanentlyDeleteComment(base44, commentId, postId) {
  if (!commentId) return;

  const notifications = await safeFilter(base44, 'Notification', { targetId: commentId });
  await safeDeleteMany(base44, 'Notification', notifications);

  await safeDelete(base44, 'Comment', commentId);

  if (postId) {
    const remaining = await safeFilter(base44, 'Comment', { postId });
    await safeUpdate(base44, 'Post', postId, {
      commentsCount: remaining.length,
    });
  }
}

export async function permanentlyDeleteUserData(base44, user) {
  if (!user?.id) {
    throw new Error('Nutzer konnte nicht gelöscht werden.');
  }

  if (user.isOwner) {
    throw new Error('Owner-Admin kann nicht gelöscht werden.');
  }

  const userId = user.id;
  const userEmail = user.email || '';
  const username = user.username || '';

  await disconnectManagedEntities(base44, user);

  const posts = await safeFilter(base44, 'Post', { authorId: userId });
  await Promise.all(posts.map(post => permanentlyDeletePost(base44, post.id)));

  const comments = await safeFilter(base44, 'Comment', { authorId: userId });
  await Promise.all(comments.map(comment => permanentlyDeleteComment(base44, comment.id, comment.postId)));

  const likes = await safeFilter(base44, 'Like', { userId });
  await safeDeleteMany(base44, 'Like', likes);

  const followsAsFollower = await safeFilter(base44, 'Follow', { followerId: userId });
  await safeDeleteMany(base44, 'Follow', followsAsFollower);

  const followsAsTarget = await safeFilter(base44, 'Follow', { targetId: userId });
  await safeDeleteMany(base44, 'Follow', followsAsTarget);

  const notificationsForUser = await safeFilter(base44, 'Notification', { userId });
  await safeDeleteMany(base44, 'Notification', notificationsForUser);

  const notificationsFromUser = await safeFilter(base44, 'Notification', { actorUserId: userId });
  await safeDeleteMany(base44, 'Notification', notificationsFromUser);

  const moderationLogsByTarget = await safeFilter(base44, 'ModerationLog', { targetUserId: userId });
  await safeDeleteMany(base44, 'ModerationLog', moderationLogsByTarget);

  const moderationLogsByModerator = await safeFilter(base44, 'ModerationLog', { moderatorId: userId });
  await safeDeleteMany(base44, 'ModerationLog', moderationLogsByModerator);

  const roleApplications = await safeFilter(base44, 'RoleApplication', { userId });
  await safeDeleteMany(base44, 'RoleApplication', roleApplications);

  const supportRequests = await safeFilter(base44, 'SupportRequest', { userId });
  await safeDeleteMany(base44, 'SupportRequest', supportRequests);

  const supportTickets = await safeFilter(base44, 'SupportTicket', { userId });
  await safeDeleteMany(base44, 'SupportTicket', supportTickets);

  if (userEmail) {
    const duplicateUsersByEmail = await safeFilter(base44, 'AppUser', { email: userEmail });
    await safeDeleteMany(
      base44,
      'AppUser',
      duplicateUsersByEmail.filter(item => item.id !== userId && !item.isOwner)
    );
  }

  if (username) {
    const duplicateUsersByUsername = await safeFilter(base44, 'AppUser', { username });
    await safeDeleteMany(
      base44,
      'AppUser',
      duplicateUsersByUsername.filter(item => item.id !== userId && !item.isOwner)
    );
  }

  await safeDelete(base44, 'AppUser', userId);
}

async function disconnectManagedEntities(base44, user) {
  const updates = [];

  if (user.connectedTeamId) {
    updates.push(
      safeUpdate(base44, 'Team', user.connectedTeamId, {
        assignedUserId: null,
        managedByUserId: null,
        isClaimed: false,
      })
    );
  }

  if (user.connectedClubId) {
    updates.push(
      safeUpdate(base44, 'Club', user.connectedClubId, {
        assignedUserId: null,
        managedByUserId: null,
      })
    );
  }

  if (user.linkedClubId && user.linkedClubId !== user.connectedClubId) {
    updates.push(
      safeUpdate(base44, 'Club', user.linkedClubId, {
        assignedUserId: null,
        managedByUserId: null,
      })
    );
  }

  if (user.linkedLeagueId) {
    updates.push(
      safeUpdate(base44, 'League', user.linkedLeagueId, {
        assignedUserId: null,
        managedByUserId: null,
      })
    );
  }

  await Promise.all(updates);
}

async function safeFilter(base44, entityName, filter) {
  try {
    const entity = base44.entities?.[entityName];

    if (!entity?.filter) {
      return [];
    }

    return await entity.filter(filter);
  } catch {
    return [];
  }
}

async function safeDelete(base44, entityName, id) {
  try {
    const entity = base44.entities?.[entityName];

    if (!entity?.delete || !id) {
      return;
    }

    await entity.delete(id);
  } catch {
    // Ignore already deleted or unavailable optional data.
  }
}

async function safeDeleteMany(base44, entityName, items) {
  await Promise.all(
    (items || [])
      .filter(item => item?.id)
      .map(item => safeDelete(base44, entityName, item.id))
  );
}

async function safeUpdate(base44, entityName, id, data) {
  try {
    const entity = base44.entities?.[entityName];

    if (!entity?.update || !id) {
      return;
    }

    await entity.update(id, data);
  } catch {
    // Ignore optional reverse-link cleanup failures.
  }
}