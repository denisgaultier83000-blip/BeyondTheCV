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

  // Si un admin est connecté et essaie d'aller sur une page non-admin (comme la racine), on le redirige vers son propre dashboard.
  if (isAdmin && !adminRoute && (location.pathname === '/candidate' || location.pathname === '/')) {
    return <Navigate to="/admin" replace />;
  }

  // Si un utilisateur standard est sur la page d'accueil, on le redirige vers son dashboard.
  if (!isAdmin && (location.pathname === '/' || location.pathname === '/login')) {
    return <Navigate to="/candidate" replace />;
  }

  return children;
};
