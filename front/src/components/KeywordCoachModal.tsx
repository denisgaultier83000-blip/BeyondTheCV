import React, { useState, useEffect } from 'react';
import { Lightbulb, Loader2, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface KeywordCoachModalProps {
  keyword: string;
  cvData: any;
  onClose: () => void;
  onApply: (newText: string) => void;
}

export function KeywordCoachModal({ keyword, cvData, onClose, onApply }: KeywordCoachModalProps) {
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(true);
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    const fetchAdvice = async () => {
      setLoading(true);
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/coach-keyword`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: keyword,
            cv_data: cvData,
          }),
        });
        if (!response.ok) throw new Error('Failed to get advice');
        const data = await response.json();
        setAdvice(data.advice || "Intégrez ce mot-clé dans la description d'une de vos expériences pertinentes.");
      } catch (error) {
        console.error(error);
        setAdvice("Erreur lors de la récupération du conseil. Essayez d'intégrer ce mot-clé dans une description de poste.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdvice();
  }, [keyword, cvData]);

  const handleApply = () => {
    onApply(editedText);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', fontSize: '1.25rem' }}>Intégrer le mot-clé : <span style={{ color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{keyword}</span></h3>

        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary)', marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <Lightbulb size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          {loading ? <Loader2 size={18} className="spin" /> : <span>{advice}</span>}
        </div>

        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={5}
          placeholder={`Ex: "Pilotage du projet X, incluant la gestion de ${keyword}..."`}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', resize: 'vertical', marginBottom: '1.5rem' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={handleApply} className="btn-primary" disabled={!editedText.trim()}>Appliquer la modification</button>
        </div>
      </div>
    </div>
  );
}