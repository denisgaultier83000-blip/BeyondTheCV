import React, { useState, useEffect } from 'react';
import { Target, Sparkles, CheckCircle2, Award, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { useDashboard } from '../hooks/DashboardContext';
import { Button } from './common';

export interface KeyMessage {
  id: string;
  application_id: string;
  differentiator_id?: string;
  priority_level: 'priority' | 'opportunistic' | 'reserve';
  headline: string;
  supporting_fact: string;
  oral_pitch?: string;
  target_situation?: string;
}

interface ApplicationKeyMessagesViewProps {
  applicationId?: string;
}

const normalize = (value: any) => String(value || '').trim().toLowerCase();

export const ApplicationKeyMessagesView: React.FC<ApplicationKeyMessagesViewProps> = ({ applicationId: applicationIdProp }) => {
  const dashboard = useDashboard();
  const cvData = dashboard?.cvData || {};
  const [keyMessages, setKeyMessages] = useState<KeyMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selecting, setSelecting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [resolvedApplicationId, setResolvedApplicationId] = useState<string | undefined>(applicationIdProp);

  // Résout automatiquement l'application_id à partir de la cible active si la prop n'est pas fournie
  useEffect(() => {
    if (applicationIdProp) {
      setResolvedApplicationId(applicationIdProp);
      return;
    }
    const targetCompany = normalize(cvData?.target_company);
    const targetJob = normalize(cvData?.target_job);
    if (!targetCompany && !targetJob) {
      setResolvedApplicationId(undefined);
      return;
    }
    let cancelled = false;
    const resolveApplicationId = async () => {
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/applications`);
        if (!res.ok) return;
        const applications = await res.json();
        if (!Array.isArray(applications)) return;
        const match = applications.find((app: any) => {
          const appCompany = normalize(app?.target_company);
          const appJob = normalize(app?.target_job);
          return appCompany === targetCompany && (targetJob ? appJob === targetJob : true);
        });
        if (!cancelled && match?.id) {
          setResolvedApplicationId(match.id);
        }
      } catch (e) {
        console.error('Error resolving application id:', e);
      }
    };
    void resolveApplicationId();
    return () => { cancelled = true; };
  }, [applicationIdProp, cvData?.target_company, cvData?.target_job]);

  useEffect(() => {
    if (resolvedApplicationId) {
      fetchKeyMessages();
    }
  }, [resolvedApplicationId]);

  const fetchKeyMessages = async () => {
    if (!resolvedApplicationId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/differentiators/applications/${resolvedApplicationId}/key-messages`);
      if (res.ok) {
        const data = await res.json();
        setKeyMessages(data.key_messages || []);
      }
    } catch (e) {
      console.error("Error fetching application key messages:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectKeyMessages = async () => {
    if (!resolvedApplicationId) {
      setMessage("Veuillez d'abord sélectionner une candidature active.");
      return;
    }

    setSelecting(true);
    setMessage('');
    try {
      const res = await authenticatedFetch(`/api/differentiators/applications/${resolvedApplicationId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_language: 'fr' })
      });

      if (res.ok) {
        const data = await res.json();
        setKeyMessages(data.key_messages || []);
        setMessage("✨ Vos 3 à 6 marqueurs différenciants pour cette candidature ont été sélectionnés par l'IA !");
      }
    } catch (e) {
      console.error("Error selecting key messages:", e);
      setMessage("Erreur lors de la sélection des marqueurs par l'IA.");
    } finally {
      setSelecting(false);
    }
  };

  const priorityMessages = keyMessages.filter(m => m.priority_level === 'priority');
  const opportunisticMessages = keyMessages.filter(m => m.priority_level === 'opportunistic');
  const reserveMessages = keyMessages.filter(m => m.priority_level === 'reserve');

  return (
    <div className="bento-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target color="var(--mod-speech-accent)" size={22} /> Ce que le recruteur doit retenir de vous
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Sélection stratégique des 3 à 6 marqueurs différenciants prioritaires pour cette candidature.
          </p>
        </div>

        <div className="btcv-action-row" style={{ width: 'auto' }}>
          <Button
            variant="primary"
            module="speech"
            onClick={handleSelectKeyMessages}
            disabled={selecting || !resolvedApplicationId}
            isLoading={selecting}
            icon={<Sparkles size={16} />}
          >
            Sélectionner mes marqueurs pour ce poste
          </Button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.88rem', fontWeight: 500 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 className="spin" size={24} style={{ marginBottom: '0.5rem' }} />
          <p>Chargement des marqueurs clés...</p>
        </div>
      ) : keyMessages.length === 0 ? (
        <div style={{ padding: '1.75rem', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-muted)' }}>
          <Award size={32} style={{ opacity: 0.5, marginBottom: '0.4rem' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Aucune sélection de marqueurs effectuée pour cette candidature.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Cliquez sur « Sélectionner mes marqueurs pour ce poste (IA) » pour adapter automatiquement votre discours au poste.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* TIER 1: 3 MARQUEURS PRIORITAIRES */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎯 3 Marqueurs prioritaires (À faire comprendre impérativement)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {priorityMessages.map((msg, idx) => (
                <div key={msg.id || idx} style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {msg.headline}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    <strong>Preuve :</strong> {msg.supporting_fact}
                  </div>
                  {msg.target_situation && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <strong>Moment :</strong> {msg.target_situation}
                    </div>
                  )}
                  {msg.oral_pitch && (
                    <div style={{ fontSize: '0.82rem', fontStyle: 'italic', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '0.375rem', color: 'var(--text-main)' }}>
                      « {msg.oral_pitch} »
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* TIER 2: MARQUEURS OPPORTUNISTES */}
          {opportunisticMessages.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                💡 2-4 Marqueurs opportunistes (À placer si la conversation s'y prête)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                {opportunisticMessages.map((msg, idx) => (
                  <div key={msg.id || idx} style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '4px solid #f59e0b', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      {msg.headline}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      <strong>Preuve :</strong> {msg.supporting_fact}
                    </div>
                    {msg.oral_pitch && (
                      <div style={{ fontSize: '0.82rem', fontStyle: 'italic', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '0.375rem', color: 'var(--text-main)' }}>
                        « {msg.oral_pitch} »
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIER 3: RÉSERVE */}
          {reserveMessages.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                🛡️ Preuves en réserve (Facultatives)
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {reserveMessages.map((msg, idx) => (
                  <li key={msg.id || idx} style={{ marginBottom: '0.25rem' }}>
                    <strong>{msg.headline} :</strong> {msg.supporting_fact}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
