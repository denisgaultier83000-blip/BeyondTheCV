import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, MessageSquare, Printer, ArrowLeft, CheckCircle2, Lightbulb } from 'lucide-react';

interface QuestionnaireProps {
  questions: any[];
  onBack?: () => void;
  onPrint?: (questions: any[]) => void;
  onUpdate?: (index: number, field: string, value: any) => void; // [NEW] Prop pour l'édition
  loading?: boolean;
  hideHeader?: boolean;
}

export default function Questionnaire({ questions, onBack, onPrint, onUpdate, loading, hideHeader }: QuestionnaireProps) {
  const { t } = useTranslation();

  return (
    <div className={hideHeader ? "" : "step-content"} style={{ maxWidth: '1200px', margin: '0 auto', padding: hideHeader ? '0' : '20px' }}>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          {onBack ? (
            <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> {t('back_productions') || 'Retour'}
            </button>
          ) : <div />}
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
            <MessageSquare size={28} color="var(--primary)" />
            {t('card_interview_title') || 'Questionnaire d\'Entretien'}
          </h2>
          {onPrint ? (
            <button onClick={() => onPrint(questions)} className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> {loading ? t('generating') : (t('print') || 'Imprimer')}
            </button>
          ) : <div />}
        </div>
      )}

      <style>{`
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .staggered-card { animation: slideUpFade 0.5s ease-out forwards; opacity: 0; }
      `}</style>

      {/* Affichage pleine largeur (1fr) pour plus de lisibilité avec animation en cascade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {questions.map((q, idx) => (
          <div key={idx} className="staggered-card" style={{ 
            background: 'var(--bg-card)', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s ease-in-out',
            cursor: 'default',
            animationDelay: `${idx * 0.1}s` /* Apparition au fil de l'eau */
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ 
                background: '#eff6ff', 
                padding: '0.6rem', 
                borderRadius: '10px', 
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <HelpCircle size={22} />
              </div>
              <div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  textTransform: 'uppercase', 
                  fontWeight: '700', 
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                  display: 'block',
                  letterSpacing: '0.05em'
                }}>
                  {q.category || 'Question'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '600' }}>
                  {q.question}
                </h3>
              </div>
            </div>

            {q.suggested_answer && (
              <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.9rem', color: '#166534' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  <CheckCircle2 size={16} /> 
                  <span>Suggestion de réponse (Éditable)</span>
                </div>
                {/* [FIX] Textarea éditable pour la réponse */}
                <textarea 
                  defaultValue={q.suggested_answer || ""} 
                  onChange={(e) => onUpdate && onUpdate(idx, "suggested_answer", e.target.value)}
                  style={{ 
                      width: "100%", 
                      background: "transparent", 
                      border: "none", 
                      resize: "vertical", 
                      color: "#166534", 
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      lineHeight: "1.5",
                      minHeight: "80px",
                      outline: "none"
                  }}
                  placeholder="Rédigez votre réponse ici..."
                />
              </div>
            )}
            
            {q.advice && (
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                 <Lightbulb size={16} style={{ flexShrink: 0, color: '#eab308' }} /> 
                 <span>{q.advice}</span>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}