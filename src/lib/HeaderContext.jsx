import React, { createContext, useContext, useState, useCallback } from 'react';

const HeaderContext = createContext(null);

/**
 * Header modes:
 * - 'default'  → Logo + Bell + Avatar (Home, Spiele, Tabellen…)
 * - 'game'     → Team logos + score + status
 * - 'league'   → League logo + name + subtitle
 * - 'back'     → Back button + title (Profile, PostDetail…)
 */

export function HeaderProvider({ children }) {
  const [config, setConfig] = useState({ mode: 'default' });

  const setHeader = useCallback((cfg) => {
    setConfig(cfg || { mode: 'default' });
  }, []);

  const resetHeader = useCallback(() => {
    setConfig({ mode: 'default' });
  }, []);

  return (
    <HeaderContext.Provider value={{ config, setHeader, resetHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderConfig() {
  return useContext(HeaderContext);
}