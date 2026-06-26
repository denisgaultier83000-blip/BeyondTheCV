import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PitchMatrix } from "./components/PitchMatrix"; // Use alias for consistency
import { ProtectedRoute } from "./components/ProtectedRoute";
import Payment from "./pages/Payment";
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page

// [EXPERT] Import de tous les composants de page pour un routage centralisé
import { LandingPage } from "./components/LandingPage";
import AuthScreen from "./components/AuthScreen";
import ResetPassword from "./components/ResetPassword";
import { CandidateLayout } from "./components/CandidateLayout";
import { AdminPage } from "./components/AdminPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminAiUsage } from "./components/AdminAiUsage";
import AdminFeedbacks from "./components/AdminFeedbacks";
import { AdminUserDetail } from "./components/AdminUserDetail";
import { AdminUsers } from "./components/AdminUsers";
import { AdminBilling } from "./components/AdminBilling";
import { AdminGenerations } from "./components/AdminGenerations";
import { AdminRoute } from "./components/AdminRoute";

import { BrowserRouter, Routes, Route, Navigate, useOutletContext, useNavigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./theme.css";
import "./i18n";

// [FIX] Wrapper pour connecter la page de login au contexte de l'application
function LoginWrapper() {
  const { setIsAuthenticated } = useOutletContext<any>();
  const navigate = useNavigate();
  // [EXPERT] Logique de redirection post-login.
  // Le backend retourne un objet `user` complet avec le flag `is_admin`.
  const handleLoginSuccess = (user: any) => {
    setIsAuthenticated(true);
    if (user?.is_admin) {
      navigate('/admin', { replace: true }); // Redirection de l'admin vers sa tour de contrôle.
    } else {
      navigate('/candidate', { replace: true }); // Redirection standard pour les utilisateurs.
    }
  };
  return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback="loading">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<App />}>
              {/* [EXPERT DEBUG] LandingPage ne prend plus de props, elle les reçoit via le contexte de l'Outlet. On retire les props vides. */}
              <Route index element={<LandingPage />} /> 
              <Route path="login" element={<LoginWrapper />} />
              <Route path="reset-password" element={<ResetPassword />} />

              {/* Routes protégées pour les candidats */}
              {/* [EXPERT] La route /candidate utilise maintenant le CandidateLayout pour afficher le stepper */}
              <Route path="candidate" element={<ProtectedRoute><CandidateLayout /></ProtectedRoute>} />
              <Route path="candidate/pitch" element={<ProtectedRoute><PitchMatrix /></ProtectedRoute>} />
              <Route path="payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
              <Route path="report" element={<ProtectedRoute><ResearchReport /></ProtectedRoute>} />

              {/* Routes protégées pour l'administration */}
              <Route path="admin" element={<ProtectedRoute><AdminRoute><AdminPage /></AdminRoute></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="ai-usage" element={<AdminAiUsage />} />
                <Route path="feedbacks" element={<AdminFeedbacks />} />
                <Route path="user/:userId" element={<AdminUserDetail />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="generations" element={<AdminGenerations />} />
              </Route>
            </Route>

            {/* Redirection par défaut pour les URL inconnues */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>
);
