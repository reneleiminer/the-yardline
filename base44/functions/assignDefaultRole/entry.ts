import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has roleSlug assigned
    const appUser = await base44.entities.AppUser.filter(
      { created_by: user.email },
      '-created_date',
      1
    ).then(results => results[0]);

    if (!appUser) {
      return Response.json({ error: 'AppUser not found' }, { status: 404 });
    }

    if (appUser.roleSlug) {
      return Response.json({
        status: 'already_assigned',
        message: 'User already has a role',
        roleSlug: appUser.roleSlug
      });
    }

    // Get the fan role
    const fanRole = await base44.asServiceRole.entities.Role.filter(
      { slug: 'fan' },
      null,
      1
    ).then(results => results[0]);

    if (!fanRole) {
      return Response.json({ error: 'Fan role not found' }, { status: 500 });
    }

    // Assign fan role to user
    await base44.entities.AppUser.update(appUser.id, {
      roleSlug: 'fan',
      roleId: fanRole.id
    });

    return Response.json({
      status: 'success',
      message: 'Default fan role assigned',
      roleSlug: 'fan',
      roleId: fanRole.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});