import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Printer, Info, AlertTriangle } from 'lucide-react';

/**
 * Composant générique pour visualiser et imprimer un document spécifique du dossier.
 * Il agit comme un routeur interne pour déléguer l'affichage au bon sous-composant.
 */
export default function DocumentView({ documentType }) {
  const navigate = useNavigate();
  // Récupération des données pré-chargées par DossierLayout.tsx
  const { applicationData } = useOutletContext();

  const handlePrint = () => {
    window.print();
  };

  // Dictionnaire des titres selon le type de document
  const titles = {
    cv: "CV Optimisé",
    qa: "Questions / Réponses",
    situations: "Mises en situation",
    company: "Rapport Entreprise",
    market: "Analyse Marché",
    flaws: "Forces & Parades",
    pitch: "Pitch de 3 minutes (Elevator Pitch)"
  };

  // Rendu conditionnel du contenu selon le type
  const renderContent = () => {
    // On sécurise l'accès aux données. On suppose que les données générées sont dans 'productions'
    const productions = applicationData?.productions || {};

    switch (documentType) {
      case 'pitch':
        return <PitchPrintLayout pitchData={productions.pitch} application={applicationData?.application} />;
      // Tu pourras ajouter les autres composants ici au fur et à mesure
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <AlertTriangle size={48} className="mb-4 text-orange-400" />
            <p>Le module <strong>{documentType}</strong> est en cours de construction.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* En-tête de l'interface : Masqué à l'impression */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between no-print sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{titles[documentType]}</h1>
            <p className="text-sm text-slate-500">
              Dossier : {applicationData?.application?.target_company} — {applicationData?.application?.target_job}
            </p>
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-all"
        >
          <Printer size={18} />
          Imprimer le document
        </button>
      </header>

      {/* Zone de contenu imprimable */}
      <main className="p-8 print:p-0 max-w-4xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
}

/**
 * SOUS-COMPOSANT : Layout spécifique pour le Pitch
 * Optimisé pour la lecture orale à l'impression.
 */
function PitchPrintLayout({ pitchData, application }) {
  if (!pitchData) {
    return <div className="p-8 text-center text-slate-500 bg-white rounded-lg shadow-sm">Aucun pitch n'a encore été généré pour ce dossier.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:bg-transparent overflow-hidden">
      
      {/* En-tête uniquement visible à l'impression (pour le contexte papier) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <h2 className="text-3xl font-bold text-slate-900">Pitch de présentation</h2>
        <p className="text-lg text-slate-600 mt-2">Candidature : {application?.target_company} | {application?.target_job}</p>
      </div>

      <div className="p-10 print:p-0 space-y-8">
        {/* Introduction IA pour le candidat (Non imprimée) */}
        <div className="no-print bg-blue-50 border border-blue-100 rounded-lg p-5 flex gap-4 items-start">
          <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-blue-900">Comment utiliser ce pitch ?</h4>
            <p className="text-blue-800 text-sm mt-1">
              Ce discours est conçu selon la pyramide de Minto. Lisez-le à voix haute à plusieurs reprises pour vous l'approprier. Le ton doit rester naturel, ne l'apprenez pas par cœur de façon mécanique.
            </p>
          </div>
        </div>

        {/* Le Script du Pitch - Typographie optimisée pour la lecture */}
        <div className="prose prose-lg max-w-none text-slate-800">
          <Section title="1. L'Accroche" content={pitchData.accroche} />
          <Section title="2. Preuve & Résultats" content={pitchData.preuve} />
          <Section title="3. Valeur Ajoutée" content={pitchData.valeur} />
          <Section title="4. Projection" content={pitchData.projection} />
        </div>
      </div>

      {/* Feedback de l'IA (Non imprimé) */}
      {pitchData.analysis && (
        <div className="no-print bg-slate-50 border-t border-slate-200 p-10">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Analyse de votre discours</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded border border-slate-200 text-center shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Score d'impact</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{pitchData.analysis.global_score}/10</div>
            </div>
            {/* D'autres métriques si nécessaires */}
          </div>
          <p className="text-slate-600 italic">"{pitchData.analysis.critique}"</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, content }) {
  return (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 no-print">{title}</h3>
      <p className="text-xl leading-relaxed text-slate-900 print:text-black">{content}</p>
    </div>
  );
}