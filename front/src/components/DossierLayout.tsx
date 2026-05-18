import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Mic, 
  MessageSquare, 
  ShieldQuestion, 
  Building, 
  LineChart, 
  Target, 
  ArrowLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';

export const DossierLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [applicationData, setApplicationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDossier = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/applications/${id}/load`);
        if (!res.ok) throw new Error("Impossible de charger le dossier");
        const data = await res.json();
        setApplicationData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDossier();
  }, [id]);

  // [EXPERT FIX] Ajout d'un mécanisme de polling pour rafraîchir les données asynchrones.
  // Ceci est crucial car la génération des analyses par l'IA prend du temps.
  useEffect(() => {
    // Ne pas démarrer le polling si les données initiales ne sont pas encore là.
    if (!applicationData) return;

    const status = applicationData.application?.status;
    const isProcessing = status === 'PROCESSING' || status === 'STARTING';

    // Si le statut est déjà final, inutile de poller.
    if (!isProcessing) return;

    // Démarrage du poller toutes les 5 secondes.
    const intervalId = setInterval(async () => {
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/applications/${id}/load`);
        if (!res.ok) throw new Error("Polling failed, stopping.");
        const data = await res.json();
        setApplicationData(data); // Mise à jour de l'état avec les nouvelles données

        // Si le nouveau statut est final, on arrête le polling.
        if (data.application?.status !== 'PROCESSING' && data.application?.status !== 'STARTING') {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error:", err);
        clearInterval(intervalId); // Arrêt en cas d'erreur réseau pour éviter de spammer.
      }
    }, 5000); // Intervalle de 5 secondes

    // Nettoyage : on s'assure d'arrêter le polling si le composant est démonté.
    return () => clearInterval(intervalId);

  }, [applicationData, id]); // Cet effet se relancera si l'ID du dossier change.

  const navItems = [
    { path: '', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
    { path: 'cv', label: 'CV Optimisé', icon: FileText },
    { path: 'pitch', label: 'Pitch Introductif', icon: Mic },
    { path: 'questions-reponses', label: 'Questions / Réponses', icon: MessageSquare },
    { path: 'mises-en-situation', label: 'Mises en situation', icon: ShieldQuestion },
    { path: 'entreprise', label: 'Rapport Entreprise', icon: Building },
    { path: 'marche', label: 'Analyse Marché', icon: LineChart },
    { path: 'defauts', label: 'Forces & Parades', icon: Target },
  ];

  // Si on est en mode impression globale, on peut vouloir cacher la navigation via CSS
  // La classe "no-print" sur la sidebar gère cela.

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
        <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
        <p className="text-lg font-medium">Chargement de votre dossier stratégique...</p>
      </div>
    );
  }

  if (error || !applicationData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Dossier introuvable</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate('/candidate')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR NAVIGATION (Cachée à l'impression) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col no-print shrink-0">
        <div className="p-6 border-b border-slate-100">
          <button 
            onClick={() => navigate('/candidate')}
            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={16} className="mr-2" /> Retour
          </button>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            {applicationData.application.target_company}
          </h2>
          <p className="text-sm text-slate-500 truncate">
            {applicationData.application.target_job}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            // Résolution du lien exact (pour la vue d'ensemble)
            const to = item.path ? `/app/recherches/${id}/${item.path}` : `/app/recherches/${id}`;

            return (
              <NavLink
                key={item.path}
                to={to}
                end={item.exact}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto relative">
        {/* L'Outlet rend les sous-routes et leur passe les données */}
        <Outlet context={{ applicationData }} />
      </main>
    </div>
  );
};