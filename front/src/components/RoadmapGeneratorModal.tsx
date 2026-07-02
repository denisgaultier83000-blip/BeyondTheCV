import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Map, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, CheckSquare, Clock, ChevronsRight, ChevronsLeft, UserCheck } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface RoadmapGeneratorModalProps {
  onClose: () => void;
}

export default function RoadmapGeneratorModal({ onClose }: RoadmapGeneratorModalProps) {
  const { t } = useTranslation();
  const { cvData } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [selections, setSelections] = useState({
    type: cvData?.interview_format || 'visio',
    interlocutor: cvData?.interview_type || 'manager',
    level: cvData?.seniority_level || 'mid',
    context: 'first_interview',
  });

  const handleChange = (field: keyof typeof selections, value: string) => {
    setSelections(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // NOTE: L'endpoint /api/cv/generate-roadmap est à créer côté backend.
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: selections,
          profile: cvData,
        }),
      });

      if (!response.ok) {
        throw new Error("La génération de la feuille de route a échoué. Veuillez réessayer.");
      }

      const data = await response.json();
      setResult(data.roadmap);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const SelectField = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: { value: string, label: string }[] }) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</label>
      <select value={value} onChange={onChange} className="select-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', background: 'var(--bg-secondary)'}}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  // --- NOUVEAU : Sous-composants pour l'affichage des résultats ---
  const RoadmapSection = ({ title, icon, children, color = 'var(--text-main)' }: { title: string, icon: React.ReactNode, children: React.ReactNode, color?: string }) => (
    <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
      <h4 style={{ fontWeight: 'bold', color, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '1.125rem' }}>{icon} {title}</h4>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.25rem' }}>
        {children}
      </div>
    </div>
  );

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="space-y-2">
      {items.map((item, index) => <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}><ChevronsRight size={16} color="var(--primary)" style={{ marginTop: '0.125rem', flexShrink: 0 }}/><span>{item}</span></li>)}
    </ul>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem',
        width: '90%', maxWidth: '700px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Map size={28} color="var(--primary)" />
            Générateur de Feuille de Route
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Configurez le contexte de votre entretien pour un plan sur-mesure.</p>
        </div>

        {!result ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <SelectField
                label="Type d'entretien"
                value={selections.type}
                onChange={(e) => handleChange('type', e.target.value)}
                options={[
                  { value: 'visio', label: 'Visioconférence' },
                  { value: 'presentiel', label: 'Présentiel' },
                  { value: 'telephone', label: 'Téléphonique' },
                ]}
              />
              <SelectField
                label="Interlocuteur"
                value={selections.interlocutor}
                onChange={(e) => handleChange('interlocutor', e.target.value)}
                options={[
                  { value: 'rh', label: 'RH / Recruteur' },
                  { value: 'manager', label: 'Manager Opérationnel' },
                  { value: 'dg', label: 'Direction / C-Level' },
                  { value: 'cabinet', label: 'Cabinet de recrutement' },
                ]}
              />
              <SelectField
                label="Niveau de poste"
                value={selections.level}
                onChange={(e) => handleChange('level', e.target.value)}
                options={[
                  { value: 'junior', label: 'Junior' },
                  { value: 'mid', label: 'Confirmé' },
                  { value: 'senior', label: 'Senior / Expert' },
                  { value: 'director', label: 'Direction' },
                ]}
              />
              <SelectField
                label="Contexte"
                value={selections.context}
                onChange={(e) => handleChange('context', e.target.value)}
                options={[
                  { value: 'first_interview', label: 'Premier entretien' },
                  { value: 'final_interview', label: 'Entretien final' },
                  { value: 'negotiation', label: 'Négociation salariale' },
                  { value: 'reconversion', label: 'Reconversion' },
                ]}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                {loading ? "Génération en cours..." : "Générer mon plan"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--primary)' }}>{result.title}</h3>

            <RoadmapSection title="Focus du Recruteur" icon={<Target size={20} />} color="var(--primary-dark)">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.75rem' }}>Ce que votre interlocuteur cherchera à valider en priorité.</p>
              <BulletList items={result.recruiter_focus || []} />
            </RoadmapSection>

            <RoadmapSection title="Messages Clés à Marteler" icon={<MessageCircle size={20} />} color="var(--success-dark)">
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.75rem' }}>Les 3 idées que vous devez absolument faire passer, peu importe les questions.</p>
              <BulletList items={result.key_messages || []} />
            </RoadmapSection>

            <RoadmapSection title="Règles d'Or" icon={<Star size={20} />} color="var(--warning-dark)">
              <BulletList items={result.golden_rules || []} />
            </RoadmapSection>

            <RoadmapSection title="Erreurs à Éviter" icon={<Shield size={20} />} color="var(--danger-dark)">
              <BulletList items={result.mistakes_to_avoid || []} />
            </RoadmapSection>

            <RoadmapSection title="Check-list Avant Entretien" icon={<CheckSquare size={20} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> 24h avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_24 || []} /></div>
                <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> 1h avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_1 || []} /></div>
                <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> 5 min avant</h5><BulletList items={result.pre_interview_checklist?.h_minus_5 || []} /></div>
              </div>
            </RoadmapSection>

            <RoadmapSection title="Phrase d'Ouverture" icon={<ChevronsRight size={20} />}>
              <p style={{ fontStyle: 'italic' }}>"{result.opening_statement}"</p>
            </RoadmapSection>
            <RoadmapSection title="Phrase de Conclusion" icon={<ChevronsLeft size={20} />}>
              <p style={{ fontStyle: 'italic' }}>"{result.closing_statement}"</p>
            </RoadmapSection>
            <RoadmapSection title="Conseils de Posture" icon={<UserCheck size={20} />}>
              <p>{result.posture_advice}</p>
            </RoadmapSection>

            <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setResult(null)} className="btn-secondary">Générer un autre plan</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}