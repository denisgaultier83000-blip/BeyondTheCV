import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { Loader2, AlertTriangle, Settings } from 'lucide-react';

interface SystemSettings {
  [key: string]: string;
}

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
        const data = await response.json();
        setSettings(data.settings);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="space-y-6">
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
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="border-t border-gray-200">
            <dl>
              {Object.entries(settings).map(([key, value], idx) => (
                <div 
                  key={key} 
                  className={`${
                    idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } px-6 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors`}
                >
                  <dt className="text-sm font-semibold text-gray-500">{key}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
