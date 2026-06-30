import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./pages/AuthProvider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Login from "./pages/Login";
import App from "./App";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ResearchReport from "./pages/ResearchReport"; // Importer la nouvelle page
import AdminFeedbacks from "./components/AdminFeedbacks";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import "./theme.css";
import "./i18n";

const Payment = React.lazy(() => import("./pages/Payment"));

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback="loading">
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ErrorBoundary>
              <Routes>
                {/* La Landing Page doit être publique */}
                <Route path="/" element={<App />} />
                
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

                {/* Nouvelle route pour le Dashboard Administrateur */}
                <Route path="/admin" element={
                  <AdminFeedbacks />
                } />

                {/* Redirection par défaut vers la racine */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </Suspense>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
