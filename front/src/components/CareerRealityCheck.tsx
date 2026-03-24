import React, { useState } from 'react';
import { Share2, Copy, Check, Linkedin, Award, Trophy, TrendingUp } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface RealityCheckData {
  reality_check: {
    archetype: string;
    tagline: string;
    market_position: string;
    top_3_skills: string[];
    linkedin_post: string;
  }
}

interface Props {
  data: RealityCheckData | null;
  loading?: boolean;
  error?: boolean;
  score?: number; // Score global passé en prop
}

export function CareerRealityCheck({ data, loading, error, score }: Props) {
  const [copied, setCopied] = useState(false);
  const reality_check = data?.reality_check;

  if (!reality_check && !loading && !error) {
    return null;
  }

  const { archetype, tagline, market_position, top_3_skills, linkedin_post } = reality_check || {
    archetype: '', tagline: '', market_position: '', top_3_skills: [], linkedin_post: ''
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(linkedin_post);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getArchetypeStyle = (type: string) => {
    const styles: any = {
      'The Strategist': { color: '#8b5cf6', icon: '♟️' },
      'The Builder': { color: '#ea580c', icon: '🔨' },
      'The Operator': { color: '#16a34a', icon: '⚙️' },
      'The Innovator': { color: '#0ea5e9', icon: '💡' },
      'The Navigator': { color: '#e11d48', icon: '🧭' },
    };
    return styles[type] || { color: '#475569', icon: '✨' };
  };

  const style = getArchetypeStyle(archetype);

  return (
    <DashboardCard
      title="Career Reality Check"
      icon={<Award size={24} />}
      loading={loading}
      loadingText="Génération de votre badge professionnel..."
      error={error}
      errorText="Impossible de générer le badge."
      featureId="reality_check"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05, color: 'var(--text-main)' }}>
        <Trophy size={150} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Votre badge professionnel (Viral)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', marginBottom: '0.5rem' }}>VOTRE ARCHÉTYPE</div>
          <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>
            {style.icon} {archetype}
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>"{tagline}"</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#6DBEF7', lineHeight: 1 }}>{score || 85}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>SCORE EMPLOYABILITÉ</div>
          </div>
          
          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>FORCES MAJEURES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {top_3_skills.map((skill, i) => (
                <span key={i} style={{ background: 'var(--bg-card)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>{skill}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Viral Action */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', maxWidth: '60%' }}>Partagez votre archétype pour challenger votre réseau.</div>
          <button onClick={handleCopy} className="btn-secondary" style={{ background: '#0077b5', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
            {copied ? <Check size={18} /> : <Linkedin size={18} />} {copied ? 'Texte Copié !' : 'Copier le Post LinkedIn'}
          </button>
        </div>
      </div>
    </DashboardCard>
  );
}