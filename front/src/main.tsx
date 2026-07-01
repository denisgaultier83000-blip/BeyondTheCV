import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import App from "./App";
import Payment from "./pages/Payment";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page
import AdminFeedbacks from "./components/AdminFeedbacks";
import AdminLayout from "./components/AdminLayout"; // Nouveau Layout Admin
import AdminUsers from "./components/AdminUsers"; // Nouvelle page Admin
import AdminBilling from "./components/AdminBilling"; // Nouvelle page Admin
import AdminGenerations from "./components/AdminGenerations"; // Nouvelle page Admin
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
          {/* La Landing Page doit être publique */}
          <Route path="/" element={<App />} />
          
          {/* [FIX] Remplacement de la redirection JS par une redirection React pour éviter le rechargement de la page */}
          <Route path="/login" element={<Login />} />
          
          {/* Page de paiement intermédiaire */}
          <Route path="/payment" element={
            <ProtectedRoute><Payment /></ProtectedRoute>
          } />

          {/* Restaure la route /candidate pour que le Header affiche correctement les pastilles d'avancement */}
          <Route path="/candidate" element={
            <ProtectedRoute><App /></ProtectedRoute>
          } />

          {/* Nouvelle route pour les rapports de recherche */}
          <Route path="/report" element={
            <ProtectedRoute><ResearchReport /></ProtectedRoute>
          } />

          {/* Section Administrateur avec Layout dédié */}
          <Route 
            path="/admin" 
            element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}
          >
            <Route index element={<Navigate to="users" replace />} /> {/* Redirige /admin vers /admin/users */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="generations" element={<AdminGenerations />} />
            <Route path="feedbacks" element={<AdminFeedbacks />} />
          </Route>

          {/* Redirection par défaut vers la racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>
);
