import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useDashboard } from './DashboardContext';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, cvData } = useDashboard();

  // While the context is loading the user data, we can show a loader.
  if (cvData === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 className="spin" size={32} /></div>;
  }

  // If the user is not an admin, redirect them.
  if (!isAdmin) {
    return <Navigate to="/candidate" replace />;
  }

  // If the user is an admin, render the requested component.
  return <>{children}</>;
};