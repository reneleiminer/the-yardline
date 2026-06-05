import { getRoleSlug } from '@/lib/roleDefinitions';

/**
 * Global data utilities for permissions, lookups, and calculations
 */

function getUserRoleSlug(user) {
  return getRoleSlug(user?.roleSlug || user?.role || 'fan');
}

function getManagedClubIds(user) {
  return [
    user?.connectedTeamId,
    user?.linkedClubId,
    user?.connectedClubId,
  ].filter(Boolean);
}

/**
 * Check if user can create content based on role
 */
export const canCreateContent = (user, rolesBySlug) => {
  if (!user) return false;

  const roleSlug = getUserRoleSlug(user);

  if (rolesBySlug) {
    const role =
      rolesBySlug.get(roleSlug) ||
      rolesBySlug.get(user.roleSlug) ||
      rolesBySlug.get(user.role);

    if (!role && roleSlug !== 'admin') return false;
  }

  const creationRoles = [
    'creator',
    'photographer',
    'journalist',
    'official_media',
    'club',
    'league',
    'admin',
  ];

  return creationRoles.includes(roleSlug);
};

/**
 * Check if user can edit post
 */
export const canEditPost = (user, post) => {
  if (!user || !post) return false;

  return user.id === post.authorId || getUserRoleSlug(user) === 'admin';
};

/**
 * Check if user can delete post
 */
export const canDeletePost = (user, post) => {
  if (!user || !post) return false;

  return user.id === post.authorId || getUserRoleSlug(user) === 'admin';
};

/**
 * Check if user is admin
 */
export const isAdmin = (user) => {
  return getUserRoleSlug(user) === 'admin';
};

/**
 * Check if user is moderator
 */
export const isModerator = (user) => {
  const roleSlug = getUserRoleSlug(user);

  return roleSlug === 'moderator' || roleSlug === 'admin';
};

/**
 * Check if user is data editor
 */
export const isDataEditor = (user) => {
  const roleSlug = getUserRoleSlug(user);

  return roleSlug === 'data_editor' || roleSlug === 'admin';
};

/**
 * Check if user manages a league
 */
export const managesLeague = (user, leagueId) => {
  if (!user || !leagueId) return false;

  const roleSlug = getUserRoleSlug(user);

  return roleSlug === 'admin' || (
    roleSlug === 'league' &&
    user.linkedLeagueId === leagueId
  );
};

/**
 * Check if user manages a club/team
 */
export const managesClub = (user, clubId) => {
  if (!user || !clubId) return false;

  const roleSlug = getUserRoleSlug(user);

  return roleSlug === 'admin' || (
    roleSlug === 'club' &&
    getManagedClubIds(user).includes(clubId)
  );
};

/**
 * Filter games by date range
 */
export const filterGamesByDate = (games, type = 'all') => {
  if (!games) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return games.filter(game => {
    const gameDate = new Date(game.date);
    gameDate.setHours(0, 0, 0, 0);

    switch (type) {
      case 'today':
        return gameDate.getTime() === today.getTime();
      case 'upcoming':
        return gameDate > today;
      case 'past':
        return gameDate < today;
      default:
        return true;
    }
  });
};

/**
 * Sort games by date
 */
export const sortGamesByDate = (games, direction = 'asc') => {
  if (!games) return [];

  return [...games].sort((a, b) => {
    const aDate = new Date(a.date);
    const bDate = new Date(b.date);

    return direction === 'asc' ? aDate - bDate : bDate - aDate;
  });
};

/**
 * Get team name by ID
 */
export const getTeamName = (teamId, teamsById) => {
  return teamsById?.get(teamId)?.name || 'Unknown Team';
};

/**
 * Get league name by ID
 */
export const getLeagueName = (leagueId, leaguesById) => {
  return leaguesById?.get(leagueId)?.name || 'Unknown League';
};

/**
 * Get app user by ID
 */
export const getAppUser = (userId, appUsersById) => {
  return appUsersById?.get(userId) || null;
};

/**
 * Get app user by username
 */
export const getAppUserByUsername = (username, appUsersByUsername) => {
  return appUsersByUsername?.get(username) || null;
};

/**
 * Calculate standings from games
 */
export const calculateStandings = (games, teams, leagueId) => {
  if (!games || !teams) return [];

  const standings = {};

  teams.forEach(team => {
    if (team.leagueId === leagueId) {
      standings[team.id] = {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      };
    }
  });

  games
    .filter(game => game.leagueId === leagueId && game.status === 'final')
    .forEach(game => {
      if (!standings[game.homeTeamId] || !standings[game.awayTeamId]) return;

      const homeTeam = standings[game.homeTeamId];
      const awayTeam = standings[game.awayTeamId];

      homeTeam.played++;
      awayTeam.played++;
      homeTeam.goalsFor += game.scoreHome || 0;
      homeTeam.goalsAgainst += game.scoreAway || 0;
      awayTeam.goalsFor += game.scoreAway || 0;
      awayTeam.goalsAgainst += game.scoreHome || 0;

      if ((game.scoreHome || 0) > (game.scoreAway || 0)) {
        homeTeam.won++;
        awayTeam.lost++;
      } else if ((game.scoreHome || 0) < (game.scoreAway || 0)) {
        homeTeam.lost++;
        awayTeam.won++;
      } else {
        homeTeam.drawn++;
        awayTeam.drawn++;
      }
    });

  return Object.values(standings)
    .map(team => ({
      ...team,
      points: team.won * 3 + team.drawn,
      goalDifference: team.goalsFor - team.goalsAgainst,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDifference - a.goalDifference;
    });
};

/**
 * Check if user follows another user
 */
export const isFollowing = (userId, targetUserId, follows) => {
  if (!userId || !targetUserId || !follows) return false;

  return follows.some(follow =>
    follow.followerId === userId &&
    follow.targetId === targetUserId &&
    (!follow.targetType || follow.targetType === 'user')
  );
};

/**
 * Get user's followers count
 */
export const getFollowersCount = (userId, follows) => {
  if (!userId || !follows) return 0;

  return follows.filter(follow =>
    follow.targetId === userId &&
    (!follow.targetType || follow.targetType === 'user')
  ).length;
};

/**
 * Get user's following count
 */
export const getFollowingCount = (userId, follows) => {
  if (!userId || !follows) return 0;

  return follows.filter(follow =>
    follow.followerId === userId &&
    (!follow.targetType || follow.targetType === 'user')
  ).length;
};

/**
 * Get post author details
 */
export const getPostAuthor = (post, appUsersById) => {
  if (!post || !appUsersById) return null;

  return appUsersById.get(post.authorId) || null;
};

/**
 * Check if user has liked post
 */
export const hasLikedPost = (userId, postId, likes) => {
  if (!userId || !postId || !likes) return false;

  return likes.some(like =>
    like.userId === userId &&
    like.postId === postId
  );
};

/**
 * Get post likes count
 */
export const getPostLikesCount = (postId, likes) => {
  if (!postId || !likes) return 0;

  return likes.filter(like => like.postId === postId).length;
};

/**
 * Get post comments
 */
export const getPostComments = (postId, comments) => {
  if (!postId || !comments) return [];

  return comments.filter(comment =>
    comment.postId === postId &&
    !comment.isDeleted
  );
};

/**
 * Sort posts by date (newest first)
 */
export const sortPostsByDate = (posts) => {
  if (!posts) return [];

  return [...posts].sort((a, b) => {
    const aDate = new Date(a.created_date || a.createdAtUtc || 0);
    const bDate = new Date(b.created_date || b.createdAtUtc || 0);

    return bDate - aDate;
  });
};

/**
 * Filter posts by type
 */
export const filterPostsByType = (posts, type) => {
  if (!posts || !type || type === 'all') return posts;

  return posts.filter(post => post.type === type);
};

/**
 * Filter posts by league
 */
export const filterPostsByLeague = (posts, leagueId) => {
  if (!posts || !leagueId) return posts;

  return posts.filter(post => post.leagueId === leagueId);
};

/**
 * Filter posts by followed users
 */
export const filterPostsByFollowed = (posts, userId, follows) => {
  if (!posts || !userId || !follows) return [];

  const followedUserIds = follows
    .filter(follow =>
      follow.followerId === userId &&
      (!follow.targetType || follow.targetType === 'user')
    )
    .map(follow => follow.targetId);

  return posts.filter(post => followedUserIds.includes(post.authorId));
};

/**
 * Get club posts
 */
export const getClubPosts = (clubId, posts) => {
  if (!clubId || !posts) return [];

  return posts.filter(post => post.teamIds?.includes(clubId));
};

/**
 * Get club games
 */
export const getClubGames = (clubId, games) => {
  if (!clubId || !games) return [];

  return games.filter(game =>
    game.homeTeamId === clubId ||
    game.awayTeamId === clubId
  );
};

/**
 * Get club's upcoming games
 */
export const getClubUpcomingGames = (clubId, games) => {
  const clubGames = getClubGames(clubId, games);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return clubGames.filter(game =>
    new Date(game.date) >= today &&
    game.status !== 'final'
  );
};

/**
 * Get club's recent games
 */
export const getClubRecentGames = (clubId, games, limit = 5) => {
  const clubGames = getClubGames(clubId, games);

  return sortGamesByDate(
    clubGames.filter(game => game.status === 'final'),
    'desc'
  ).slice(0, limit);
};