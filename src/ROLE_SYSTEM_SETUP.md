# Role System Setup Guide

## Overview
A complete role-based access control system with real Base44 database records, permissions, and user assignments.

## Quick Start

### 1. Seed System Roles
Call the `seedRoles` backend function via Admin Dashboard or directly:
```
POST /api/functions/seedRoles
```

This creates the 9 system roles:
- Fan (default)
- Creator
- Fotograf
- Journalist
- Verein (Club)
- Liga (League)
- Moderator
- DataEditor
- Admin

### 2. Sync Existing Users
Call the `syncUserRoles` backend function:
```
POST /api/functions/syncUserRoles
```

This assigns roleId and roleSlug to all existing AppUsers based on their legacy role field.

### 3. Auto-assign Default Role to New Users
When new users register, the `assignDefaultRole` function is triggered to assign the "fan" role automatically.

---

## Database Schema

### Role Entity
```json
{
  "id": "string (auto)",
  "name": "string",
  "slug": "string (unique)",
  "description": "string",
  "isSystemRole": "boolean",
  "permissions": ["string"],
  "created_date": "datetime (auto)",
  "updated_date": "datetime (auto)"
}
```

### AppUser Entity (Updated)
```json
{
  "role": "string (legacy)",
  "roleSlug": "string (primary source of truth)",
  "roleId": "string (linked to Role entity)",
  "linkedClubId": "string (for Verein role)",
  "linkedLeagueId": "string (for Liga role)"
}
```

---

## Roles & Permissions

### Fan
- create_community
- like, comment, share, save, follow

### Creator
- create_community
- like, comment, share, save, follow

### Fotograf (Photographer)
- create_community
- photo_credit
- like, comment, share, save, follow

### Journalist
- create_community, create_news
- like, comment, share, save, follow

### Verein (Club)
- create_community, create_official, create_transfer
- manage_linked_club
- add_stream_link
- like, comment, share, save, follow

### Liga (League)
- create_community, create_official, create_news
- manage_linked_league
- like, comment, share, save, follow

### Moderator
- moderation_access
- manage_reports
- hide_comments, hide_posts
- warn_users

### DataEditor
- data_editor_access
- create_games, edit_games
- update_scores
- edit_stream_links_if_allowed

### Admin
- all_permissions

---

## Implementation Points

### 1. Role Source of Truth
Use `appUser.roleSlug` as the primary source. Example:
```javascript
const roleSlug = appUser.roleSlug || 'fan';
if (roleSlug === 'admin') { /* admin actions */ }
```

### 2. Protected Routes
Update `ProtectedRoute` component to check roleSlug:
```javascript
const hasAccess = appUser.roleSlug 
  ? checkRouteAccess(appUser.roleSlug, requiredRoute)
  : checkRouteAccess(appUser.role, requiredRoute);
```

### 3. Create Menu
`RoleBasedCreateMenu` uses slug-based permissions:
```javascript
const SLUG_PERMISSIONS = {
  'journalist': ['community', 'news'],
  'verein': ['community', 'announcement', 'transfer'],
  // ...
};
```

### 4. Profile Menu
`ProfileMenu` checks slug-based roles to show admin/moderator/dataEditor options:
```javascript
const isUserAdmin = roleSlug ? isAdminBySlug(roleSlug) : isAdmin(appUser?.role);
```

### 5. Admin User Management
New `/admin/users` page allows admins to:
- View all users and their roles
- Change user roles
- Assign linked club/league
- Reset users to Fan role

---

## API Functions

### seedRoles
Creates system roles if missing.
```bash
Admin only
POST /api/functions/seedRoles
```

### syncUserRoles
Links roleId to users based on existing roleSlug.
```bash
Admin only
POST /api/functions/syncUserRoles
```

### assignDefaultRole
Assigns "fan" role to user on first login.
```bash
User auth required
POST /api/functions/assignDefaultRole
```

---

## Migration Path

1. **Deploy Role entity** - creates the new table
2. **Update AppUser** - adds roleSlug and roleId fields
3. **Run seedRoles** - creates 9 system roles
4. **Run syncUserRoles** - assigns roles to existing users
5. **Update code** - ProfileMenu, ProtectedRoute, CreateMenu use slug-based checks
6. **Add /admin/users** - admin role management interface
7. **Monitor** - watch for any legacy role references still in use

---

## Backward Compatibility

- `appUser.role` still exists (legacy field)
- All slug-based functions fall back to role if roleSlug is missing
- Existing role checks continue to work
- Gradual migration path ensures no breakage

---

## Future Enhancements

- [ ] Fine-grained permission model with dynamic checks
- [ ] Role-specific API scopes
- [ ] Audit logging for role changes
- [ ] Custom role creation (beyond system roles)
- [ ] Permission inheritance
- [ ] Role expiration/time-limited roles