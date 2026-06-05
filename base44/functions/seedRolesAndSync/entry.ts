import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Role definitions
const ROLES = [
  { name: 'Fan', slug: 'fan', description: 'Community member' },
  { name: 'Creator', slug: 'creator', description: 'Content creator' },
  { name: 'Fotograf', slug: 'fotograf', description: 'Photographer' },
  { name: 'Journalist', slug: 'journalist', description: 'Journalist' },
  { name: 'Verein', slug: 'verein', description: 'Club/Team' },
  { name: 'Liga', slug: 'liga', description: 'League' },
  { name: 'Moderator', slug: 'moderator', description: 'Content moderator' },
  { name: 'DataEditor', slug: 'data_editor', description: 'Data editor' },
  { name: 'Admin', slug: 'admin', description: 'Administrator' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can seed roles
    if (user.role !== 'Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      created: [],
      exists: [],
      updated: [],
      errors: [],
    };

    // 1. Seed all roles
    for (const roleData of ROLES) {
      try {
        const existing = await base44.asServiceRole.entities.Role.filter({ slug: roleData.slug });
        
        if (existing.length === 0) {
          const created = await base44.asServiceRole.entities.Role.create({
            name: roleData.name,
            slug: roleData.slug,
            description: roleData.description,
            isSystemRole: true,
            permissions: [],
          });
          results.created.push(created);
        } else {
          results.exists.push(existing[0]);
        }
      } catch (error) {
        results.errors.push({ slug: roleData.slug, error: error.message });
      }
    }

    // 2. Get all AppUsers
    const appUsers = await base44.asServiceRole.entities.AppUser.list();

    // 3. Sync user roles and assign default role to users without one
    for (const appUser of appUsers) {
      try {
        // If user has no roleSlug, assign Fan role
        if (!appUser.roleSlug) {
          await base44.asServiceRole.entities.AppUser.update(appUser.id, {
            roleSlug: 'fan',
          });
          results.updated.push({ userId: appUser.id, roleSlug: 'fan' });
        }
      } catch (error) {
        results.errors.push({ userId: appUser.id, error: error.message });
      }
    }

    return Response.json({
      message: 'Roles seeded and synced successfully',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});