import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactElement;
  adminRoute?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminRoute = false }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr && userStr !== 'undefined') {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [location.key]);

  if (isLoading) {
    return <LoadingScreen title="Vérification de l'accès..." />;
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.is_admin;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminRoute && !isAdmin) {
    return <Navigate to="/candidate" replace />;
  }

  if (!adminRoute && isAdmin && location.pathname === '/') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};
