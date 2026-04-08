import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Payment from "./pages/Payment";
import Candidate from "./pages/Candidate";
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page
import AdminFeedbacks from "./components/AdminFeedbacks";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback="loading">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
        <Routes>
          {/* La Landing Page doit être publique */}
          <Route path="/" element={<App />} />
          
          <Route path="/login" element={<Login onLogin={() => window.location.href = '/candidate'} />} />
          
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

          {/* Nouvelle route pour le Dashboard Administrateur */}
          <Route path="/admin" element={
            <AdminFeedbacks />
          } />

          {/* Redirection par défaut vers la racine */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </Suspense>
  </React.StrictMode>
);
