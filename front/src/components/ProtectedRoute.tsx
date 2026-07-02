import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDashboard as useGlobalDashboard } from '../hooks/DashboardContext';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactElement;
  adminRoute?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminRoute = false }) => {
  const { isAuthenticated } = useGlobalDashboard();
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [isAuthenticated, location]);

  if (isLoading) {
    return <LoadingScreen title="Vérification de l'accès..." />;
  }

  const isAdmin = user?.is_admin;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminRoute && !isAdmin) {
    return <Navigate to="/candidate" replace />;
  }

  if (isAdmin && !adminRoute) {
    // Redirect admin from candidate pages to admin dashboard
    if(location.pathname.startsWith('/candidate')) {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};
