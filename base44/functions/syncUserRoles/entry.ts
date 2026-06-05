import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all roles
    const roles = await base44.asServiceRole.entities.Role.list();
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.slug] = role.id;
    });

    // Fetch all app users
    const allUsers = await base44.asServiceRole.entities.AppUser.list();

    const usersToUpdate = [];

    for (const appUser of allUsers) {
      // If user already has roleSlug, get the roleId
      if (appUser.roleSlug) {
        const roleId = roleMap[appUser.roleSlug];
        if (!appUser.roleId || appUser.roleId !== roleId) {
          usersToUpdate.push({
            id: appUser.id,
            updates: { roleId }
          });
        }
      } else {
        // Assign fan role to users without roleSlug
        const fanRoleId = roleMap['fan'];
        if (fanRoleId) {
          usersToUpdate.push({
            id: appUser.id,
            updates: { roleSlug: 'fan', roleId: fanRoleId }
          });
        }
      }
    }

    // Update users in batches
    for (const update of usersToUpdate) {
      await base44.asServiceRole.entities.AppUser.update(update.id, update.updates);
    }

    return Response.json({
      status: 'success',
      message: `Synced ${usersToUpdate.length} users with role system`,
      updatedCount: usersToUpdate.length,
      totalUsers: allUsers.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});