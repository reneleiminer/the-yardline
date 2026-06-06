import { useEffect } from 'react';
import { useHeaderConfig } from '@/lib/HeaderContext';

/**
 * Call this hook in a page to set a custom header config.
 * Automatically resets to default on unmount.
 *
 * Usage:
 *   useSetHeader({ mode: 'back', title: 'Profil' })
 *   useSetHeader({ mode: 'game', game, home, away })
 *   useSetHeader({ mode: 'league', league })
 */
export default function useSetHeader(config) {
  const { setHeader, resetHeader } = useHeaderConfig();

  useEffect(() => {
    if (config) setHeader(config);
    return () => resetHeader();
  }, [JSON.stringify(config)]);
}
