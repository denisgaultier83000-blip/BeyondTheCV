import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminDashboard } from '../components/AdminDashboard';
import { DashboardView } from '../components/DashboardView';
import Login from '../pages/Login';
import { LandingPage } from '../components/LandingPage';
import AppLayout from '../components/AppLayout';
import { useDashboard } from '../components/DashboardContext';
import { useTheme } from '../context/ThemeContext';
import { CGU } from '../components/CGU';
import { PrivacyPolicy } from '../components/PrivacyPolicy';
import { LegalNotice } from '../components/LegalNotice';
import { ResourcesTab } from '../components/ResourcesTab';
import { ArticlePage } from '../components/ArticlePage';

const RouterContent = () => {
  const { isAuthenticated, setIsAuthenticated } = useDashboard();
  const { darkMode } = useTheme();

  const userStr = localStorage.getItem('user');
  let isAdmin = false;
  if (userStr && userStr !== 'undefined') {
    try {
      const user = JSON.parse(userStr);
      isAdmin = user?.is_admin;
    } catch (e) {
      isAdmin = false;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to={isAdmin ? "/admin" : "/candidate"} /> : <Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="/" element={isAuthenticated ? <Navigate to={isAdmin ? "/admin" : "/candidate"} /> : <LandingPage darkMode={darkMode} />} />

        {/* Legal Routes */}
        <Route path="/cgu" element={<CGU />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal" element={<LegalNotice />} />

        {/* Public Resource Routes */}
        <Route path="/ressources" element={<ResourcesTab />} />
        <Route path="/ressources/:slug" element={<ArticlePage />} />

        {/* Protected Routes for Candidates */}
        <Route 
          path="/candidate/*"
          element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes for Admins */}
        <Route 
          path="/admin/*"
          element={
            <ProtectedRoute adminRoute={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
};

const AppRouter = () => {
  return <RouterContent />;
}

export default AppRouter;
