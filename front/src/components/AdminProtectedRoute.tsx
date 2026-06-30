import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  role?: string;
}

export const AdminProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  try {
    const decodedToken: DecodedToken = jwtDecode(token);
    if (decodedToken.role === 'admin') {
      return children;
    }
  } catch (error) {
    console.error("Invalid token:", error);
  }

  return <Navigate to="/" replace />; // Redirect non-admins to the home page
};