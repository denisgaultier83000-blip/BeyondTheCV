import React, { useState } from 'react';
import { Mic, MessageSquare, RefreshCw, User, Briefcase, Star, Target, Play, X, HelpCircle, ChevronDown, CheckCircle2, Lightbulb } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { FeedbackWidget } from './FeedbackWidget';

export const InterviewTab = () => {
  const [subTab, setSubTab] = useState<'pitch' | 'qa'>('pitch');

  return (
    <div className="interview-tab-container">
      {/* Navigation interne */}
      <div className="cv-header">
        <div className="cv-type-selector">
          <button className={`cv-type-btn ${subTab === 'pitch' ? 'active' : ''}`} onClick={() => setSubTab('pitch')}>
            <Mic size={16} /> Pitch de 3 minutes
          </button>
          <button className={`cv-type-btn ${subTab === 'qa' ? 'active' : ''}`} onClick={() => setSubTab('qa')}>
            <MessageSquare size={16} /> Questionnaire IA
          </button>
        </div>
        <button className="btn-action btn-secondary-action" style={{ maxWidth: '200px', padding: '0.5rem 1rem' }}>
          <RefreshCw size={16} /> Rafraîchir l'IA
        </button>
      </div>

      <div>
        {subTab === 'pitch' ? <PitchSection /> : <QASection />}
      </div>
    </div>
  );
};

const PitchSection = () => {
  const { cvData } = useDashboard();
  const [teleprompterMode, setTeleprompterMode] = useState(false);
  const sections = [
    { key: "accroche", title: "Qui je suis (L'accroche)", icon: <User size={20} />, color: "var(--primary, #3b82f6)", bg: "rgba(59, 130, 246, 0.1)", placeholder: "Je suis un professionnel avec 5 ans d'expérience dans..." },
    { key: "preuve", title: "Ce que j'ai fait (La preuve)", icon: <Briefcase size={20} />, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", placeholder: "J'ai notamment dirigé le projet X qui a permis de..." },
    { key: "valeur", title: "Ce que j'apporte (La valeur)", icon: <Star size={20} />, color: "var(--warning, #eab308)", bg: "rgba(234, 179, 8, 0.1)", placeholder: "Mon expertise me permet de résoudre rapidement..." },
    { key: "projection", title: "Pourquoi ce poste (La projection)", icon: <Target size={20} />, color: "var(--success, #10b981)", bg: "rgba(16, 185, 129, 0.1)", placeholder: "Je postule chez vous car votre vision résonne avec..." }
  ];

  return (
    <>
      <div className="pitch-grid">
        {sections.map((sec, i) => (
          <div key={i} className="pitch-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: sec.bg, color: sec.color, padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>{sec.icon}</div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>{sec.title}</h3>
            </div>
            <textarea className="pitch-textarea" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} placeholder={sec.placeholder} defaultValue={cvData?.pitch?.[sec.key] || ""}></textarea>
          </div>
        ))}
        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}><Mic size={20} /> Aperçu complet (Lecture à voix haute)</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>L'objectif est de pouvoir le lire de manière fluide en moins de 3 minutes.</p>
          </div>
          <button 
            className="btn-action btn-primary-action" 
            style={{ maxWidth: '250px' }}
            onClick={() => setTeleprompterMode(true)}
          >
            <Play size={16} /> Mode Téléprompteur
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <FeedbackWidget feature="pitch_generator" question="Ce pitch met-il bien en valeur votre profil ?" />
      </div>

      {/* Mode Téléprompteur Plein Écran */}
      {teleprompterMode && (
        <div className="teleprompter-overlay">
          <button className="teleprompter-close" onClick={() => setTeleprompterMode(false)} title="Fermer">
            <X size={24} />
          </button>
          <div className="teleprompter-text-container">
            <p className="teleprompter-paragraph">Bonjour, je suis un professionnel avec 5 ans d'expérience dans l'architecture Cloud.</p>
            <p className="teleprompter-paragraph">J'ai notamment dirigé la migration vers AWS pour le projet X, ce qui a permis de réduire les coûts d'infrastructure de 30% tout en augmentant la disponibilité.</p>
            <p className="teleprompter-paragraph">Mon expertise technique couplée à ma vision FinOps me permet de résoudre rapidement les goulots d'étranglement de vos équipes de développement.</p>
            <p className="teleprompter-paragraph" style={{ marginBottom: '150px' }}>Je postule chez vous aujourd'hui car votre vision d'un écosystème sécurisé by design résonne parfaitement avec mes ambitions d'architecte.</p>
          </div>
          <div style={{ position: 'absolute', bottom: '2rem', color: '#64748b', fontSize: '0.9rem' }}>Lisez à voix haute (Survolez le texte pour le mettre en évidence)</div>
        </div>
      )}
    </>
  );
};

const QASection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  // Mock enrichi
  const mockQuestions = [
    { category: "Conscience de soi", question: "Quels sont vos 3 principaux défauts ?", suggested_answer: "Je suis parfois trop perfectionniste...", advice: "Ne niez pas le défaut." },
    { category: "Culture & Curiosité", question: "Quelle a été votre principale difficulté ?", suggested_answer: "La gestion des dépendances techniques...", advice: "Restez factuel." },
    { category: "Technique", question: "Pourquoi privilégier Terraform plutôt qu'Ansible ?", suggested_answer: "Terraform est axé sur l'infrastructure immuable...", advice: "Montrez que vous connaissez leurs limites respectives." }
  ];

  return (
    <>
      <div className="qa-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {mockQuestions.map((q, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="qa-item" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="qa-header" onClick={() => setOpenIndex(isOpen ? null : i)}>
                <div className="qa-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}><HelpCircle size={20} /></div>
                <div className="qa-question-content"><div className="qa-category" style={{ color: 'var(--text-muted)' }}>{q.category}</div><h3 className="qa-question" style={{ color: 'var(--text-main)' }}>{q.question}</h3></div>
                <div className={`qa-chevron ${isOpen ? 'open' : ''}`} style={{ color: 'var(--text-muted)' }}><ChevronDown size={20} /></div>
              </div>
              {isOpen && <div className="qa-body"><div className="qa-answer-box" style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}><div className="qa-answer-title" style={{ color: 'var(--success)' }}><CheckCircle2 size={16} /> Suggestion de réponse (Éditable)</div><textarea className="qa-answer-textarea" style={{ color: 'var(--text-main)' }} defaultValue={q.suggested_answer} /></div><div className="qa-advice" style={{ color: 'var(--text-muted)' }}><Lightbulb size={16} color="var(--warning)" style={{flexShrink:0}}/> {q.advice}</div></div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <FeedbackWidget feature="interview_qa" question="Ces questions d'entraînement sont-elles pertinentes ?" />
      </div>
    </>
  );
};