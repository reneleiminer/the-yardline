/**
 * Hybrid feed ranking system for The Yardline
 * Combines sports relevance + social engagement
 */

export function rankFeedPosts(posts, games, selectedLeague, followedUserIds = []) {
  const now = new Date();
  
  // Filter by league if selected
  let filtered = posts;
  if (selectedLeague) {
    filtered = posts.filter(p => {
      const postLeagueMatch = p.leagueId === selectedLeague;
      const postTeamMatch = p.teamIds?.some(tid => {
        // Would need team->league mapping, using leagueId for now
        return p.leagueId === selectedLeague;
      });
      return postLeagueMatch || postTeamMatch;
    });
  }

  // Score each post
  const scored = filtered.map(post => {
    let score = 0;
    const createdDate = new Date(post.created_date);
    const hoursOld = (now - createdDate) / (1000 * 60 * 60);

    // 1. Featured official news (highest priority)
    if (post.featured) score += 10000;
    if (post.type === 'news') score += 5000;

    // 2. Live/active games (checked by game status)
    const hasLiveGame = games?.some(g => 
      g.status === 'live' && 
      (post.teamIds?.includes(g.homeTeamId) || post.teamIds?.includes(g.awayTeamId))
    );
    if (hasLiveGame) score += 8000;

    // 3. Recent posts from followed accounts
    if (followedUserIds.includes(post.authorId)) score += 3000;

    // 4. Engagement-based ranking
    const engagement = (post.likesCount || 0) + (post.commentsCount || 0) * 2;
    score += engagement * 50;

    // 5. Recency (decay over time, but don't bury old content)
    score += Math.max(0, 1000 - hoursOld * 10);

    // 6. Content type diversity bonus
    if (post.type === 'highlight') score += 500;
    if (post.images?.length > 0) score += 200;

    return { ...post, _score: score };
  });

  // Sort by score descending
  return scored.sort((a, b) => b._score - a._score).map(p => {
    // Remove scoring metadata before returning
    const { _score, ...clean } = p;
    return clean;
  });
}

export function filterNewsOnly(posts) {
  // Official news from journalists and clubs
  return posts.filter(p => 
    (p.type === 'news' || p.type === 'analysis') &&
    (p.authorRole === 'Journalist' || p.authorRole === 'Verein')
  );
}

export function filterCommunityOnly(posts) {
  // Fan/creator posts, club community, photographer images
  return posts.filter(p => 
    ['community', 'highlight', 'photo'].includes(p.type) ||
    (p.authorRole === 'Fan' || p.authorRole === 'Creator' || p.authorRole === 'Fotograf' || p.authorRole === 'Verein')
  ).filter(p => p.type !== 'news'); // exclude official news
}

export function filterFollowingOnly(posts, followedUserIds) {
  return posts.filter(p => followedUserIds.includes(p.authorId));
}

export function applyLeagueFilter(items, selectedLeague, leagueIdField = 'leagueId', teamIdsField = 'teamIds') {
  if (!selectedLeague) return items;
  
  return items.filter(item => 
    item[leagueIdField] === selectedLeague ||
    (Array.isArray(item[teamIdsField]) && item[teamIdsField].some(id => id === selectedLeague))
  );
}