import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export function useGameStatusAutoCheck() {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkGameStatus = async () => {
      try {
        console.log('[FRONTEND] Invoking checkAndUpdateGameStatus...');
        const result = await base44.functions.invoke('checkAndUpdateGameStatus', {});
        console.log('[FRONTEND] Result:', result?.data);
        
        if (result?.data?.updated > 0) {
          console.log(`[FRONTEND] ✓ ${result.data.updated} games updated, invalidating queries`);
          await queryClient.invalidateQueries({ queryKey: ['games'] });
          await queryClient.invalidateQueries({ queryKey: ['game'] });
        }
      } catch (error) {
        console.error('[FRONTEND] Game status check failed:', error);
      }
    };

    // Initial check on mount
    console.log('[FRONTEND] useGameStatusAutoCheck mounted, running initial check');
    checkGameStatus();

    // Set up 30-second interval for continuous checking
    intervalRef.current = setInterval(checkGameStatus, 30000);
    console.log('[FRONTEND] Auto-check interval set to 30 seconds');

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('[FRONTEND] Auto-check interval cleared');
      }
    };
  }, [queryClient]);
}