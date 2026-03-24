import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home"; // La nouvelle page d'accueil
import Candidate from "./Candidate";
import Login from "./Login";
import Payment from "./Payment";
import { ProtectedRoute } from "../components/ProtectedRoute";
import ErrorBoundary from "../components/ErrorBoundary";

/**
 * Composant principal de routage de l'application.
 * Il définit toutes les URL et les pages correspondantes.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/candidate"
            element={
              <ProtectedRoute>
                <Candidate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          {/* Ajoutez d'autres routes ici si nécessaire */}
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
