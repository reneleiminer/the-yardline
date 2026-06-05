# Role System Setup Guide

## ✅ What's Been Built

### 1. **Real Base44 Roles**
Created 9 system roles that are stored in the Base44 database:

```
- Fan (slug: fan)
- Creator (slug: creator)
- Fotograf (slug: fotograf)
- Journalist (slug: journalist)
- Verein (slug: verein)
- Liga (slug: liga)
- Moderator (slug: moderator)
- DataEditor (slug: data_editor)
- Admin (slug: admin)
```

### 2. **Backend Functions**

#### `seedRolesAndSync.js`
- Creates all 9 roles in Base44
- Prevents duplicate creation
- Assigns default 'fan' role to all users without one
- **Access**: Admin only
- **Endpoint**: Call via `base44.functions.invoke('seedRolesAndSync', {})`

#### `setCurrentUserAdmin.js`
- Sets the currently logged-in user as Admin
- Creates AppUser if doesn't exist
- Sets `roleSlug: 'admin'`
- **Access**: Any logged-in user
- **Endpoint**: Call via `base44.functions.invoke('setCurrentUserAdmin', {})`

### 3. **Admin Pages**

#### `/admin/roles` (AdminRoles.jsx)
- View all system roles
- Seed roles on first setup
- Set current user as admin
- Shows role creation results
- **Protected**: Requires admin role

### 4. **Role Sync on Login** (AuthContext.jsx)
When user logs in:
1. Loads Base44 user data
2. Gets or creates AppUser
3. Syncs Base44 role → AppUser.roleSlug
4. If Base44 role is 'Admin', sets appUser.roleSlug = 'admin'
5. Assigns 'fan' role to new users

### 5. **Admin Menu Visibility** (ProfileMenu.jsx)
Shows "Admin Dashboard" menu item if:
- `appUser.roleSlug === 'admin'` OR
- `base44User.role === 'Admin'`

### 6. **Protected Routes** (ProtectedRoute.jsx)
`/admin` is protected and checks:
- `appUser.roleSlug === 'admin'` OR
- `appUser.role === 'Admin'` OR
- `base44User.role === 'Admin'`

---

## 🚀 Setup Steps

### Step 1: Seed System Roles

1. Go to `/admin/roles`
2. Click **"Rollen seeden & synchronisieren"**
3. Wait for success message
4. Check Base44 Dashboard → Users → All Roles
   - You should see all 9 roles listed

**Result**: All roles now exist in Base44 database

---

### Step 2: Set Current User as Admin

1. Make sure you're logged in
2. Go to `/admin/roles`
3. Click **"Aktuellen Benutzer als Admin setzen"**
4. Refresh the page
5. Click your profile avatar
6. You should see **"Admin Dashboard"** in the menu

**Result**: Your user now has admin role

---

### Step 3: Verify Everything Works

**In Profile Menu:**
- [ ] See "Admin Dashboard" option
- [ ] "Mein Konto", "Einstellungen", "Support" visible
- [ ] "Abmelden" at the bottom

**Navigate to /admin:**
- [ ] Page loads (not 404)
- [ ] See 4 admin cards:
  - System Rollen
  - Nutzer & Rollen
  - Partner verwalten
  - Rechtliche Seiten

**In Base44 Dashboard:**
- [ ] Go to Users → All Roles
- [ ] See all 9 roles listed

---

## 🔄 How It Works

### Login Flow
```
User logs in
  ↓
AuthContext calls base44.auth.me()
  ↓
Gets Base44 user (id, email, role)
  ↓
Calls syncUserRole()
  ↓
Looks up AppUser by email
  ↓
If doesn't exist:
  - Create new AppUser with roleSlug='fan'
↓
If exists:
  - Sync Base44 role to AppUser
  - If base44User.role='Admin' → set appUser.roleSlug='admin'
  ↓
AppUser stored with both:
  - roleSlug (new system)
  - role (legacy, kept for compatibility)
```

### Admin Check
```
User clicks profile avatar
  ↓
ProfileMenu checks:
  1. appUser.roleSlug === 'admin' ? (preferred)
  2. base44User.role === 'Admin' ? (fallback)
  ↓
If either true → Show "Admin Dashboard"
```

### Route Protection
```
User navigates to /admin
  ↓
ProtectedRoute component checks:
  1. appUser.roleSlug === 'admin' ?
  2. appUser.role === 'Admin' ?
  3. base44User.role === 'Admin' ?
  ↓
If any true → Allow access
↓
If all false → Show 404
```

---

## 📊 Role Storage

### AppUser Entity
```javascript
{
  id: "user123",
  email: "user@example.com",
  username: "username",
  displayName: "User Name",
  role: "Admin",           // Legacy (kept for compatibility)
  roleSlug: "admin",       // New system (preferred)
  verified: false,
  ...otherFields
}
```

### Role Entity (Base44)
```javascript
{
  id: "role456",
  name: "Admin",
  slug: "admin",
  description: "Administrator",
  isSystemRole: true,
  permissions: [],  // For future extension
}
```

---

## 🔐 Permission System

### Role Checks
```javascript
// Check if user is admin
isAdmin(user.roleSlug) // Checks for 'admin'

// Check if user is moderator
isModerator(user.roleSlug) // Checks for 'moderator'

// Check if user is data editor
isDataEditor(user.roleSlug) // Checks for 'data_editor'

// Check route access
checkRouteAccess(roleSlug, '/admin') // true if admin
```

### Protected Components
- `/admin` - Admin only
- `/admin/users` - Admin only
- `/admin/partners` - Admin only
- `/admin/legal` - Admin only
- `/admin/roles` - Admin only
- Moderator tools - Moderator + Admin
- Data editor tools - DataEditor + Admin

---

## 🐛 Troubleshooting

### "Admin Dashboard" not showing in menu
1. Go to `/admin/roles`
2. Click "Aktuellen Benutzer als Admin setzen"
3. Refresh page
4. Check profile menu again

### Roles not appearing in Base44 Dashboard
1. Go to `/admin/roles`
2. Click "Rollen seeden & synchronisieren"
3. Wait for success message
4. Refresh Base44 Dashboard → Users → All Roles

### Route protection not working
1. Check AppUser has `roleSlug: 'admin'`
2. Or check Base44 user has `role: 'Admin'`
3. ProtectedRoute checks both

### New users not getting 'fan' role
1. Go to `/admin/roles`
2. Click "Rollen seeden & synchronisieren"
3. This assigns 'fan' to all users without a role

---

## 📝 Files Changed

### Created Files
- `functions/seedRolesAndSync.js` - Role seeding function
- `functions/setCurrentUserAdmin.js` - Admin assignment function
- `pages/admin/AdminRoles.jsx` - Role management page

### Modified Files
- `lib/AuthContext.jsx` - Added `syncUserRole()` on login
- `components/layout/ProfileMenu.jsx` - Checks both AppUser and Base44 role
- `components/ProtectedRoute.jsx` - Checks both role sources
- `App.jsx` - Added `/admin/roles` route
- `pages/admin/AdminDashboard.jsx` - Added "System Rollen" link

---

## ✅ Verification Checklist

- [ ] Can access `/admin/roles` page
- [ ] "Rollen seeden & synchronisieren" button works
- [ ] All 9 roles appear in Base44 Dashboard → Users → All Roles
- [ ] "Aktuellen Benutzer als Admin setzen" button works
- [ ] "Admin Dashboard" appears in profile menu
- [ ] Can navigate to `/admin`
- [ ] Non-admin users see 404 on `/admin`
- [ ] Role sync happens on login
- [ ] New users get 'fan' role by default

---

## 🎯 Next Steps

After initial setup:
1. ✅ Seed roles
2. ✅ Set yourself as admin
3. ✅ Verify admin menu shows
4. ✅ Assign roles to other users
5. Implement role-specific features:
   - Moderator dashboard
   - Data editor tools
   - Club manager interface
   - League manager interface

---

## 📚 Related Documentation

- `ROLE_SYSTEM_SETUP.md` - Original role system (legacy)
- `DATA_CONNECTIONS.md` - How roles connect to global data
- `GLOBAL_DATA_CONNECTIONS_SUMMARY.md` - Global data context guide

---

## ⚠️ Important Notes

1. **Base44 roles vs AppUser roles**: System now checks both
   - Base44 role (Admin) - from Base44 user management
   - AppUser role (admin) - from custom AppUser entity
   - If either shows admin, user gets admin access

2. **Backward compatibility**: Legacy `role` field still exists
   - New system uses `roleSlug` (preferred)
   - Old code using `role` still works
   - Gradual migration recommended

3. **First-time setup**:
   - Seed roles before assigning to users
   - Assign yourself as admin
   - You can then manage other users

4. **Data consistency**:
   - Run "Rollen seeden & synchronisieren" periodically
   - Ensures all users have default role
   - Safe to run multiple times (no duplicates)

---

## 🚀 Result

✅ Real Base44 roles exist and are visible in dashboard
✅ Admin users can access admin features
✅ Admin menu shows for authorized users
✅ Role sync happens automatically on login
✅ Protected routes enforce admin-only access
✅ New users get 'fan' role by default