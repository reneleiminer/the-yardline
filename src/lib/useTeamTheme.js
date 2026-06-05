import { useMemo } from 'react';

export function useTeamTheme(teamPrimaryColor, leaguePrimaryColor) {
  return useMemo(() => {
    const color = teamPrimaryColor || leaguePrimaryColor;
    
    if (!color) {
      // Default Yardline blue
      return {
        color: null,
        rgb: 'rgb(34, 197, 255)',
        accentText: { color: '#22c5ff' },
        liveGlow: {},
        borderGlow: 'border-primary/20'
      };
    }

    return {
      color,
      rgb: color,
      accentText: { color },
      liveGlow: {
        boxShadow: `inset 0 0 20px ${color}33, 0 0 20px ${color}22`
      },
      borderGlow: `border-[${color}]/30`
    };
  }, [teamPrimaryColor, leaguePrimaryColor]);
}