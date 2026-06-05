import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYSTEM_ROLES = [
  {
    name: 'Fan',
    slug: 'fan',
    description: 'Community member who can engage with content',
    permissions: ['create_community', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Creator',
    slug: 'creator',
    description: 'Content creator with basic publishing rights',
    permissions: ['create_community', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Fotograf',
    slug: 'fotograf',
    description: 'Photographer with photo credit management',
    permissions: ['create_community', 'photo_credit', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Journalist',
    slug: 'journalist',
    description: 'Journalist with news publishing rights',
    permissions: ['create_community', 'create_news', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Verein',
    slug: 'verein',
    description: 'Club official with club management rights',
    permissions: ['create_community', 'create_official', 'create_transfer', 'manage_linked_club', 'add_stream_link', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Liga',
    slug: 'liga',
    description: 'League official with league management rights',
    permissions: ['create_community', 'create_official', 'create_news', 'manage_linked_league', 'like', 'comment', 'share', 'save', 'follow']
  },
  {
    name: 'Moderator',
    slug: 'moderator',
    description: 'Moderator with content management rights',
    permissions: ['moderation_access', 'manage_reports', 'hide_comments', 'hide_posts', 'warn_users']
  },
  {
    name: 'DataEditor',
    slug: 'data_editor',
    description: 'Data editor with game and score management',
    permissions: ['data_editor_access', 'create_games', 'edit_games', 'update_scores', 'edit_stream_links_if_allowed']
  },
  {
    name: 'Media',
    slug: 'media_partner',
    description: 'Media partner account that selects the Game of the Week',
    permissions: ['game_of_week_access', 'select_game_of_the_week']
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'System administrator with all permissions',
    permissions: ['all_permissions']
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check existing roles
    const existingRoles = await base44.asServiceRole.entities.Role.list();
    const existingSlugs = new Set(existingRoles.map(r => r.slug));

    const rolesToCreate = SYSTEM_ROLES.filter(role => !existingSlugs.has(role.slug));

    if (rolesToCreate.length === 0) {
      return Response.json({
        status: 'success',
        message: 'All system roles already exist',
        rolesCount: existingRoles.length
      });
    }

    // Create missing roles
    const created = await base44.asServiceRole.entities.Role.bulkCreate(
      rolesToCreate.map(role => ({
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystemRole: true,
        permissions: role.permissions
      }))
    );

    return Response.json({
      status: 'success',
      message: `Created ${created.length} system roles`,
      createdCount: created.length,
      totalRoles: existingRoles.length + created.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
