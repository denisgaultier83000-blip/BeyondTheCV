import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

export default function Payment() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  return (
    <div className={darkMode ? "dark-mode" : ""} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "80px", paddingBottom: "20px", paddingLeft: "20px", paddingRight: "20px", boxSizing: 'border-box' }}>
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="card" style={{ textAlign: "center", maxWidth: 500 }}>
        <h1>Paiement</h1>
        <p style={{ margin: "20px 0", color: "var(--text-muted)" }}>
          Le module de paiement est en cours de développement.
        </p>
        <div style={{ padding: "15px", background: "var(--bg-secondary)", borderRadius: "8px", fontSize: "13px" }}>
          <p>⚠️ Fonctionnalité non disponible</p>
          <button className="btn-secondary" onClick={() => navigate("/candidate")}>
            Retourner au tableau de bord &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}