import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, Plus, Trash2, CheckCircle2, MessageSquare, Shield, Award, Edit3, ArrowRight, Loader2 } from 'lucide-react';
import AutoResizeTextarea from './AutoResizeTextarea';
import { authenticatedFetch } from '../utils/auth';
import { useDashboard } from '../hooks/DashboardContext';
import { useModuleContext } from '../context/ModuleContext';
import { Button } from './common';

export interface Differentiator {
  id?: string;
  fact: string;
  proof: string;
  interpretation: string;
  interview_usage: string;
  oral_phrasing?: string;
  source?: string;
  raw_user_story?: string;
  category?: string;
}

interface DifferentiatorsSectionProps {
  offCvText?: string;
  onOffCvTextChange?: (text: string) => void;
  cvData?: any;
}

export const DifferentiatorsSection: React.FC<DifferentiatorsSectionProps> = ({
  offCvText: initialOffCvText = '',
  onOffCvTextChange,
  cvData: propCvData
}) => {
  const dashboard = useDashboard();
  const updateFormData = dashboard?.updateFormData;
  const cvData = propCvData || dashboard?.cvData;
  const { module } = useModuleContext();
  const accentColor = `var(--mod-${module}-accent)`;
  const bgSoftColor = `var(--mod-${module}-bg-soft)`;

  const [offCvText, setOffCvText] = useState<string>(
    initialOffCvText || cvData?.off_cv_text || ''
  );
  const [differentiators, setDifferentiators] = useState<Differentiator[]>(
    cvData?.differentiators || []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [deepening, setDeepening] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Clarification state
  const [showQuestionsModal, setShowQuestionsModal] = useState<boolean>(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});

  // New manual differentiator modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDiff, setNewDiff] = useState<Differentiator>({
    fact: '',
    proof: '',
    interpretation: '',
    interview_usage: '',
    oral_phrasing: '',
    category: 'general'
  });

  useEffect(() => {
    fetchDifferentiators();
  }, []);

  const syncContext = (newDiffs: Differentiator[], newOffCvText?: string) => {
    if (updateFormData) {
      updateFormData('differentiators', newDiffs);
      if (newOffCvText !== undefined) {
        updateFormData('off_cv_text', newOffCvText);
      }
    }
  };

  const fetchDifferentiators = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/differentiators/me');
      if (res.ok) {
        const data = await res.json();
        const fetchedDiffs = data.differentiators || [];
        const fetchedOffCv = data.off_cv_text || '';
        setDifferentiators(fetchedDiffs);
        if (fetchedOffCv && !offCvText) {
          setOffCvText(fetchedOffCv);
          if (onOffCvTextChange) onOffCvTextChange(fetchedOffCv);
        }
        syncContext(fetchedDiffs, fetchedOffCv || offCvText);
      }
    } catch (e) {
      console.error("Error fetching differentiators:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOffCvText = async (text: string) => {
    setOffCvText(text);
    if (onOffCvTextChange) onOffCvTextChange(text);
    syncContext(differentiators, text);

    try {
      await authenticatedFetch('/api/differentiators/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ off_cv_text: text, differentiators })
      });
    } catch (e) {
      console.error("Error saving off-CV text:", e);
    }
  };

  const handleExtractDifferentiators = async () => {
    setExtracting(true);
    setMessage('');
    try {
      const res = await authenticatedFetch('/api/differentiators/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          off_cv_text: offCvText,
          cv_data: cvData,
          target_language: 'fr'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.differentiators && data.differentiators.length > 0) {
          const nextList = [...data.differentiators, ...differentiators];
          setDifferentiators(nextList);
          syncContext(nextList, offCvText);
          setMessage(`✨ ${data.differentiators.length} marqueurs différenciants détectés par l'IA !`);
        } else {
          setMessage("L'IA n'a pas trouvé de nouveaux marqueurs. Essayez de détailler votre champ ci-dessus.");
        }
      }
    } catch (e) {
      console.error("Error extracting differentiators:", e);
      setMessage("Erreur lors de l'extraction par l'IA.");
    } finally {
      setExtracting(false);
    }
  };

  const handleDeepenStory = async () => {
    if (!offCvText.trim()) {
      setMessage("Veuillez d'abord rédiger votre expérience dans la zone de texte ci-dessus.");
      return;
    }

    setDeepening(true);
    setMessage('');
    try {
      const res = await authenticatedFetch('/api/differentiators/deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_story: offCvText,
          target_language: 'fr'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.needs_clarification && data.clarifying_questions) {
          setClarifyingQuestions(data.clarifying_questions);
          setClarifyingAnswers({});
          setShowQuestionsModal(true);
        } else if (data.differentiator) {
          const nextList = [data.differentiator, ...differentiators];
          setDifferentiators(nextList);
          syncContext(nextList, offCvText);
          setMessage("✨ Votre marqueur à été consolidé et enregistré !");
        }
      }
    } catch (e) {
      console.error("Error deepening story:", e);
      setMessage("Erreur lors de l'analyse approfondie.");
    } finally {
      setDeepening(false);
    }
  };

  const handleSubmitClarificationAnswers = async () => {
    setDeepening(true);
    try {
      const res = await authenticatedFetch('/api/differentiators/deepen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_story: offCvText,
          previous_answers: clarifyingAnswers,
          target_language: 'fr'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.differentiator) {
          const nextList = [data.differentiator, ...differentiators];
          setDifferentiators(nextList);
          syncContext(nextList, offCvText);
          setShowQuestionsModal(false);
          setMessage("✨ Votre marqueur à été validé et ajouté à votre bibliothèque !");
        }
      }
    } catch (e) {
      console.error("Error submitting clarification:", e);
    } finally {
      setDeepening(false);
    }
  };

  const handleDeleteDifferentiator = async (id?: string, index?: number) => {
    if (id) {
      try {
        await authenticatedFetch(`/api/differentiators/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error("Error deleting differentiator:", e);
      }
    }
    const nextList = differentiators.filter((item, idx) => item.id ? item.id !== id : idx !== index);
    setDifferentiators(nextList);
    syncContext(nextList, offCvText);
  };

  const handleAddManualDifferentiator = async () => {
    if (!newDiff.fact || !newDiff.proof) return;
    
    const diffToSave: Differentiator = {
      ...newDiff,
      source: 'manual'
    };

    const nextList = [diffToSave, ...differentiators];
    setDifferentiators(nextList);
    syncContext(nextList, offCvText);

    setShowAddModal(false);
    setNewDiff({ fact: '', proof: '', interpretation: '', interview_usage: '', oral_phrasing: '', category: 'general' });

    try {
      const res = await authenticatedFetch('/api/differentiators/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ off_cv_text: offCvText, differentiators: nextList })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.differentiators) {
          setDifferentiators(data.differentiators);
          syncContext(data.differentiators, offCvText);
        }
      }
    } catch (e) {
      console.error("Error saving manual differentiator:", e);
    }
  };

  return (
    <div className="differentiators-section" style={{ marginTop: '1.5rem' }}>
      {/* CARD 1: CE QUE VOTRE CV NE DIT PAS */}
      <div className="bento-card" style={{ background: 'var(--bg-card)', marginBottom: '1.5rem', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Sparkles color={accentColor} size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Ce que votre CV ne dit pas
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Identifiez vos expériences hors-normes et accomplissements personnels que votre CV sous-estime ou oublie.
            </p>
          </div>
        </div>

        <div style={{ padding: '0.85rem', background: bgSoftColor, borderRadius: '0.5rem', borderLeft: `4px solid ${accentColor}`, marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--text-main)' }}>
          <strong>Avez-vous vécu, construit ou accompli quelque chose qui pourrait en dire long sur vous ?</strong>
          <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
            <em>Idées d'exemples :</em> Sport de compétition, projet personnel, voyage/expatriation, engagement associatif, création d'entreprise, défi technique relevé en autonomie, responsabilités inhabituelles...
          </div>
        </div>

        <AutoResizeTextarea
          value={offCvText}
          onChange={(e) => handleSaveOffCvText(e.target.value)}
          placeholder="Racontez ici librement vos aventures, projets ou défis (ex: 'J'ai fait un tour du monde en catamaran de 14 mois' ou 'Champion départemental de boxe pendant 8 ans')..."
          minHeight={110}
          className="form-control"
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={handleExtractDifferentiators}
            disabled={extracting}
            isLoading={extracting}
            icon={<Sparkles size={16} />}
          >
            Détecter tous mes marqueurs (IA)
          </Button>

          <Button
            variant="secondary"
            onClick={handleDeepenStory}
            disabled={deepening || !offCvText.trim()}
            isLoading={deepening}
            icon={<HelpCircle size={16} />}
          >
            Creuser cette expérience avec l'IA
          </Button>
        </div>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: '#DCFCE7', color: '#065f46', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #a7f3d0' }}>
            {message}
          </div>
        )}
      </div>

      {/* CARD 2: BIBLIOTHÈQUE DES MARQUEURS DIFFÉRENCIANTS */}
      <div className="bento-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award color="var(--mod-speech-accent)" size={22} /> Vos Marqueurs Différenciants ({differentiators.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Les atouts uniques de votre histoire formalisés en faits, preuves et arguments d'entretien.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderColor: 'var(--mod-speech-accent)', color: 'var(--mod-speech-accent)' }}
          >
            <Plus size={16} /> Ajouter un marqueur
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 className="spin" size={24} style={{ marginBottom: '0.5rem' }} />
            <p>Chargement de vos marqueurs...</p>
          </div>
        ) : differentiators.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: '0.75rem', color: 'var(--text-muted)' }}>
            <Award size={36} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>Aucun marqueur différenciant enregistré pour l'instant.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Remplissez le champ « Ce que votre CV ne dit pas » ci-dessus ou cliquez sur « Détecter tous mes marqueurs ».
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {differentiators.map((diff, index) => {
              const catLower = (diff.category || '').toLowerCase();
              let badgeBg = '#F3E8FF';
              let badgeColor = '#5b21b6';
              if (catLower.includes('impact') || catLower.includes('result') || catLower.includes('performance')) {
                badgeBg = '#DCFCE7'; badgeColor = '#065f46';
              } else if (catLower.includes('leadership') || catLower.includes('management') || catLower.includes('equipe')) {
                badgeBg = '#DCEEFF'; badgeColor = '#1e40af';
              } else if (catLower.includes('sport') || catLower.includes('perseverance') || catLower.includes('effort')) {
                badgeBg = '#FFF4D6'; badgeColor = '#92400e';
              }

              return (
                <div
                  key={diff.id || index}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: '0.75rem',
                    padding: '1.2rem',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${badgeColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    position: 'relative'
                  }}
                >
                  <button
                    onClick={() => handleDeleteDifferentiator(diff.id, index)}
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.7 }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div>
                    <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: badgeBg, color: badgeColor, fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      {diff.category || 'Marqueur'}
                    </div>

                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', paddingRight: '1.5rem' }}>
                      {diff.fact}
                    </h4>

                    <div style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                      <strong>Preuve :</strong> {diff.proof}
                    </div>

                    <div style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-main)' }}>
                      <strong>Ce que cela révèle :</strong> {diff.interpretation}
                    </div>

                    <div style={{ fontSize: '0.85rem', marginBottom: '0.8rem', color: '#2878C8', fontWeight: 600 }}>
                      <strong>À placer si... :</strong> {diff.interview_usage}
                    </div>

                    {diff.oral_phrasing && (
                      <div style={{ padding: '0.65rem 0.85rem', background: 'var(--mod-speech-bg-soft)', borderRadius: '0.5rem', borderLeft: '3px solid var(--mod-speech-accent)', fontSize: '0.82rem', color: '#4c1d95', fontStyle: 'italic' }}>
                        💬 <em>« {diff.oral_phrasing} »</em>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CLARIFICATION IA */}
      {showQuestionsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: '1rem', maxWidth: '600px', width: '100%', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Précisions pour ancrer votre marqueur avec preuve
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Pour éviter les phrases RH génériques, l'IA a besoin de quelques détails factuels :
            </p>

            {clarifyingQuestions.map((q, idx) => (
              <div key={idx} style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                  {q}
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                  value={clarifyingAnswers[q] || ''}
                  onChange={(e) => setClarifyingAnswers({ ...clarifyingAnswers, [q]: e.target.value })}
                  placeholder="Votre réponse concise..."
                />
              </div>
            ))}

            <div style={{ display: 'flex', justifySelf: 'end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button onClick={() => setShowQuestionsModal(false)} className="btn-outline">
                Annuler
              </button>
              <button onClick={handleSubmitClarificationAnswers} disabled={deepening} className="btn-primary">
                {deepening ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                Valider mon marqueur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT MANUEL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '1.75rem', borderRadius: '1rem', maxWidth: '550px', width: '100%', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Ajouter un marqueur différenciant
            </h3>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Élément décelé (Fait)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Champion départemental de boxe"
                value={newDiff.fact}
                onChange={e => setNewDiff({ ...newDiff, fact: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Preuve concrète</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 8 ans de pratique, 5 entraînements/semaine"
                value={newDiff.proof}
                onChange={e => setNewDiff({ ...newDiff, proof: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Ce que cela révèle (Qualité/Mindset)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Discipline, régularité, gestion de la pression"
                value={newDiff.interpretation}
                onChange={e => setNewDiff({ ...newDiff, interpretation: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>À placer en entretien si...</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Question sur la persévérance ou le stress"
                value={newDiff.interview_usage}
                onChange={e => setNewDiff({ ...newDiff, interview_usage: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.2rem' }}>Formulation orale proposée</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 'La boxe m'a appris à absorber la pression...'"
                value={newDiff.oral_phrasing || ''}
                onChange={e => setNewDiff({ ...newDiff, oral_phrasing: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowAddModal(false)} className="btn-outline">Annuler</button>
              <button onClick={handleAddManualDifferentiator} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
