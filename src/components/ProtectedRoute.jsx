import React from "react";
import { Navigate } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { checkRouteAccess } from "@/lib/rolePermissions";
import { getRoleSlug } from "@/lib/roleDefinitions";

function normalizeRole(value) {
  return getRoleSlug(value || "fan");
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <ShieldOff className="w-12 h-12 text-muted-foreground mb-4" />

      <h1 className="text-xl font-bold mb-2">
        Kein Zugriff
      </h1>

      <p className="text-sm text-muted-foreground max-w-sm">
        Dieser Bereich ist nur für interne Konten mit passender Rolle freigegeben.
      </p>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  requiredRoute,
  allowedRoles,
  fallbackRoute = "/settings?login=internal",
}) {
    const {
    appUserSnapshot,
    isAuthenticated,
    isLoadingAuth,
  } = useAuth();

  if (isLoadingAuth) return null;

  if (!isAuthenticated || !appUserSnapshot) {
    return <Navigate to={fallbackRoute} replace />;
  }

  const roleToCheck = normalizeRole(appUserSnapshot.roleSlug || appUserSnapshot.role);

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const allowed = allowedRoles.map(normalizeRole);

    if (!allowed.includes(roleToCheck)) {
      return <Navigate to={fallbackRoute} replace />;
    }

    return children;
  }

  const hasAccess = checkRouteAccess(roleToCheck, requiredRoute);

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return children;
}
