import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { DashboardProvider as GlobalProvider } from './hooks/DashboardContext';
import "./index.css";
import "./theme.css";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback="loading">
        <GlobalProvider>
            <BrowserRouter>
                <ErrorBoundary>
                    <App />
                </ErrorBoundary>
            </BrowserRouter>
        </GlobalProvider>
    </Suspense>
  </React.StrictMode>
);
