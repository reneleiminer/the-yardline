/**
 * Get the appropriate color for a team with proper fallback chain:
 * 1. team.primaryColor
 * 2. league.primaryColor  
 * 3. default Yardline blue
 */
export function getTeamColor(team, league) {
  if (team?.primaryColor) return team.primaryColor;
  if (league?.primaryColor) return league.primaryColor;
  return '#22c5ff'; // Yardline blue
}

/**
 * Apply team color styling with safety checks
 */
export function getTeamColorStyle(team, league, property = 'color') {
  const color = getTeamColor(team, league);
  return { [property]: color };
}

/**
 * Get glow/shadow effect for team color
 */
export function getTeamGlowStyle(team, league) {
  const color = getTeamColor(team, league);
  return {
    boxShadow: `0 0 20px ${color}44, inset 0 0 10px ${color}22`
  };
}