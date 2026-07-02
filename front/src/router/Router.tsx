import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminDashboard } from '../components/AdminDashboard';
import { DashboardView } from '../components/DashboardView';
import Login from '../pages/Login';
import { LandingPage } from '../components/LandingPage';
import AppLayout from '../components/AppLayout';
import { useGlobalDashboard } from '../hooks/DashboardContext';

const AppRouter = () => {
  const { isAuthenticated, setIsAuthenticated } = useGlobalDashboard();

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
        <Route path="/" element={isAuthenticated ? <Navigate to={isAdmin ? "/admin" : "/candidate"} /> : <LandingPage onStart={() => {}} onShowCGU={() => {}} onShowPrivacy={() => {}} onShowLegal={() => {}} darkMode={false} />} />

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

export default AppRouter;
