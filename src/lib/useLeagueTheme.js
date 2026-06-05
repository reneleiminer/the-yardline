/**
 * Returns inline style helpers derived from a league or team's primaryColor.
 * All effects are subtle – the dark UI is always preserved.
 */
export function useLeagueTheme(primaryColor) {
  const color = primaryColor || null;

  if (!color) {
    return {
      color,
      borderLeft: {},
      glowBg: {},
      gradientHeader: {},
      activeTab: {},
      activeTabUnderline: {},
      primaryBtn: {},
      liveBadge: {},
      liveGlow: {},
      groupTabActive: {},
      accentText: {},
    };
  }

  // Helper: hex → "r, g, b" string for rgba()
  const toRgb = (hex) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return `${r}, ${g}, ${b}`;
  };

  const rgb = toRgb(color);
  if (!rgb) {
    return {
      color: null,
      borderLeft: {},
      glowBg: {},
      gradientHeader: {},
      activeTab: {},
      activeTabUnderline: {},
      primaryBtn: {},
      liveBadge: {},
      liveGlow: {},
      groupTabActive: {},
      accentText: {},
    };
  }

  return {
    color,
    // League list card: left accent border
    borderLeft: {
      borderLeft: `3px solid ${color}`,
    },
    // League list card: subtle glow background
    glowBg: {
      background: `rgba(${rgb}, 0.06)`,
    },
    // Header banner gradient overlay
    gradientHeader: {
      background: `linear-gradient(to right, rgba(${rgb}, 0.18) 0%, transparent 70%)`,
    },
    // Active tab text color
    activeTab: {
      color,
    },
    // Active tab underline
    activeTabUnderline: {
      backgroundColor: color,
    },
    // Primary follow/action button
    primaryBtn: {
      background: `linear-gradient(135deg, ${color} 0%, rgba(${rgb}, 0.75) 100%)`,
      borderColor: color,
      color: '#ffffff',
      boxShadow: `0 0 12px rgba(${rgb}, 0.25)`,
    },
    // LIVE badge
    liveBadge: {
      color,
      backgroundColor: `rgba(${rgb}, 0.12)`,
    },
    liveDot: {
      backgroundColor: color,
    },
    // Card glow for live games
    liveGlow: {
      borderColor: `rgba(${rgb}, 0.4)`,
      boxShadow: `0 0 16px rgba(${rgb}, 0.08)`,
    },
    // Group/conference tab active pill
    groupTabActive: {
      backgroundColor: color,
      color: '#ffffff',
    },
    // Generic accent text
    accentText: {
      color,
    },
  };
}