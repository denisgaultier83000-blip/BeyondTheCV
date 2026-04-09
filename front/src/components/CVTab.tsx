import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { FileText, Download, Loader2, RefreshCw, AlertTriangle, Target, CheckCircle2, Plus } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { KeywordCoachModal } from './KeywordCoachModal';
import { API_BASE_URL } from '../config';

export const CVTab = ({ data }: { data: any }) => {
  const { cvData, cvResult, gapResult } = useDashboard();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Logique interactive des mots-clés
  const payload = gapResult || data || {};
  const missingKeywordsRaw = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const missingKeywords = missingKeywordsRaw.map((g: any) => typeof g === 'string' ? g : (g.skill || JSON.stringify(g)));
  const baseScore = payload.match_score || payload.score_adequation || payload.matchScore || payload.score || 0;

  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [coachingKeyword, setCoachingKeyword] = useState<string | null>(null);
  const [extraContent, setExtraContent] = useState<string[]>([]); // [FIX] Stockage des textes édités

  const pointsPerKeyword = missingKeywords.length > 0 ? Math.ceil((100 - baseScore) / missingKeywords.length) : 0;
  const currentScore = Math.min(100, baseScore + (addedKeywords.length * pointsPerKeyword));
  const scoreColor = currentScore >= 80 ? '#10b981' : currentScore >= 50 ? '#f59e0b' : '#ef4444';

  const generatePreview = async () => {
    // [FIX CRITIQUE] On utilise les données optimisées par l'IA si elles existent
    // On fusionne pour s'assurer d'avoir les skills à jour ajoutés manuellement
    const payloadData = { ...(cvResult?.optimized_data || cvResult || cvData) };
    
    // [FIX CRITIQUE] On injecte les skills saisis ET les mots-clés acceptés via le coach
    // On s'assure que skills reste un tableau (Array) car le template LaTeX du backend itère dessus.
    let currentSkills = payloadData.skills || cvData?.skills || [];
    if (typeof currentSkills === 'string') {
        currentSkills = currentSkills.split(',').map((s: string) => s.trim());
    }
    if (addedKeywords.length > 0) {
        currentSkills = Array.from(new Set([...currentSkills, ...addedKeywords])).filter(Boolean);
    }
    payloadData.skills = currentSkills;

    // [FIX CRITIQUE] Utilisation de "?" (Optional chaining) pour ne pas planter si cvData est null au 1er rendu
    payloadData.first_name = cvData?.first_name || cvData?.personal_info?.first_name || payloadData.first_name;
    payloadData.last_name = cvData?.last_name || cvData?.personal_info?.last_name || payloadData.last_name;
    payloadData.email = cvData?.email || cvData?.personal_info?.email || payloadData.email;
    payloadData.phone = cvData?.phone || cvData?.personal_info?.phone || payloadData.phone;
    payloadData.linkedin = cvData?.linkedin || cvData?.personal_info?.linkedin || payloadData.linkedin;
    payloadData.city = cvData?.city || cvData?.personal_info?.city || payloadData.city;
    payloadData.country = cvData?.country || cvData?.personal_info?.country || payloadData.country;
    payloadData.current_role = cvData?.current_role || payloadData.current_role;

    // [FIX CRITIQUE] Le backend a impérativement besoin de l'objet `personal_info` pour le rendu PDF.
    // Au lieu de le supprimer, on le met à jour avec les valeurs racines correctes.
    payloadData.personal_info = {
        ...(payloadData.personal_info || {}),
        first_name: payloadData.first_name,
        last_name: payloadData.last_name,
        email: payloadData.email,
        phone: payloadData.phone,
        linkedin: payloadData.linkedin,
        city: payloadData.city,
        country: payloadData.country
    };

    // [FIX] On ajoute le texte reformulé généré par le KeywordCoachModal dans la section profil (bio)
    if (extraContent.length > 0) {
        payloadData.bio = (payloadData.bio ? payloadData.bio + "\n\n" : "") + extraContent.join("\n\n");
    }

    if (!payloadData) {
      setError("Les données du candidat ne sont pas disponibles pour générer le CV.");
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadData,
          skip_ai: true, // [FIX CRITIQUE] Empêche l'API de relancer l'IA (15s) et génère directement le PDF
          preview: true,
          renderer: 'pdf'
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`La génération du PDF a échoué: ${errorData}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      console.error("Erreur de génération de l'aperçu:", err);
      setError(err.message || "Une erreur inconnue est survenue.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplyKeyword = (newText: string) => {
    if (coachingKeyword) {
      // Marque le mot-clé comme traité
      if (!addedKeywords.includes(coachingKeyword)) {
        setAddedKeywords(prev => [...prev, coachingKeyword]);
      }
        // [FIX] On sauvegarde le texte édité pour l'injecter dans le PDF
        if (newText && newText.trim()) {
          setExtraContent(prev => [...prev, newText.trim()]);
        }
    }
  };

  useEffect(() => {
    generatePreview();
  // [FIX] Ajout des dépendances manquantes. React déclenchera generatePreview naturellement après mise à jour.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvResult, addedKeywords, extraContent]);

  // [FIX] Cleanup séparé pour éviter les fuites mémoire
  useEffect(() => {
    // Cleanup function pour révoquer l'URL du blob quand le composant est démonté
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]); 

  return (
    <>
    {coachingKeyword && (
      <KeywordCoachModal keyword={coachingKeyword} cvData={cvData} onClose={() => setCoachingKeyword(null)} onApply={handleApplyKeyword} />
    )}
    <div className="cv-tab-container">
      <div className="cv-header">
        <div className="cv-type-selector">
          <button className="cv-type-btn active">
            <FileText size={16} /> CV Optimisé ATS
          </button>
          {/* D'autres boutons pourraient venir ici */}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={generatePreview} disabled={loadingPreview}>
            {loadingPreview ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Rafraîchir
          </button>
          <button className="btn-primary" onClick={() => { if(previewUrl) window.open(previewUrl, '_blank')}} disabled={!previewUrl}>
            <Download size={16} /> Télécharger
          </button>
        </div>
      </div>

      <div className="cv-content-split" style={{ gridTemplateColumns: '350px 1fr' }}>
        
        {/* Colonne Gauche : Score et Mots-clés interactifs */}
        <div className="cv-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Target size={20} color={scoreColor} /> Score ATS
            </h4>
            
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${currentScore}%`, height: '100%', background: scoreColor, transition: 'width 0.5s ease-out, background 0.5s ease-in-out' }}></div>
            </div>
            <div style={{ fontSize: '0.95rem', color: scoreColor, fontWeight: 700 }}>
              {currentScore}/100 - {currentScore >= 80 ? "Excellent" : currentScore >= 50 ? "Moyen" : "À améliorer"}
            </div>
          </div>

          {missingKeywords.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--danger-text)' }}>Mots-clés manquants</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Cliquez sur un mot-clé pour l'ajouter à votre CV et augmenter votre score.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {missingKeywords.map((kw: string, i: number) => {
                        const isAdded = addedKeywords.includes(kw);
                        return (
                            <button key={i} onClick={() => { if(!isAdded) setCoachingKeyword(kw); }} disabled={isAdded} style={{ background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'transparent', color: isAdded ? 'var(--success)' : 'var(--danger-text)', border: `1px solid ${isAdded ? 'var(--success)' : 'var(--danger-text)'}`, padding: '0.35rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', cursor: isAdded ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s' }}>
                                {kw} {isAdded ? <CheckCircle2 size={14}/> : <Plus size={14}/>}
                            </button>
                        );
                    })}
                </div>
            </div>
          )}
        </div>

        {/* Colonne Droite : Le PDF */}
        <div className="cv-preview">
          <div className="preview-header">
            <span>Aperçu du Document</span>
          </div>
          <div className="preview-document" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '800px', padding: 0 }}>
            {loadingPreview ? (
              <div className="pdf-placeholder">
                <Loader2 size={32} className="spin" />
                <p style={{ marginTop: '1rem' }}>Génération de votre CV...</p>
              </div>
            ) : error ? (
              <div className="pdf-placeholder" style={{ borderColor: 'var(--danger-text)', color: 'var(--danger-text)' }}>
                <AlertTriangle size={32} />
                <p style={{ marginTop: '1rem', maxWidth: '80%' }}>{error}</p>
              </div>
            ) : previewUrl ? (
              <iframe src={previewUrl} style={{ width: '100%', height: '100%', flex: 1, minHeight: '800px', border: 'none', borderRadius: '0 0 1rem 1rem', background: '#525659' }} title="Aperçu du CV" />
            ) : (
              <div className="pdf-placeholder">Aperçu non disponible.</div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};