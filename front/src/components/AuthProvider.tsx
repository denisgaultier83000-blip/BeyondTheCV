import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authenticatedFetch, getToken, removeToken } from '../utils/auth';
import { API_BASE_URL } from '../config';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
  fetchQuotas?: () => Promise<void>; // Make optional if not always present
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = getToken();
      if (token) {
        try {
          // Fetch user profile using the token
          const response = await authenticatedFetch(`${API_BASE_URL}/api/auth/me`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            // Token is invalid or expired
            removeToken();
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Authentication check failed", error);
          removeToken();
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token); // authenticatedFetch will now use this token
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to login page, usually handled in the component calling logout
    window.location.href = '/login';
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  // We render children only when not loading to prevent protected routes from flickering
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};