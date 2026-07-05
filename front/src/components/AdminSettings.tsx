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
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Settings /> Configuration Système (Lecture seule)
      </h2>

      {loading && <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Loader2 className="spin" /> Chargement...</div>}
      {error && <div style={{ color: 'red' }}><AlertTriangle /> {error}</div>}

      {settings && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <table style={{ width: '100%'}}>
            <tbody>
              {Object.entries(settings).map(([key, value]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f3f4f6'}}>
                  <td style={{ padding: '0.75rem', fontWeight: '500', color: '#374151' }}>{key}</td>
                  <td style={{ padding: '0.75rem', color: '#111827' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
