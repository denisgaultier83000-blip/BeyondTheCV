import React from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Configuration de tes 7 piliers du dossier
const WORKSPACE_MODULES = [
  { id: 'cv', path: 'cv', icon: '📄' },
  { id: 'qa', path: 'questions-reponses', icon: '❓' },
  { id: 'situations', path: 'mises-en-situation', icon: '🎭' },
  { id: 'company', path: 'entreprise', icon: '🏢' },
  { id: 'market', path: 'marche', icon: '📈' },
  { id: 'flaws', path: 'defauts', icon: '🛡️' },
  { id: 'pitch', path: 'pitch', icon: '🗣️' }
];

export default function DashboardOverview() {
  const { ghd } = useParams();
  const { t } = useTranslation();

  // Le layout parent (WorkspaceLayout) doit injecter ces données via l'Outlet
  const { applicationData } = useOutletContext() || {};

  const handlePrintFullDossier = () => {
    // Ouvre la boîte de dialogue d'impression native du navigateur
    // Assure-toi que cette vue charge l'intégralité des données en cascade si c'est pour un export complet
    window.print();
  };

  return (
    <div className="workspace-container">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">
            Dossier d'entretien — {applicationData?.application?.target_company || "Entreprise inconnue"} / {applicationData?.application?.target_job || "Poste inconnu"}
          </h1>
          <p className="text-gray-500 text-sm">Référence : {ghd}</p>
        </div>
        
        <button 
          onClick={handlePrintFullDossier}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition no-print"
        >
          🖨️ Imprimer / Exporter PDF
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {WORKSPACE_MODULES.map((mod) => (
          <Link to={`/app/recherches/${ghd}/${mod.path}`} key={mod.id} className="block group">
            <div className="border border-gray-200 rounded-lg p-6 bg-white hover:border-blue-500 hover:shadow-lg transition">
              <span className="text-3xl block mb-2">{mod.icon}</span>
              <h3 className="font-semibold text-lg">{t(`module_${mod.id}_title`, mod.id)}</h3>
              <p className="text-sm text-gray-500 mt-2">Afficher, modifier et imprimer.</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}