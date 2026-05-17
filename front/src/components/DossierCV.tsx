import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, Loader2, RefreshCw, Target, CheckCircle2, Plus } from 'lucide-react';
import { KeywordCoachModal } from './KeywordCoachModal';
import { API_BASE_URL } from '../config';
import PdfPreviewer from './PdfPreviewer';
import { useTranslation } from 'react-i18next';

export const DossierCV: React.FC = () => {
  // [NOUVEAU] On extrait les données directement depuis le Layout parent
  const { applicationData } = useOutletContext<any>();
  const { cvData, cvResult, gapResult } = applicationData?.data || {};
  
  const { t } = useTranslation();
  const [previewBody, setPreviewBody] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Logique interactive des mots-clés conservée à l'identique
  const payload = gapResult || cvData || {};
  const missingKeywordsRaw = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const missingKeywords = missingKeywordsRaw.map((g: any) => typeof g === 'string' ? g : (g.skill || JSON.stringify(g)));
  const baseScore = payload.match_score || payload.score_adequation || payload.matchScore || payload.score || 0;

  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [coachingKeyword, setCoachingKeyword] = useState<string | null>(null);
  const [extraContent, setExtraContent] = useState<string[]>([]); 

  const pointsPerKeyword = missingKeywords.length > 0 ? Math.ceil((100 - baseScore) / missingKeywords.length) : 0;
  const currentScore = Math.min(100, baseScore + (addedKeywords.length * pointsPerKeyword));
  const scoreColor = currentScore >= 80 ? '#10b981' : currentScore >= 50 ? '#f59e0b' : '#ef4444';

  const preparePreviewData = () => {
    const payloadData = { ...(cvResult?.optimized_data || cvResult || cvData) };
    
    let currentSkills = payloadData.skills || cvData?.skills || [];
    if (typeof currentSkills === 'string') {
        currentSkills = currentSkills.split(',').map((s: string) => s.trim());
    }
    if (addedKeywords.length > 0) {
        currentSkills = Array.from(new Set([...currentSkills, ...addedKeywords])).filter(Boolean);
    }
    payloadData.skills = currentSkills;

    payloadData.first_name = cvData?.first_name || cvData?.personal_info?.first_name || payloadData.first_name;
    payloadData.last_name = cvData?.last_name || cvData?.personal_info?.last_name || payloadData.last_name;
    payloadData.email = cvData?.email || cvData?.personal_info?.email || payloadData.email;
    payloadData.phone = cvData?.phone || cvData?.personal_info?.phone || payloadData.phone;
    payloadData.linkedin = cvData?.linkedin || cvData?.personal_info?.linkedin || payloadData.linkedin;
    payloadData.city = cvData?.city || cvData?.personal_info?.city || payloadData.city;
    payloadData.country = cvData?.country || cvData?.personal_info?.country || payloadData.country;
    payloadData.current_role = cvData?.current_role || payloadData.current_role;

    if (payloadData.linkedin) {
        payloadData.linkedin = payloadData.linkedin.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
    }

    const capitalize = (str: string) => str ? str.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "";
    payloadData.first_name = capitalize(payloadData.first_name);
    payloadData.last_name = capitalize(payloadData.last_name);

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

    if (extraContent.length > 0) {
        payloadData.free_text = (payloadData.free_text ? payloadData.free_text + "\n\n" : "") + "Intègre de manière fluide et très professionnelle ces éléments dans les expériences ou compétences :\n" + extraContent.join("\n");
    }

    if (!payloadData) return;

    setPreviewBody({
      action: "CV",
      data: payloadData,
      skip_ai: extraContent.length === 0 && addedKeywords.length === 0, 
      preview: true,
      renderer: 'latex'
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleApplyKeyword = (newText: string) => {
    if (coachingKeyword) {
      if (!addedKeywords.includes(coachingKeyword)) {
        setAddedKeywords(prev => [...prev, coachingKeyword]);
      }
        if (newText && newText.trim()) {
          setExtraContent(prev => [...prev, newText.trim()]);
        }
    }
  };

  useEffect(() => {
    preparePreviewData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvResult, addedKeywords, extraContent]);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {coachingKeyword && (
        <KeywordCoachModal keyword={coachingKeyword} cvData={cvData} onClose={() => setCoachingKeyword(null)} onApply={handleApplyKeyword} />
      )}
      
      {/* Nouveau Header de la page CV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">
            Module CV
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText size={28} className="text-blue-600" /> CV Optimisé
          </h1>
        </div>
        
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={() => setRefreshTrigger(prev => prev + 1)} disabled={loadingPreview || !previewBody}>
            {loadingPreview ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} {t('cv_refresh', 'Rafraîchir')}
          </button>
          <button className="btn-primary" onClick={() => { if(previewUrl) window.open(previewUrl, '_blank')}} disabled={!previewUrl}>
            <Download size={16} /> {t('cv_download', 'Télécharger')}
          </button>
        </div>
      </div>

      <div className="cv-content-split" style={{ gridTemplateColumns: '350px 1fr' }}>
        
        {/* Colonne Gauche : Score et Mots-clés interactifs */}
        <div className="cv-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Target size={20} color={scoreColor} /> {t('cv_ats_score', 'Score ATS')}
            </h4>
            
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${currentScore}%`, height: '100%', background: scoreColor, transition: 'width 0.5s ease-out, background 0.5s ease-in-out' }}></div>
            </div>
            <div style={{ fontSize: '0.95rem', color: scoreColor, fontWeight: 700 }}>
              {currentScore}/100 - {currentScore >= 80 ? t('score_excellent', "Excellent") : currentScore >= 50 ? t('score_average', "Moyen") : t('score_improve', "À améliorer")}
            </div>
          </div>

          {missingKeywords.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--danger-text)' }}>{t('cv_missing_keywords', 'Mots-clés manquants')}</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('cv_click_keyword', 'Cliquez sur un mot-clé pour l\'ajouter à votre CV et augmenter votre score.')}</p>
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
            <span>{t('cv_preview_doc', 'Aperçu du Document')}</span>
          </div>
          <div className="preview-document" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '800px', padding: 0 }}>
          {previewBody ? (
            <PdfPreviewer 
              fetchUrl={`${API_BASE_URL}/api/cv/generate`}
              requestBody={previewBody}
              refreshTrigger={refreshTrigger}
              onSuccess={(url) => setPreviewUrl(url)}
              onLoadingChange={(isLoading) => setLoadingPreview(isLoading)}
            />
          ) : (
            <div className="pdf-placeholder">{t('cv_waiting_data', 'En attente des données...')}</div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};