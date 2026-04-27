import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useTranslation } from 'react-i18next';

interface FeedbackWidgetProps {
  feature: string;
  jobType?: string;
  question?: string;
  negativeBullets?: string[];
}

export function FeedbackWidget({ 
  feature, 
  jobType = "unknown",
  question,
  negativeBullets
}: FeedbackWidgetProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [showNegativeForm, setShowNegativeForm] = useState(false);
  const [comments, setComments] = useState('');
  const [selectedBullets, setSelectedBullets] = useState<string[]>([]);

  const activeQuestion = question || t('feedback_default_q', "Cette analyse vous est-elle utile ?");
  const activeBullets = negativeBullets || [
    t('feedback_bullet_1', "L'analyse manque de précision ou de contexte ?"),
    t('feedback_bullet_2', "Les informations sont inexactes ou hors sujet ?"),
    t('feedback_bullet_3', "Les recommandations ne sont pas applicables ?")
  ];

  const handleFeedback = async (isPositive: boolean, submittedComments?: string) => {
    if (!isPositive && !showNegativeForm) {
      setShowNegativeForm(true);
      return;
    }
    setStatus('submitting');
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feature,
          is_positive: isPositive,
          comments: submittedComments ? submittedComments : null,
          job_type: jobType,
        }),
      });
      
      if (response.ok) {
        setStatus('success');
        setShowNegativeForm(false);
      } else {
        console.error("Erreur API Feedback:", await response.text());
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      
      {status === 'success' ? (
        <p style={{ color: '#15803d', margin: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} /> {t('feedback_thanks', 'Merci pour votre retour !')}
        </p>
      ) : showNegativeForm ? (
        <div style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'left' }}>
          <p style={{ margin: '0 0 1rem 0', fontWeight: 600, color: 'var(--text-main)' }}>
            {t('feedback_improve', 'Comment pouvons-nous améliorer cette analyse ?')}
          </p>
          
          {/* Puces cliquables (Tags) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {activeBullets.map((bullet, idx) => {
              const isSelected = selectedBullets.includes(bullet);
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedBullets(prev => prev.includes(bullet) ? prev.filter(b => b !== bullet) : [...prev, bullet])}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '2rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                    border: `1px solid ${isSelected ? 'var(--danger-text)' : 'var(--border-color)'}`,
                    background: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
                    color: isSelected ? 'var(--danger-text)' : 'var(--text-main)',
                  }}
                >
                  {bullet}
                </button>
              );
            })}
          </div>
          
          <textarea 
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t('feedback_placeholder', "Précisez votre retour (optionnel)...")}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', marginBottom: '1rem', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button 
              type="button"
              onClick={() => {
                setShowNegativeForm(false);
                setSelectedBullets([]);
                setComments('');
              }}
              style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 500 }}
            >
              {t('btn_cancel', 'Annuler')}
            </button>
            <button 
              type="button"
              onClick={() => {
                const finalComments = [
                  selectedBullets.length > 0 ? `[${selectedBullets.join(' / ')}]` : '',
                  comments
                ].filter(Boolean).join(' ').trim();
                handleFeedback(false, finalComments);
              }}
              disabled={status === 'submitting'}
              style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '0.5rem', cursor: status === 'submitting' ? 'wait' : 'pointer', color: 'white', fontWeight: 500 }}
            >
              {t('btn_send_feedback', 'Envoyer le retour')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: '500', fontSize: '1.1rem', textAlign: 'center' }}>
            {activeQuestion}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button"
              onClick={() => handleFeedback(true)}
              disabled={status === 'submitting'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: status === 'submitting' ? 'wait' : 'pointer', color: 'var(--text-main)', transition: 'all 0.2s', fontWeight: '500' }}
            >
              <ThumbsUp size={18} /> {t('btn_yes', 'Oui')}
            </button>
            <button 
              type="button"
              onClick={() => handleFeedback(false)}
              disabled={status === 'submitting'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: status === 'submitting' ? 'wait' : 'pointer', color: 'var(--text-main)', transition: 'all 0.2s', fontWeight: '500' }}
            >
              <ThumbsDown size={18} /> {t('btn_no', 'Non')}
            </button>
          </div>
        </>
      )}
      
      {status === 'error' && (
        <p style={{ color: '#b91c1c', margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>
          {t('feedback_error', "Une erreur est survenue lors de l'envoi de votre avis.")}
        </p>
      )}
    </div>
  );
}