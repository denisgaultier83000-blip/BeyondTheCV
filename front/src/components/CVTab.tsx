import React, { useState, useEffect } from 'react';
import { FileText, Download, Target, AlertTriangle, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

export const CVTab = ({ data }: { data: any }) => {
  // États pour gérer l'ajout interactif des mots-clés
  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [editingKw, setEditingKw] = useState<string | null>(null);
  const [kwInput, setKwInput] = useState("");

  const baseScore = data?.matchScore || 0;
  const gaps = data?.gapsMatrix || [];
  const missingKeywords = gaps.map((g: any) => g.skill);
  
  // Calcul dynamique des points : chaque mot ajouté rapproche de 100%
  const pointsPerKeyword = missingKeywords.length > 0 ? Math.ceil((100 - baseScore) / missingKeywords.length) : 0;
  const targetScore = Math.min(100, baseScore + (addedKeywords.length * pointsPerKeyword));

  // État pour l'animation fluide du compteur
  const [animatedScore, setAnimatedScore] = useState(baseScore);

  useEffect(() => {
    let current = animatedScore;
    if (current === targetScore) return;
    
    const step = targetScore > current ? 1 : -1;
    const timer = setInterval(() => {
      if (current === targetScore) clearInterval(timer);
      else { current += step; setAnimatedScore(current); }
    }, 20); // Vitesse de l'animation (20ms par point)
    return () => clearInterval(timer);
  }, [targetScore]);

  const handleConfirmAdd = (originalKw: string) => {
    if (kwInput.trim()) {
      if (!addedKeywords.includes(originalKw)) {
        setAddedKeywords(prev => [...prev, originalKw]);
      }
      setEditingKw(null);
    }
  };

  const getScoreColor = (score: number) => score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreColor = getScoreColor(animatedScore);

  return (
    <div className="cv-tab-container">
      <div className="cv-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <FileText size={20} color="var(--primary)" /> CV Unique (Optimisé ATS & Recruteur)
        </h3>
        <button className="btn-action btn-primary-action" style={{ maxWidth: '200px', padding: '0.5rem 1rem' }}>
          <Download size={16} /> Télécharger PDF
        </button>
      </div>

      <div className="cv-content-split">
        {/* Colonne de gauche */}
        <div className="cv-controls">
             <div className="control-section">
               <h3 className="section-title">Analyse de Pertinence</h3>
               <p className="text-muted">Votre CV est évalué en fonction des mots-clés de l'offre et des standards du marché.</p>
               
               {/* Jauge Score ATS */}
               <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                 <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                   <Target size={16} color={scoreColor}/> Score d'Adéquation (Mots-clés)
                 </h4>
                 <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${animatedScore}%`, background: scoreColor, transition: 'width 0.1s linear, background 0.5s ease-in-out' }}></div>
                 </div>
                <span style={{ fontSize: '0.85rem', color: scoreColor, fontWeight: 600, transition: 'color 0.5s ease-in-out' }}>
                  {animatedScore}/100 - {animatedScore >= 80 ? "Excellent" : animatedScore >= 50 ? "Moyen" : "À améliorer"}
                 </span>
               </div>

               {/* Mots-clés manquants */}
               <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                 <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--danger-text, #ef4444)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <AlertTriangle size={16}/> Mots-clés manquants (Offre vs CV)
                 </h4>
                 {missingKeywords.length > 0 ? (
                   <div className="badge-list">
                     {missingKeywords.map((kw: string, i: number) => {
                       const isAdded = addedKeywords.includes(kw);
                       
                       if (editingKw === kw) {
                         return (
                           <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--primary)', borderRadius: '2rem', padding: '0.15rem 0.25rem 0.15rem 0.75rem', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)' }}>
                             <input 
                               autoFocus
                               value={kwInput}
                               onChange={(e) => setKwInput(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') handleConfirmAdd(kw);
                                 if (e.key === 'Escape') setEditingKw(null);
                               }}
                               style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', width: '120px', color: 'var(--text-main)' }}
                             />
                             <button 
                               onClick={() => handleConfirmAdd(kw)}
                               style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '0.25rem' }}
                             >
                               <CheckCircle2 size={14} />
                             </button>
                           </div>
                         );
                       }

                       return (
                         <span 
                           key={i} 
                           className="badge" 
                           onClick={() => { if (!isAdded) { setEditingKw(kw); setKwInput(kw); } }}
                           style={{ background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'transparent', color: isAdded ? 'var(--success)' : 'var(--danger-text)', border: `1px solid ${isAdded ? 'var(--success)' : 'var(--danger-text)'}`, cursor: isAdded ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s' }}
                           title={isAdded ? "Ajouté à vos compétences" : "Cliquez pour modifier et ajouter"}
                         >
                           {kw} {isAdded ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                         </span>
                       );
                     })}
                   </div>
                 ) : (
                   <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success)' }}>Tous les mots-clés essentiels sont présents !</p>
                 )}
                 <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>L'offre exige ces compétences. Ajoutez-les à votre CV pour passer la barrière de l'ATS.</p>
               </div>

               <button className="btn-action btn-secondary-action" style={{ width: '100%', marginBottom: '1rem' }}>
                 <RefreshCw size={16} /> Rafraîchir l'analyse IA
               </button>
             </div>
        </div>

        {/* Colonne de droite : Prévisualisation PDF LaTeX */}
        <div className="cv-preview">
          <div className="preview-header">
            <span>Prévisualisation Document</span>
            <span style={{ color: '#94a3b8' }}>Format Unique</span>
          </div>
          <div className="preview-document">
            <div className="pdf-placeholder">
              <FileText size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <p style={{ margin: 0 }}>Génération LaTeX / PDF en cours...</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <FeedbackWidget feature="cv_analysis" question="L'analyse ATS de votre CV vous semble-t-elle pertinente ?" />
      </div>
    </div>
  );
};