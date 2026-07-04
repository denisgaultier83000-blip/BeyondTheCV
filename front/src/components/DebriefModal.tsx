import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, CheckCircle2, History } from 'lucide-react';
import { DebriefHistoryModal } from './DebriefHistoryModal'; // Nouveau composant pour l'historique

interface DebriefModalProps {
  onClose: () => void;
  cvData: any; // Pour pré-remplir entreprise/poste
}

const CheckboxGroup = ({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (value: string) => void }) => (
  <div>
    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>{title}</h4>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
              background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const InterestSlider = ({ value, onChange }: { value: number, onChange: (value: number) => void }) => (
  <div>
    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Votre niveau d'intérêt après cet entretien</h4>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Plus du tout</span>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ flex: 1, accentColor: 'var(--primary)' }}
      />
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Très intéressé</span>
    </div>
    <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>
      {['', 'Je ne suis plus intéressé', 'Intérêt faible', 'À creuser', 'Intéressé', 'Très intéressé'][value]}
    </div>
  </div>
);

export function DebriefModal({ onClose, cvData }: DebriefModalProps) {
  const [state, setState] = useState({
    company_name: cvData?.target_company || '',
    job_title: cvData?.target_job || '',
    interview_date: new Date().toISOString().split('T')[0],
    interview_format: 'visio',
    interlocutor_type: 'rh',
    interlocutor_name: '',
    interlocutor_role: '',
    ambiance: [],
    positive_signals: [],
    red_flags: [],
    questions_asked: '',
    difficult_questions: '',
    learnings: '',
    preparation_points: '',
    interest_level: 3,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // État pour afficher l'historique

  const handleChange = (field: string, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: 'ambiance' | 'positive_signals' | 'red_flags', value: string) => {
    setState(prev => {
      const current = prev[field] as string[];
      const newSelection = current.includes(value) ? current.filter(item => item !== value) : [...current, value];
      return { ...prev, [field]: newSelection };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Ici, vous appellerez votre endpoint POST /api/debriefs
    console.log("Submitting debrief:", state);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simule un appel réseau
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 2000); // Ferme la modale après 2s
  };

  const ambianceOptions = ["Très positive", "Positive", "Neutre", "Froide", "Tendue", "Floue", "Bienveillante"];
  const positiveSignalsOptions = ["Prochaines étapes claires", "Entretien > durée prévue", "Le recruteur 'vend' le poste", "Questions sur la disponibilité", "Évocation du salaire"];
  const redFlagsOptions = ["Poste mal défini", "Objectifs flous", "Turnover évoqué", "Urgence suspecte", "Manager peu clair", "Contradictions"];

  if (showHistory) {
    return <DebriefHistoryModal onClose={() => setShowHistory(false)} />;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', width: '90%', maxWidth: '800px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>
            Débrief d'Entretien
          </h2>
          <button type="button" onClick={() => setShowHistory(true)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={16} /> Voir l'historique</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle2 size={48} color="var(--success)" />
            <p style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 500 }}>Votre compte rendu a bien été enregistré !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ overflowY: 'auto', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Infos Générales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label>Date de l'entretien</label>
                <input type="date" value={state.interview_date} onChange={e => handleChange('interview_date', e.target.value)} required />
              </div>
              <div>
                <label>Nom de l'interlocuteur</label>
                <input type="text" value={state.interlocutor_name} onChange={e => handleChange('interlocutor_name', e.target.value)} placeholder="Ex: Jean Dupont" required />
              </div>
              <div>
                <label>Fonction de l'interlocuteur</label>
                <input type="text" value={state.interlocutor_role} onChange={e => handleChange('interlocutor_role', e.target.value)} placeholder="Ex: DRH" required />
              </div>
            </div>

            {/* Ambiance & Signaux */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <CheckboxGroup title="Ambiance ressentie" options={ambianceOptions} selected={state.ambiance} onChange={(v) => handleCheckboxChange('ambiance', v)} />
              <CheckboxGroup title="Signaux positifs" options={positiveSignalsOptions} selected={state.positive_signals} onChange={(v) => handleCheckboxChange('positive_signals', v)} />
              <CheckboxGroup title="Signaux faibles / Alertes" options={redFlagsOptions} selected={state.red_flags} onChange={(v) => handleCheckboxChange('red_flags', v)} />
            </div>

            {/* Zones de texte */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Questions qui vous ont été posées</label>
                <textarea value={state.questions_asked} onChange={e => handleChange('questions_asked', e.target.value)} rows={4} placeholder="Listez les questions clés..."></textarea>
              </div>
              <div>
                <label>Questions qui vous ont mis en difficulté</label>
                <textarea value={state.difficult_questions} onChange={e => handleChange('difficult_questions', e.target.value)} rows={4} placeholder="Sur quoi avez-vous hésité ?"></textarea>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Informations apprises sur l'entreprise / le poste</label>
                <textarea value={state.learnings} onChange={e => handleChange('learnings', e.target.value)} rows={3} placeholder="Nouveaux enjeux, projets mentionnés..."></textarea>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Points à préparer pour le prochain entretien</label>
                <textarea value={state.preparation_points} onChange={e => handleChange('preparation_points', e.target.value)} rows={3} placeholder="Ex: Préparer les chiffres du marché X..."></textarea>
              </div>
            </div>

            {/* Intérêt */}
            <InterestSlider value={state.interest_level} onChange={(v) => handleChange('interest_level', v)} />

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                {loading ? 'Enregistrement...' : 'Enregistrer mon débrief'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}