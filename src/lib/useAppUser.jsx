import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

const AppUserContext = createContext(null);

export function AppUserProvider({ children }) {
  const {
    appUserSnapshot,
    isLoadingAuth,
    refreshAuth,
    updatePublicUser,
  } = useAuth();

  const value = useMemo(() => ({
    appUser: appUserSnapshot,
    loading: isLoadingAuth,
    updateAppUser: updatePublicUser,
    refreshAppUser: refreshAuth,
  }), [appUserSnapshot, isLoadingAuth, refreshAuth, updatePublicUser]);

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
