import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import App from "./App";
import Payment from "./pages/Payment"; // Ce composant n'est plus utilisé, mais on le garde pour référence
import { ProtectedRoute } from "./components/ProtectedRoute"; // Le seul composant de protection nécessaire
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page
import AdminFeedbacks from "./components/AdminFeedbacks";
import AdminLayout from "./components/AdminLayout"; // Nouveau Layout Admin
import AdminUsers from "./components/AdminUsers"; // Nouvelle page Admin
import AdminBilling from "./components/AdminBilling"; // Nouvelle page Admin
import AdminUserDetails from "./components/AdminUserDetails"; // Nouvelle page de détail
import AdminGenerations from "./components/AdminGenerations"; // Nouvelle page Admin
import AdminSettings from "./components/AdminSettings"; // Nouvelle page Admin
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
            <Route index element={<Navigate to="users" replace />} /> {/* Redirige /admin vers /admin/users */}
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
