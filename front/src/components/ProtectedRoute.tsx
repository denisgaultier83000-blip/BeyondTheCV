import React from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../api/client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
