import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create AppUser for current user
    const appUsers = await base44.asServiceRole.entities.AppUser.filter({ email: user.email });
    
    let appUser;
    if (appUsers.length === 0) {
      // Create new AppUser with admin role
      appUser = await base44.asServiceRole.entities.AppUser.create({
        email: user.email,
        username: user.email.split('@')[0],
        displayName: user.full_name || user.email,
        roleSlug: 'admin',
      });
    } else {
      appUser = appUsers[0];
      // Update to admin role
      appUser = await base44.asServiceRole.entities.AppUser.update(appUser.id, {
        roleSlug: 'admin',
      });
    }

    return Response.json({
      message: 'Current user set to Admin',
      appUser: {
        id: appUser.id,
        email: appUser.email,
        username: appUser.username,
        roleSlug: appUser.roleSlug,
      },
      base44User: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});