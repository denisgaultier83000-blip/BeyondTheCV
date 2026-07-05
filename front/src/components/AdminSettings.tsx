import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { Loader2, AlertTriangle, Settings, GitCommit, Terminal, Layers, DollarSign, Cpu, FileText, CheckCircle, XCircle } from 'lucide-react';

interface ActiveOffer {
    name: string;
    price: string;
    quotas: string;
    duration: string;
}

interface AiModelUsage {
    module: string;
    model_name: string;
}

interface ActivePrompt {
    module: string;
    prompt_version: string;
}

interface SystemSettings {
  environment: 'staging' | 'production';
  frontend_version: string;
  backend_version: string;
  last_git_commit: string;
  last_deployment_at: string;
  maintenance_mode: boolean;
  active_offers: ActiveOffer[];
  ai_models_by_module: AiModelUsage[];
  active_prompts: ActivePrompt[];
  ia_cost_alert_threshold: number;
}

const InfoCard: React.FC<{title: string, value: string | React.ReactNode, icon: React.ReactNode}> = ({ title, value, icon }) => (
    <div className="admin-card flex items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-lg">{icon}</div>
        <div>
            <h4 className="text-sm font-semibold text-gray-500">{title}</h4>
            <p className="text-lg font-bold mt-1">{value}</p>
        </div>
    </div>
);

const AdminSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/settings`);
        if (!response.ok) {
          throw new Error('Failed to fetch system settings.');
        }
        setSettings(await response.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="text-blue-600" /> Configuration Système
        </h2>
        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full border">
          Lecture seule
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600 font-medium">Chargement des paramètres...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>Erreur : {error}</span>
        </div>
      )}

      {settings && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoCard title="Environnement" value={settings.environment} icon={<Terminal size={20} />} />
                <InfoCard title="Version Frontend" value={settings.frontend_version} icon={<Layers size={20} />} />
                <InfoCard title="Version Backend" value={settings.backend_version} icon={<Layers size={20} />} />
                <InfoCard title="Dernier Commit" value={settings.last_git_commit.substring(0,7)} icon={<GitCommit size={20} />} />
                <InfoCard title="Dernier Déploiement" value={new Date(settings.last_deployment_at).toLocaleString()} icon={<CheckCircle size={20} />} />
                <InfoCard title="Mode Maintenance" value={settings.maintenance_mode ? <XCircle className="text-red-500"/> : <CheckCircle className="text-green-500"/>} icon={<AlertTriangle size={20} />} />
            </div>

            <div className="admin-card">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={20}/> Offres Actives</h3>
                <table className="admin-table">
                    <thead><tr><th>Nom</th><th>Prix</th><th>Quotas</th><th>Durée</th></tr></thead>
                    <tbody>
                        {settings.active_offers.map(offer => (
                            <tr key={offer.name}>
                                <td>{offer.name}</td>
                                <td>{offer.price}</td>
                                <td>{offer.quotas}</td>
                                <td>{offer.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="admin-card">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Cpu size={20}/> Configuration IA</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <h4 className="font-bold mb-2">Modèles par module</h4>
                        <table className="admin-table text-sm">
                           <thead><tr><th>Module</th><th>Modèle</th></tr></thead>
                           <tbody>
                                {settings.ai_models_by_module.map(m => <tr key={m.module}><td>{m.module}</td><td>{m.model_name}</td></tr>)}
                           </tbody>
                        </table>
                    </div>
                     <div className="lg:col-span-1">
                        <h4 className="font-bold mb-2">Prompts actifs</h4>
                        <table className="admin-table text-sm">
                           <thead><tr><th>Module</th><th>Version</th></tr></thead>
                           <tbody>
                                {settings.active_prompts.map(p => <tr key={p.module}><td>{p.module}</td><td>{p.prompt_version}</td></tr>)}
                           </tbody>
                        </table>
                    </div>
                     <div className="lg:col-span-1">
                        <h4 className="font-bold mb-2">Seuils</h4>
                        <p>Alerte coût IA: {settings.ia_cost_alert_threshold}%</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
