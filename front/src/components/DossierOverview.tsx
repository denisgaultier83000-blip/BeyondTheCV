import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  MessageSquare, 
  ShieldQuestion, 
  Building, 
  LineChart, 
  Target, 
  Mic, 
  Printer, 
  Download 
} from 'lucide-react';

interface ApplicationData {
  application: {
    id: string;
    target_company: string;
    target_job: string;
  };
  // On peut injecter des stats ou scores ici plus tard
  data?: any; 
}

interface DossierOverviewProps {
  applicationData: ApplicationData;
}

export const DossierOverview: React.FC<DossierOverviewProps> = ({ applicationData }) => {
  const navigate = useNavigate();
  const { target_company, target_job, id } = applicationData.application;

  // Configuration centralisée des modules (Single Source of Truth)
  const modules = [
    {
      id: 'cv',
      title: 'CV Optimisé',
      desc: "Versions adaptées pour les logiciels ATS et la lecture humaine.",
      icon: FileText,
      path: 'cv'
    },
    {
      id: 'pitch',
      title: 'Pitch Introductif',
      desc: "Votre discours d'introduction structuré sur 3 minutes.",
      icon: Mic,
      path: 'pitch'
    },
    {
      id: 'qa',
      title: 'Questions / Réponses',
      desc: "Anticipation des questions clés et stratégie de réponse (Méthode STAR).",
      icon: MessageSquare,
      path: 'questions-reponses'
    },
    {
      id: 'situations',
      title: 'Mises en situation',
      desc: "Scénarios de crise et entraînements face aux imprévus.",
      icon: ShieldQuestion,
      path: 'mises-en-situation'
    },
    {
      id: 'company',
      title: 'Rapport Entreprise',
      desc: "Analyse des enjeux stratégiques, ADN et culture de la cible.",
      icon: Building,
      path: 'entreprise'
    },
    {
      id: 'market',
      title: 'Analyse Marché',
      desc: "Tendances du secteur, concurrents et baromètre des salaires.",
      icon: LineChart,
      path: 'marche'
    },
    {
      id: 'flaws',
      title: 'Forces & Parades',
      desc: "Cartographie de vos points de vigilance et arguments de défense.",
      icon: Target,
      path: 'defauts'
    }
  ];

  const handlePrintAll = () => {
    // Ouvre la vue d'impression globale gérée par une route spécifique ou un paramètre URL
    window.open(`/app/recherches/${id}/export?print=true`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 no-print">
      
      {/* Header du Dossier */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">
            Dossier de candidature
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {target_company} <span className="text-slate-400 font-medium">|</span> {target_job}
          </h1>
        </div>

        {/* Actions Globales */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrintAll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <Printer size={18} />
            Imprimer le dossier
          </button>
        </div>
      </div>

      {/* Grille des Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div 
            key={mod.id}
            onClick={() => navigate(mod.path)}
            className="group flex flex-col bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all duration-300"
          >
            <div className="h-12 w-12 rounded-xl bg-slate-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-50 group-hover:scale-110 transition-transform duration-300">
              <mod.icon size={24} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {mod.title}
            </h3>
            <p className="text-slate-500 leading-relaxed flex-grow">
              {mod.desc}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};