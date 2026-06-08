import React from "react";
import { useLocation } from "react-router-dom";
import MaintenancePage from "./MaintenancePage";

const ADMIN_ALLOWED_PATHS = [
  "/admin",
  "/admin-login",
  "/data-editor",
  "/data-editor-login",
  "/login",
];

function isAdminAllowedPath(pathname) {
  return ADMIN_ALLOWED_PATHS.some((path) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

export default function MaintenanceGate({ children }) {
  const location = useLocation();

  const maintenanceMode =
    String(import.meta.env.VITE_MAINTENANCE_MODE).toLowerCase() === "true";

  if (!maintenanceMode) {
    return children;
  }

  if (isAdminAllowedPath(location.pathname)) {
    return children;
  }

  return <MaintenancePage />;
}
