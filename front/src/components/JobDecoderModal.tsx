import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { FeedbackWidget } from './FeedbackWidget';

interface DecoderData {
  reality_check?: { jargon: string; translation: string }[];
  real_expectations?: string[];
  red_flags?: string[];
  culture_fit?: string;
}

interface JobDecoderModalProps {
  data: any;
  onClose: () => void;
}

export default function JobDecoderModal({ data, onClose }: JobDecoderModalProps) {
  if (!data) return null;
  const { t } = useTranslation();
  
  // Résolution robuste des données (Support de l'encapsulation IA potentielle)
  const decoder: DecoderData = data.decoder || data.job_decoder_result || data;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '90%', maxWidth: '850px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >✕</button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
          <Search size={32} color="var(--primary)" /> Décodeur de Fiche de Poste
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          Traduction du jargon RH en réalité opérationnelle.
        </p>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* 1. Jargon vs Réalité */}
          {decoder.reality_check && decoder.reality_check.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>🔍 Réalité vs Jargon</h4>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {decoder.reality_check.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.95rem', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>"{item.jargon}"</span>
                    <ArrowRight size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-main)', fontWeight: 600, flex: 1 }}>{item.translation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* 2. Ce qui est attendu */}
            {decoder.real_expectations && decoder.real_expectations.length > 0 && (
              <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> Véritables attentes</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {decoder.real_expectations.map((exp: any, idx: number) => <li key={idx} style={{ marginBottom: '0.5rem' }}>{typeof exp === 'string' ? exp : JSON.stringify(exp)}</li>)}
                </ul>
              </div>
            )}

            {/* 3. Red Flags */}
            {decoder.red_flags && decoder.red_flags.length > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={20} /> Pièges potentiels</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {decoder.red_flags.map((flag: any, idx: number) => <li key={idx} style={{ marginBottom: '0.5rem' }}>{typeof flag === 'string' ? flag : JSON.stringify(flag)}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* 4. Culture */}
          {decoder.culture_fit && (
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>🎭 Décryptage de la Culture</h4>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }} dangerouslySetInnerHTML={formatMarkdown(decoder.culture_fit)} />
            </div>
          )}
        </div>
        
        <FeedbackWidget feature="job_decoder" question="Cette traduction de l'annonce vous est-elle utile ?" />

      </div>
    </div>
  );
}