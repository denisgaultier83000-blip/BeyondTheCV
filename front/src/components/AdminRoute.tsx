import React, { ReactNode } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

// [EXPERT] Définition du type pour le contexte reçu de l'Outlet
interface AdminContextType {
  isAdmin: boolean;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  // [FIX] On utilise useOutletContext pour récupérer le statut isAdmin directement depuis App.tsx
  const { isAdmin } = useOutletContext<AdminContextType>();

  // Le statut isAdmin est maintenant directement disponible et fiable.
  // Le chargement est géré en amont dans App.tsx.

  // If the user is not an admin, redirect them.
  if (!isAdmin) {
    return <Navigate to="/candidate" replace />;
  }

  // If the user is an admin, render the requested component.
  return <>{children}</>;
};