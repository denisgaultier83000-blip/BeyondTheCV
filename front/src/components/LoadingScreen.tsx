import React, { useState, useEffect } from 'react';
import { Loader2, FileText, Target, MessageSquare, BarChart3 } from 'lucide-react';

interface LoadingScreenProps {
  title: string;
  description: string;
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  "Analyse des données...",
  "Recherche de compétences...",
  "Croisement avec le marché...",
  "Création des stratégies...",
  "Génération des modules de coaching...",
  "Finalisation des documents..."
];

export function LoadingScreen({ title, description, messages = DEFAULT_MESSAGES }: LoadingScreenProps) {
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Gère le défilement des phrases d'attente
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="step-wrapper" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      <Loader2 className="spin" size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
      <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.8rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{description}</p>
      
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <span className="fade-text" key={loadingMsgIdx}>{messages[loadingMsgIdx]}</span>
          <span className="pulsing-text">Veuillez patienter</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--primary)', animation: 'loading-bar 60s cubic-bezier(0.05, 0.7, 0.1, 1) forwards' }}></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', textAlign: 'left', marginBottom: '3rem' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> CV Optimisé ATS</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Une version structurée et épurée, spécifiquement conçue pour franchir les filtres des logiciels de recrutement.</p>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} /> Stratégie & Écarts</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Identification de vos forces majeures et des compétences à combler pour le poste visé.</p>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={18} /> Préparation Entretien</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Votre pitch de présentation de 3 minutes et les parades pour vos points faibles.</p>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={18} /> Intelligence Marché</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>La dynamique de recrutement, le baromètre des salaires et les infos clés de l'entreprise cible.</p>
        </div>
      </div>
    </div>
  );
}