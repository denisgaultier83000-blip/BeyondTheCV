import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Header from "../components/Header";
import ErrorBoundary from "../components/ErrorBoundary";
import { authenticatedFetch } from "../utils/auth";
import { API_BASE_URL } from "../config";

// [STRIPE] Initialisation (Remplacez par votre clé publique dans .env)
// Note: Vite utilise import.meta.env au lieu de process.env
const STRIPE_PK = import.meta.env.VITE_STRIPE_PK || "pk_test_TYooMQauvdEDq54NiTphI7jx";

const stripePromise = loadStripe(STRIPE_PK);

// Composant de formulaire interne
const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/candidate",
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || "Une erreur est survenue.");
    } else {
      onSuccess();
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", marginTop: "20px" }}>
      <PaymentElement />
      <button 
        disabled={isLoading || !stripe || !elements} 
        className="btn-primary" 
        style={{ width: "100%", marginTop: "20px" }}
      >
        {isLoading ? "Traitement..." : "Payer 99.00 $"}
      </button>
      {message && <div style={{ color: "var(--danger-text)", marginTop: "10px", fontSize: "14px" }}>{message}</div>}
    </form>
  );
};

export default function Payment() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // [BACKEND] Récupération de l'intention de paiement
    // Le backend doit implémenter POST /api/create-payment-intent
    authenticatedFetch(`${API_BASE_URL}/api/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 9900, currency: "usd" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Endpoint Stripe manquant");
        return res.json();
      })
      .then((data) => setClientSecret(data.clientSecret))
      .catch((err) => console.warn("[Paiement] Mode simulation activé (Backend non prêt)", err));
  }, []);

  const appearance = {
    theme: darkMode ? 'night' : 'stripe',
    variables: { colorPrimary: '#0ea5e9' },
  };

  return (
    <div className={darkMode ? "dark-mode" : ""} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "80px", paddingBottom: "20px", paddingLeft: "20px", paddingRight: "20px", boxSizing: 'border-box' }}>
      <Header darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="card" style={{ textAlign: "center", maxWidth: 500 }}>
        <h1>Paiement</h1>
        
        {clientSecret ? (
          <ErrorBoundary fallback={
            <div style={{ padding: "20px", textAlign: "center", color: "var(--danger-text)" }}>
              <h3>Erreur du module de paiement</h3>
              <p>Impossible d'initialiser Stripe. Vérifiez votre configuration.</p>
              <button className="btn-secondary" onClick={() => window.location.reload()}>Recharger la page</button>
            </div>
          }>
            <Elements options={{ clientSecret, appearance: appearance as any }} stripe={stripePromise}>
              <CheckoutForm onSuccess={() => navigate("/candidate")} />
            </Elements>
          </ErrorBoundary>
        ) : (
          <>
            <p style={{ margin: "20px 0", color: "var(--text-muted)" }}>
              Chargement du module de paiement sécurisé...
            </p>
            {/* Fallback Dev : Si le backend n'est pas prêt, on permet la simulation */}
            <div style={{ padding: "15px", background: "var(--bg-secondary)", borderRadius: "8px", fontSize: "13px" }}>
              <p>⚠️ Backend Stripe non détecté</p>
              <button className="btn-secondary" onClick={() => navigate("/candidate")}>
                Simuler le paiement (Dev) &rarr;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}