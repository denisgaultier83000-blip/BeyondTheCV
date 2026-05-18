import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

// TODO: Importe ici ton service d'API
// import api from '../../services/api';

export default function WorkspaceLayout() {
  const { ghd } = useParams();
  const navigate = useNavigate();
  
  const [applicationData, setApplicationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fonction pour récupérer les données sécurisées du dossier candidat
    const fetchWorkspaceData = async () => {
      try {
        setLoading(true);
        
        // ⚠️ REMPLACE CE BLOC PAR TON VRAI APPEL API (ex: await api.get(`/api/recherches/${ghd}`))
        // Pour l'instant, je simule une latence réseau et je te fournis de la vraie donnée pour tester l'UI
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockData = {
          application: {
            target_company: "Naval Group",
            target_job: "Responsable Cyber"
          },
          productions: {
            pitch: {
              accroche: "Avec 10 ans d'expertise en cybersécurité industrielle, j'aide les environnements critiques à se prémunir contre les menaces avancées.",
              preuve: "Récemment, j'ai piloté la mise en conformité de 3 sites Seveso sans aucun arrêt de production.",
              valeur: "Ce qui me différencie, c'est ma capacité à traduire les risques cyber en enjeux business compréhensibles pour le Comex.",
              projection: "Je souhaite rejoindre Naval Group car vos enjeux de souveraineté résonnent avec ma vision de la sécurité.",
              analysis: {
                global_score: 9,
                critique: "Excellent pitch. Structuré et impactant. Prêt pour l'entretien."
              }
            }
            // Ajoute ici les fausses données pour .cv, .qa, etc. si tu veux les tester
          }
        };
        
        setApplicationData(mockData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur de récupération du dossier:", err);
        // Idéalement, si le backend renvoie 403 (Anti-IDOR) ou 404, on tombe ici
        setError(err.message || "Impossible de charger le dossier ou accès refusé.");
        setLoading(false);
      }
    };

    if (ghd) {
      fetchWorkspaceData();
    }
  }, [ghd]);

  // Gestion du rendu pendant le chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Gestion des erreurs (Non autorisé, dossier introuvable)
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 text-slate-800">
        <AlertTriangle size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erreur d'accès</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition">
          Retourner en sécurité
        </button>
      </div>
    );
  }

  return (
    <div className="workspace-layout-root min-h-screen bg-slate-50">
      {/* 
        LE CŒUR DU SYSTÈME : 
        L'Outlet injecte la route enfant correspondante (DashboardOverview, DocumentView...) 
        et lui transmet l'intégralité des données d'application via `context`.
      */}
      <Outlet context={{ applicationData }} />
    </div>
  );
}