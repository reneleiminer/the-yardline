import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

const AppUserContext = createContext(null);

export function AppUserProvider({ children }) {
  const {
    appUserSnapshot,
    isLoadingAuth,
    refreshAuth,
  } = useAuth();

  const value = useMemo(() => ({
    appUser: appUserSnapshot,
    loading: isLoadingAuth,
    updateAppUser: async () => {
      throw new Error("updateAppUser is disabled for internal auth. Use admin data actions instead.");
    },
    refreshAppUser: refreshAuth,
  }), [appUserSnapshot, isLoadingAuth, refreshAuth]);

  return (
    <AppUserContext.Provider value={value}>
      {children}
    </AppUserContext.Provider>
  );
}

export function useAppUser() {
  const context = useContext(AppUserContext);

  if (!context) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }

  return context;
}