import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Payment from "./pages/Payment";
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page

// [EXPERT] Import de tous les composants de page pour un routage centralisé
import Login from "./pages/Login";
import ResetPassword from "./components/ResetPassword";
import { AdminPage } from "./components/AdminPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminAiUsage } from "./components/AdminAiUsage";
import { AdminFeedbacks } from "./components/AdminFeedbacks";
import { AdminUserDetail } from "./components/AdminUserDetail";
import { AdminRoute } from "./components/AdminRoute";

import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./theme.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback="loading">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={<Login onLogin={() => window.location.href = '/candidate'} />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Layout principal de l'application */}
            <Route path="/" element={<App />}>
              {/* Page d'accueil - on ne peut pas la mettre ici car AppContent la gère déjà */}
              <Route index element={<Outlet />} />

              {/* Routes protégées pour les candidats */}
              <Route path="candidate" element={<ProtectedRoute>{/* Ce Outlet sera remplacé par le contenu de AppContent */}<Outlet /></ProtectedRoute>} />
              <Route path="payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
              <Route path="report" element={<ProtectedRoute><ResearchReport /></ProtectedRoute>} />

              {/* Routes protégées pour l'administration */}
              <Route path="admin" element={<ProtectedRoute><AdminRoute><AdminPage /></AdminRoute></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="ai-usage" element={<AdminAiUsage />} />
                <Route path="feedbacks" element={<AdminFeedbacks />} />
                <Route path="user/:userId" element={<AdminUserDetail />} />
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
