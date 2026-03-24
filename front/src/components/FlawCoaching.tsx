import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles, MessageSquare, AlertTriangle, Lightbulb } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

export default function FlawCoaching({ data, onBack }: { data: any, onBack: () => void }) {
  const { t } = useTranslation();
  const coachingList = data?.coaching || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1rem', width: '90%', maxWidth: '850px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
        
        <h2 style={{ textAlign: 'center', margin: '0 0 2rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: '1.8rem' }}>
          <Sparkles size={28} color="var(--primary)" />
          Parades aux Défauts (Entretien)
        </h2>

        {coachingList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
            Aucun défaut n'a été sélectionné lors de l'étape 5, l'analyse n'a donc pas été générée.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {coachingList.map((item: any, idx: number) => (
              <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                  <AlertTriangle size={22} /> Défaut abordé : {item.flaw}
                </h3>
                
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                      <MessageSquare size={18} color="var(--primary)" /> 🗣️ Réponse Courte (Entretien)
                    </h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '1rem', fontStyle: 'italic' }}>"{item.short_answer}"</p>
                  </div>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                      <Sparkles size={18} color="var(--primary)" /> 🧠 Storytelling (Réponse détaillée)
                    </h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>"{item.long_answer}"</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', fontSize: '0.95rem' }}>⚠️ Pièges à éviter</h4>
                    <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.to_avoid}</p>
                  </div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lightbulb size={16} /> Le Conseil du Coach
                    </h4>
                    <p style={{ margin: 0, color: 'var(--success)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.coach_advice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Section de Feedback (Pouces) affichée uniquement si on a des données */}
      {coachingList.length > 0 && (
        <FeedbackWidget 
          feature="parade_defauts" 
          question="Ces conseils vous sont-ils utiles ?" 
        />
      )}
      </div>
    </div>
  );
}
