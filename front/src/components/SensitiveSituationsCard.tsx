import React, { useState, useEffect } from 'react';
import { ShieldAlert, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight, HelpCircle } from 'lucide-react';
import AutoResizeTextarea from './AutoResizeTextarea';
import { authenticatedFetch } from '../utils/auth';
import { Button } from './common';

export interface SensitiveSituation {
  raw_input?: string;
  title: string;
  candidate_concern?: string;
  objective_risk?: 'high' | 'medium' | 'low' | 'unknown';
  objective_risk_reason?: string;
  risk_analysis: string;
  urgency_level: 'imperative' | 'prepare' | 'watch' | 'secure_now';
  urgency_label?: string;
  action_plan: string[];
  practice_suggestion?: string | {
    exercise?: string;
    format?: string;
    repetitions?: number;
    difficulty_progression?: string[];
    success_criterion?: string;
  };
  ready_to_use_phrases?: string[];
  missing_information?: string[];
}

interface SensitiveSituationsCardProps {
  initialText?: string;
  onSave?: (text: string, situations?: SensitiveSituation[]) => void;
}

export const SensitiveSituationsCard: React.FC<SensitiveSituationsCardProps> = ({
  initialText = '',
  onSave
}) => {
  const [sensitiveText, setSensitiveText] = useState<string>(initialText);
  const [situations, setSituations] = useState<SensitiveSituation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (initialText) setSensitiveText(initialText);
  }, [initialText]);

  const handleAnalyze = async () => {
    if (!sensitiveText.trim()) {
      setMessage("Veuillez indiquer au moins une situation ou inquiétude ci-dessus.");
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await authenticatedFetch('/api/differentiators/sensitive-situations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensitive_text: sensitiveText,
          target_language: 'fr'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const items: SensitiveSituation[] = data.situations || [];
        setSituations(items);
        if (onSave) onSave(sensitiveText, items);
        setMessage("✨ Votre plan de sécurisation a été généré par l'IA !");
      }
    } catch (e) {
      console.error("Error analyzing sensitive situations:", e);
      setMessage("Erreur lors de la génération du plan d'action.");
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (level: string, label?: string) => {
    if (level === 'imperative' || level === 'secure_now') {
      return (
        <span style={{ background: '#FEE2E2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '999px', textTransform: 'uppercase' }}>
          🔴 {label || 'À SÉCURISER IMPÉRATIVEMENT'}
        </span>
      );
    }
    if (level === 'prepare') {
      return (
        <span style={{ background: '#FFF4D6', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '999px', textTransform: 'uppercase' }}>
          🟡 {label || 'À PRÉPARER'}
        </span>
      );
    }
    return (
      <span style={{ background: '#DCFCE7', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '999px', textTransform: 'uppercase' }}>
        🟢 {label || 'À SURVEILLER'}
      </span>
    );
  };

  return (
    <div className="bento-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <ShieldAlert color="var(--mod-speech-accent)" size={24} />
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Situations sensibles & Points de fragilité
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Anticipez les facteurs de déstabilisation pour transformer vos inquiétudes en plan de préparation concret.
          </p>
        </div>
      </div>

      <div style={{ padding: '0.85rem 1rem', background: 'var(--mod-speech-bg-soft)', borderRadius: '0.5rem', borderLeft: '4px solid var(--mod-speech-accent)', marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--text-main)' }}>
        <strong>Y a-t-il une situation qui pourrait vous mettre en difficulté ou vous faire perdre vos moyens pendant cet entretien ?</strong>
        <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
          <em>Exemples :</em> Passage en anglais imprévu, test technique en live, question salariale trop tôt, trou de mémoire, recruteur froid/agressif, étude de cas chronométrée, prise de parole devant un jury...
        </div>
      </div>

      <AutoResizeTextarea
        value={sensitiveText}
        onChange={(e) => {
          setSensitiveText(e.target.value);
          if (onSave) onSave(e.target.value, situations);
        }}
        placeholder="Décrivez librement les situations sensibles qui vous inquiètent (ex: 'J'ai peur qu'on me demande de passer soudainement en anglais' ou 'Peur de bloquer sur une étude de cas')..."
        minHeight={100}
        className="form-control"
        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
      />

      <div className="btcv-action-row">
        <Button
          variant="primary"
          module="speech"
          onClick={handleAnalyze}
          disabled={loading || !sensitiveText.trim()}
          isLoading={loading}
          icon={<Sparkles size={16} />}
        >
          Générer mon plan de sécurisation
        </Button>
      </div>

      {message && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: '#DCFCE7', color: '#065f46', fontSize: '0.88rem', fontWeight: 600, border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      )}

      {/* RÉSULTAT DU PLAN DE SÉCURISATION (3 NIVEAUX DE PRIORITÉ) */}
      {situations.length > 0 && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📋 Votre programme de sécurisation personnalisé
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {situations.map((sit, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: '0.75rem',
                  padding: '1.2rem',
                  border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${sit.urgency_level === 'imperative' ? '#EF6461' : sit.urgency_level === 'prepare' ? '#F59E0B' : '#10B981'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {getUrgencyBadge(sit.urgency_level, sit.urgency_label)}
                </div>

                <h5 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {sit.title}
                </h5>

                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  <strong>Risque principal :</strong> {sit.risk_analysis}
                </p>

                {sit.action_plan && sit.action_plan.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                      Plan d'action de préparation :
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {sit.action_plan.map((act, aIdx) => (
                        <li key={aIdx} style={{ marginBottom: '0.25rem' }}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sit.practice_suggestion && (
                  <div style={{ padding: '0.65rem 0.85rem', background: 'var(--mod-speech-bg-soft)', borderRadius: '0.5rem', borderLeft: '3px solid var(--mod-speech-accent)', fontSize: '0.83rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>
                      🎯 <strong>Exercice recommandé :</strong>{' '}
                      {typeof sit.practice_suggestion === 'string'
                        ? sit.practice_suggestion
                        : sit.practice_suggestion.exercise}
                    </div>
                    {typeof sit.practice_suggestion === 'object' && sit.practice_suggestion.format && (
                      <div style={{ color: 'var(--text-muted)' }}>
                        <strong>Format :</strong> {sit.practice_suggestion.format}
                      </div>
                    )}
                    {typeof sit.practice_suggestion === 'object' && sit.practice_suggestion.success_criterion && (
                      <div style={{ color: '#047857', fontWeight: 600 }}>
                        <strong>Critère de réussite :</strong> {sit.practice_suggestion.success_criterion}
                      </div>
                    )}
                  </div>
                )}

                {sit.ready_to_use_phrases && sit.ready_to_use_phrases.length > 0 && (
                  <div style={{ padding: '0.5rem 0.75rem', background: '#F0F9FF', borderRadius: '0.5rem', border: '1px solid #BAE6FD', fontSize: '0.82rem' }}>
                    <strong style={{ color: '#0369A1', display: 'block', marginBottom: '0.25rem' }}>💬 Phrases clés prêtes à l'emploi :</strong>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#0C4A6E' }}>
                      {sit.ready_to_use_phrases.map((phrase, pIdx) => (
                        <li key={pIdx}>"{phrase}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
