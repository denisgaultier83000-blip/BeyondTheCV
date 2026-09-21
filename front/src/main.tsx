import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute"; // Le seul composant de protection nécessaire
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-load secondary routes so the landing bundle stays small.
const Payment = lazy(() => import("./pages/Payment"));
const ResearchReport = lazy(() => import("./pages/ResearchReport"));
const AdminLayout = lazy(() => import("./components/AdminLayout"));
const AdminFeedbacks = lazy(() => import("./components/AdminFeedbacks"));
const AdminUsers = lazy(() => import("./components/AdminUsers"));
const AdminBilling = lazy(() => import("./components/AdminBilling"));
const AdminUserDetails = lazy(() => import("./components/AdminUserDetails"));
const AdminGenerations = lazy(() => import("./components/AdminGenerations"));
const AdminSettings = lazy(() => import("./components/AdminSettings"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const ResetPassword = lazy(() => import("./components/ResetPassword"));
import "./index.css";
import "./theme.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#52677d' }}>Chargement…</div>}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
        <Routes>
          {/* [FIX] La racine redirige vers la bonne interface si connecté, sinon affiche App (Landing/Login) */}
          <Route path="/" element={
            <ProtectedRoute adminRoute={false}><App /></ProtectedRoute>
          } />
          
          {/* [FIX] Remplacement de la redirection JS par une redirection React pour éviter le rechargement de la page */}
          <Route path="/login" element={<Login />} />
          
          {/* Page de paiement intermédiaire */}
          <Route path="/payment" element={
            <ProtectedRoute adminRoute={false}><Payment /></ProtectedRoute>
          } />

          {/* Restaure la route /candidate pour que le Header affiche correctement les pastilles d'avancement */}
          <Route path="/candidate" element={
            <ProtectedRoute adminRoute={false}><App /></ProtectedRoute>
          } />

          {/* Nouvelle route pour les rapports de recherche */}
          <Route path="/report" element={
            <ProtectedRoute adminRoute={false}><ResearchReport /></ProtectedRoute>
          } />

          {/* Section Administrateur avec Layout dédié */}
          <Route 
            path="/admin" 
            element={<ProtectedRoute adminRoute={true}><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="user/:userId" element={<AdminUserDetails />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="generations" element={<AdminGenerations />} />
            <Route path="feedbacks" element={<AdminFeedbacks />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Redirection par défaut vers la racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>
);
