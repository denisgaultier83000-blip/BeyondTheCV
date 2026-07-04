import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, Zap, Lightbulb, CheckCircle2, ShieldAlert, Mail, Copy, Check, MessageSquareQuote, Wand2 } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { BulletList } from './BulletList';

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

const AnalysisSection = ({ title, icon, children, color = 'var(--primary)' }: { title: string, icon: React.ReactNode, children: React.ReactNode, color?: string }) => (
  <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color, fontWeight: 600, fontSize: '1.05rem' }}>
      {icon} {title}
    </h4>
    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
      {children}
    </div>
  </div>
);

const AnalysisResultDisplay = ({ analysis }: { analysis: any }) => {
  if (!analysis) return null;
  const summary = analysis.post_interview_summary;
  if (!summary) return <p>L'analyse n'a pas pu être structurée correctement.</p>;

  // [NOUVEAU] État pour rendre le mail éditable et copiable
  const [editedEmail, setEditedEmail] = useState(summary.next_interview_preparation?.follow_up_email || '');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // S'assure que le champ est mis à jour si une nouvelle analyse est lancée
    setEditedEmail(summary.next_interview_preparation?.follow_up_email || '');
  }, [summary.next_interview_preparation?.follow_up_email]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(editedEmail);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '2px dashed var(--border-color)', paddingTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', textAlign: 'center', margin: 0 }}>
        Analyse Stratégique & Plan d'Action
      </h2>

      <AnalysisSection title="Évaluation Globale" icon={<Lightbulb size={20} />}>
        <p>{summary.overall_assessment}</p>
      </AnalysisSection>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {summary.positive_signals?.length > 0 && (
          <AnalysisSection title="Signaux Positifs" icon={<CheckCircle2 size={20} />} color="var(--success)">
            <BulletList items={summary.positive_signals.map((s: any) => s.signal)} type="success" />
          </AnalysisSection>
        )}
        {summary.risk_signals?.length > 0 && (
          <AnalysisSection title="Zones de Vigilance" icon={<ShieldAlert size={20} />} color="var(--danger-text)">
            <BulletList items={summary.risk_signals.map((s: any) => s.signal)} type="danger" />
          </AnalysisSection>
        )}
      </div>

      {summary.weak_answers_to_improve?.length > 0 && (
        <AnalysisSection title="Points Faibles à Corriger" icon={<Zap size={20} />} color="var(--warning)">
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {summary.weak_answers_to_improve.map((item: any, index: number) => (
              <div key={index} style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: 'var(--warning)', fontWeight: 700, fontSize: '1rem' }}>
                  <AlertTriangle size={18} /> {item.identified_weakness}
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                  <div style={{ borderLeft: '3px solid rgba(245, 158, 11, 0.4)', paddingLeft: '1rem' }}>
                    <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Analyse du Coach :</strong>
                    <em style={{ color: 'var(--text-main)' }}>{item.coach_analysis}</em>
                  </div>
                  <div style={{ borderLeft: '3px solid rgba(16, 185, 129, 0.4)', paddingLeft: '1rem' }}>
                    <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.25rem' }}>Suggestion de réponse :</strong>
                    <p style={{ margin: 0, color: 'var(--text-main)' }}>{item.suggested_improvement}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AnalysisSection>
      )}

      {summary.next_interview_preparation?.follow_up_email && (
        <AnalysisSection title="Suggestion de Mail de Suivi" icon={<Mail size={20} />}>
          <textarea
            value={editedEmail}
            onChange={(e) => setEditedEmail(e.target.value)}
            rows={12}
            style={{
              width: '100%', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem',
              padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)',
              background: 'var(--bg-body)', color: 'var(--text-main)', resize: 'vertical',
              transition: 'border-color 0.2s', outline: 'none'
            }}
          />
          <button onClick={handleCopyEmail} className="btn-secondary" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCopied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
            {isCopied ? "Copié !" : "Copier le texte"}
          </button>
        </AnalysisSection>
      )}
    </div>
  );
};

export function DebriefDetail({ debriefId, onBack }: DebriefDetailProps) {
  const [debrief, setDebrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebrief = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/debriefs/${debriefId}`);
        if (!response.ok) throw new Error("Impossible de charger ce débrief.");
        const data = await response.json();
        setDebrief(data);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDebrief();
  }, [debriefId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/debriefs/${debriefId}/analyze`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "L'analyse a échoué.");
      }
      const data = await response.json();
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', width: '90%', maxWidth: '800px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: '1.5rem', left: '1.5rem', right: '1.5rem' }}>
          <button onClick={onBack} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px' }}>
            <ArrowLeft size={20} />
          </button>
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isAnalyzing ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
            {isAnalyzing ? "Analyse en cours..." : "Analyser et Préparer la suite"}
          </button>
        </div>

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

              {analysisError && (
                <div style={{ color: 'var(--danger-text)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <AlertTriangle size={18} /> {analysisError}
                </div>
              )}
              {isAnalyzing && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', gap: '1rem' }}><Loader2 size={32} className="spin" /> Analyse IA en cours...</div>}
              {analysisResult && <AnalysisResultDisplay analysis={analysisResult} />}
           </div>
          )}
        </div>
      </div>
    </div>
  );
}