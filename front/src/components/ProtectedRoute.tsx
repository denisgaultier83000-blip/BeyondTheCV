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
  }, [location]); // [FIX] On ré-évalue l'utilisateur à chaque changement de page

  if (isLoading) {
    return <LoadingScreen title="Vérification de l'accès..." />;
  }

  const isAuthenticated = !!user && !!localStorage.getItem('token');
  const isAdmin = isAuthenticated && user?.is_admin;

  if (!isAuthenticated) {
    // Si l'utilisateur n'est pas authentifié, on le renvoie vers la page de connexion.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminRoute && !isAdmin) {
    // Si un utilisateur non-admin essaie d'accéder à une route admin, on le redirige vers son dashboard.
    return <Navigate to="/candidate" replace />;
  }

  // [FIX] Si un admin est connecté, il ne doit JAMAIS pouvoir aller sur une route non-admin.
  // On le redirige de force vers son dashboard.
  if (isAdmin && !adminRoute) {
    return <Navigate to="/admin" replace />;
  }

  if (!isAdmin && location.pathname === '/admin') {
    return <Navigate to="/candidate" replace />;
  }

  return children;
};
