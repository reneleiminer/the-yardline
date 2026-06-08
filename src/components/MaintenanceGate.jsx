import React from "react";
import { useLocation } from "react-router-dom";
import MaintenancePage from "./MaintenancePage";

const ALLOWED_DURING_MAINTENANCE = [
  "/settings",
  "/admin-login",
  "/admin",
  "/data-editor",
  "/podcast",
];

function isAllowedDuringMaintenance(pathname) {
  return ALLOWED_DURING_MAINTENANCE.some((path) => {
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

  if (isAllowedDuringMaintenance(location.pathname)) {
    return children;
  }

  return <MaintenancePage />;
}
