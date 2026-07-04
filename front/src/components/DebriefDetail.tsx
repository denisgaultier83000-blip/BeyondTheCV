import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';

interface DebriefDetailProps {
  debriefId: string;
  onBack: () => void;
}

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div>
    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
    <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
      {children}
    </div>
  </div>
);

const TagList = ({ items }: { items: string[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
    {items.map(item => <span key={item} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem' }}>{item}</span>)}
  </div>
);

export function DebriefDetail({ debriefId, onBack }: DebriefDetailProps) {
  const [debrief, setDebrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebrief = async () => {
      setLoading(true);
      setError(null);
      try {
        // NOTE: Endpoint à créer: GET /api/debriefs/{debriefId}.
        // const response = await authenticatedFetch(`${API_BASE_URL}/api/debriefs/${debriefId}`);
        // if (!response.ok) throw new Error("Impossible de charger ce débrief.");
        // const data = await response.json();
        
        // --- Données de simulation ---
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData = {
          id: '1', company_name: 'Google', job_title: 'Software Engineer', interview_date: '2026-06-15', interlocutor_name: 'Jane Doe', interlocutor_role: 'Engineering Manager',
          ambiance: ["Positive", "Bienveillante"],
          positive_signals: ["Prochaines étapes claires", "Entretien > durée prévue"],
          red_flags: [],
          questions_asked: "- Comment gérez-vous la dette technique ?\n- Décrivez un projet complexe que vous avez mené.",
          difficult_questions: "La question sur la gestion de la dette technique était un peu vague.",
          learnings: "L'équipe travaille sur un nouveau projet de migration cloud vers GCP.",
          preparation_points: "Préparer des exemples plus chiffrés sur l'impact de mes projets.",
          interest_level: 5,
        };
        setDebrief(mockData);
        // --- Fin de la simulation ---

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDebrief();
  }, [debriefId]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', width: '90%', maxWidth: '800px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onBack} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ overflowY: 'auto', flex: 1, paddingTop: '3rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}><Loader2 size={32} className="spin" /></div>
          ) : error ? (
            <div style={{ color: 'var(--danger-text)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {error}</div>
          ) : debrief && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', textAlign: 'center', margin: 0 }}>
                Débrief: {debrief.company_name}
              </h2>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '-1rem' }}>
                {debrief.job_title} - {new Date(debrief.interview_date).toLocaleDateString('fr-FR')} avec {debrief.interlocutor_name} ({debrief.interlocutor_role})
              </div>

              <DetailSection title="Ambiance ressentie"><TagList items={debrief.ambiance} /></DetailSection>
              <DetailSection title="Signaux positifs"><TagList items={debrief.positive_signals} /></DetailSection>
              {debrief.red_flags.length > 0 && <DetailSection title="Signaux faibles / Alertes"><TagList items={debrief.red_flags} /></DetailSection>}

              <DetailSection title="Questions qui vous ont été posées"><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{debrief.questions_asked}</pre></DetailSection>
              <DetailSection title="Questions qui vous ont mis en difficulté"><p>{debrief.difficult_questions}</p></DetailSection>
              <DetailSection title="Informations apprises sur l'entreprise / le poste"><p>{debrief.learnings}</p></DetailSection>
              <DetailSection title="Points à préparer pour le prochain entretien"><p>{debrief.preparation_points}</p></DetailSection>

              <DetailSection title="Niveau d'intérêt après cet entretien">
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{['', 'Je ne suis plus intéressé', 'Intérêt faible', 'À creuser', 'Intéressé', 'Très intéressé'][debrief.interest_level]}</div>
              </DetailSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}