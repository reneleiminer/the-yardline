# Global Data Connections Architecture

## Overview
Every page is connected to real entity data via the GlobalDataContext. No static or demo data.

## Global Data Sources

### Fetched via GlobalDataProvider
- **leagues**: All League records
- **teams**: All Team records  
- **games**: All Game records
- **posts**: All Post records
- **appUsers**: All AppUser records
- **follows**: All Follow relationships
- **likes**: All Like records
- **comments**: All Comment records
- **clubs**: All Club records
- **roles**: All Role records
- **legalPages**: All LegalPage records
- **notifications**: All Notification records
- **partners**: All Partner records
- **tournaments**: All Tournament records

### Lookup Maps (O(1) access)
- `leaguesById`: Map<id, League>
- `teamsById`: Map<id, Team>
- `gamesById`: Map<id, Game>
- `postsById`: Map<id, Post>
- `appUsersById`: Map<id, AppUser>
- `appUsersByUsername`: Map<username, AppUser>
- `clubsById`: Map<id, Club>
- `rolesById`: Map<id, Role>
- `rolesBySlug`: Map<slug, Role>

## Page Connections

### Home (/home)
**Data Used:**
- leagues (league filter)
- games (games strip)
- posts (feed)
- appUsers (author info)
- likes (user's liked posts)
- follows (user's following list)
- comments (post counts)

**Logic:**
```javascript
- League filter affects: hero announcement, games, feed
- Hero post: featured official/news post
- Feed tabs:
  * Alle: all posts sorted newest first
  * Folge ich: posts from followed users
  * News: type === 'news'
  * Community: type === 'community'
  * Transfers: type === 'transfer'
- Sorted newest first
```

**Key Functions:**
- `filterPostsByType(posts, type)`
- `filterPostsByFollowed(posts, userId, follows, appUsersById)`
- `getPostLikesCount(postId, likes)`

---

### Spiele (/spiele)
**Data Used:**
- games
- teams
- leagues

**Logic:**
```javascript
- Tabs: Letzte 7 Tage, Heute, Nächste 7 Tage
- Grouped by date
- Game status: scheduled, live, final
- Live games: show LIVE indicator with animated pulse
- Final games: show score
```

**Key Functions:**
- `filterGamesByDate(games, 'today'|'upcoming'|'past')`
- `sortGamesByDate(games, 'asc'|'desc')`
- `getTeamName(teamId, teamsById)`

---

### Tabellen (/tabellen)
**Data Used:**
- leagues
- teams
- games
- clubs

**Logic:**
```javascript
- Show league cards sorted by sortOrder
- Click league → /tabellen/:leagueId
- Standings calculated from games where status === 'final'
- If league has groups: show group tabs
- Points: Win=3, Draw=1, Loss=0
- Sort by: points DESC, goalDifference DESC
```

**Key Functions:**
- `calculateStandings(games, teams, leagueId)`

---

### Tabellen Detail (/tabellen/:leagueId)
**Data Used:**
- leagues
- teams
- games
- clubs (for standings row data)

**Logic:**
```javascript
- Fetch league by id
- Get teams where leagueId matches
- Calculate standings from final games
- If league has groups: show tabs for each group
```

---

### Spiele Detail (planned)
**Data Used:**
- games
- teams
- appUsers (streamer info)

**Logic:**
```javascript
- Click game card → /spiele/:gameId
- Show full game details
- Live score updates if status === 'live'
- Stream link if streamUrl exists
```

---

### Turniere (/turniere)
**Data Used:**
- tournaments
- teams
- clubs

**Logic:**
```javascript
- Show tournament cards
- Click → see bracket
- Bracket games link to /spiele/:gameId
- Status: upcoming, active, completed
```

---

### Create (/create)
**Data Used:**
- appUser
- roles

**Logic:**
```javascript
- Check user's roleSlug
- Show only allowed content types:
  * Fan → can create community posts
  * Creator → posts + photos
  * Fotograf → photos with permissions
  * Journalist → news articles
  * Verein → announcements
  * Liga → announcements
  * Admin → all

- Routes:
  * /create/community → posts type community
  * /create/news → posts type news
  * /create/announcement → posts type official
  * /create/transfer → posts type transfer

- On publish:
  * Create Post record
  * Refetch posts cache
  * Navigate to /post/:id
```

---

### Post Detail (/post/:id)
**Data Used:**
- posts
- appUsers (author)
- comments (post comments)
- likes (post likes)

**Logic:**
```javascript
- Fetch post by id
- Get author from appUsers
- Load comments for this post
- Show like button with count
- Comments can be added if authenticated
```

---

### Profile (/profile)
**Own Profile:**
```javascript
- Show current appUser
- Posts where authorId === user.id
- Edit button visible
- Role badge from roles
```

**Other Profile (/profile/:username):**
```javascript
- Fetch appUser by username
- Posts where authorId === user.id
- Follow button visible (unless own profile)
- Shows followers/following counts from follows
```

**Data Used:**
- appUsers
- posts
- follows
- roles

**Key Functions:**
- `getAppUserByUsername(username, appUsersByUsername)`
- `getFollowersCount(userId, follows)`
- `getFollowingCount(userId, follows)`
- `isFollowing(userId, targetId, follows)`

---

### Klub (/club/:clubId)
**Data Used:**
- clubs
- leagues
- teams
- games
- posts
- appUsers (club manager)

**Logic:**
```javascript
- Fetch club by id
- Get league from leagueId
- Get games where homeTeamId === clubId || awayTeamId === clubId
- Get posts where teamIds includes clubId
- Show roster and coaches from club.roster/coaches
- Style with club.primaryColor, secondaryColor
- Club manager (managerId) can edit
```

**Tabs:**
1. Posts (posts filtered by teamIds)
2. Games (games where club participates)
3. Roster (from club.roster array)
4. Coaches (from club.coaches array)
5. Info (club description, socials, partners)

**Key Functions:**
- `getClubGames(clubId, games)`
- `getClubPosts(clubId, posts)`
- `getClubUpcomingGames(clubId, games)`
- `getClubRecentGames(clubId, games, limit)`
- `managesClub(user, clubId)`

---

### League (/league/:leagueId)
**Data Used:**
- leagues
- clubs
- teams
- games
- posts
- appUsers (league manager)

**Logic:**
```javascript
- Fetch league by id
- Get teams where leagueId matches
- Get games where leagueId matches
- Get posts where leagueId matches or mentions league
- Style with league.primaryColor, secondaryColor
- League manager (managerId) can edit
```

**Tabs:**
1. Overview (hero + stats)
2. Posts (posts linked to league)
3. Games (games in league)
4. Teams (teams in league)
5. Info (league description, socials, partners)

**Key Functions:**
- `managesLeague(user, leagueId)`

---

### Settings (/settings)
**Data Used:**
- appUser (profile)
- roles (role display)
- legalPages (links)
- notifications (user's notification count)

**Logic:**
```javascript
- Edit appUser: username, displayName, bio, avatar, banner
- Check username uniqueness
- Request role upgrade (only for 'fan' role)
- View notification settings
- View saved posts
- View legal pages
```

---

### Admin Dashboard (/admin)
**Data Used:**
- appUsers
- roles
- posts
- games
- leagues
- teams
- clubs
- partners
- legalPages
- notifications (unread count)

**Logic:**
```javascript
- Navigation to:
  * /admin/users → AppUser list + role management
  * /admin/partners → Partner management
  * /admin/legal → LegalPage management

- All changes update public pages immediately
- Actions are logged (if audit log exists)
```

**Permission Check:**
```javascript
if (user.roleSlug !== 'admin') redirect('/');
```

---

### Admin Users (/admin/users)
**Data Used:**
- appUsers
- roles
- roleApplications
- follows (follower counts)
- posts (post counts)

**Logic:**
```javascript
- Show user list with: avatar, username, role, status
- Click user → edit role, view posts, manage follows
- Review role applications
- Approve/reject with notes
```

---

### Admin Partners (/admin/partners)
**Data Used:**
- partners

**Logic:**
```javascript
- List all partners
- Add/edit/delete partner
- Upload logoUrl
- Set sortOrder
- Changes visible in footer immediately
```

---

### Admin Legal (/admin/legal)
**Data Used:**
- legalPages

**Logic:**
```javascript
- Edit pages: Impressum, Datenschutz, Nutzungsbedingungen, Community Guidelines
- Save changes
- Public pages update immediately
```

---

### Footer
**Data Used:**
- partners (sorted by sortOrder)
- legalPages

**Logic:**
```javascript
- Display partner logos with links
- Display legal page links
- All links point to correct routes
```

---

### ProtectedRoute
**Logic:**
```javascript
const ProtectedRoute = ({ children, requiredRoute }) => {
  const { user } = useAuth();

  if (!user) {
    return <LoginRequired />;
  }

  // Route-specific checks
  if (requiredRoute === '/admin' && user.roleSlug !== 'admin') {
    return <AccessDenied />;
  }

  if (requiredRoute === '/create/announcement' && !['verein', 'liga', 'admin'].includes(user.roleSlug)) {
    return <AccessDenied />;
  }

  return children;
};
```

---

## Permission Rules

### Content Creation
- **Fan**: can create community posts
- **Creator**: posts, photos, highlights
- **Fotograf**: photos with usage permissions
- **Journalist**: news articles
- **Verein**: announcements about club
- **Liga**: announcements about league
- **Moderator**: moderation only
- **DataEditor**: score/standings edit (assigned leagues/teams only)
- **Admin**: everything

### Data Editing
- **Author**: can edit own posts/comments
- **Club Manager**: can edit linked club data
- **League Manager**: can edit linked league data
- **DataEditor**: can edit assigned games/standings
- **Admin**: can edit everything

### Data Deletion
- **Author**: can delete own posts/comments
- **Moderator**: can delete any post/comment (with reason)
- **Admin**: can delete anything

### Management Pages
- **Admin**: /admin dashboard
- **Club Manager**: edit club /club/:id (if linkedClubId matches)
- **League Manager**: edit league /league/:id (if linkedLeagueId matches)
- **DataEditor**: edit assigned league/team games

---

## Cache Rules

### Stale Times
- Leagues: 5 minutes
- Teams: 5 minutes
- Games: 2 minutes (update frequently)
- Posts: 1 minute (update frequently)
- AppUsers: 5 minutes
- Follows: 2 minutes
- Likes: 1 minute
- Comments: 1 minute
- Clubs: 5 minutes
- Roles: 10 minutes
- Legal Pages: 30 minutes
- Notifications: 1 minute
- Tournaments: 5 minutes
- Partners: 5 minutes

### Cache Size
- GC Time: 30 minutes (keep 30 min after stale)
- Legal Pages: 60 minutes

### Refetch Strategy
```javascript
// On navigate: don't clear cache, use stale data instantly
// On mutation: invalidate specific entity type
// User manually refreshes: force fresh fetch
```

---

## Lookup Usage Examples

```javascript
// Get league by id - O(1)
const league = leaguesById.get(leagueId);

// Get team name by id
const teamName = teamsById.get(teamId)?.name;

// Get app user by username
const user = appUsersByUsername.get('john_doe');

// Get role by slug
const role = rolesBySlug.get('admin');
```

---

## Testing Checklist

- [ ] Home: league filter affects feed, games, hero
- [ ] Home: follows tab shows only followed user posts
- [ ] Spiele: games grouped by date and filtered by tab
- [ ] Tabellen: clicking league shows standings
- [ ] Standings calculated correctly from final games
- [ ] Club page shows club games, posts, roster
- [ ] League page shows league games, teams, posts
- [ ] Profile shows user's posts and followers
- [ ] Create menu shows only allowed content types
- [ ] Admin dashboard accessible only to admin
- [ ] All user avatars/names are clickable
- [ ] All team/league links work
- [ ] Footer partners and legal links work
- [ ] No console errors for missing data
- [ ] Cache invalidates on data mutations