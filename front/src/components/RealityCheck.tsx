import React from 'react';
import { LucideShare2, LucideTrophy, LucideTrendingUp, LucideActivity } from 'lucide-react';

interface RealityCheckData {
  reality_check: {
    archetype: string;
    tagline: string;
    market_position: string;
    score: number;
    top_3_skills: string[];
    linkedin_post: string;
  }
}

export function RealityCheck({ data }: { data: RealityCheckData }) {
  if (!data || !data.reality_check) return null;
  
  const { archetype, tagline, market_position, score, top_3_skills, linkedin_post } = data.reality_check;

  const handleShare = () => {
    // Copie le texte dans le presse-papier
    navigator.clipboard.writeText(linkedin_post).then(() => {
      // Ouvre LinkedIn dans un nouvel onglet
      window.open('https://www.linkedin.com/feed/', '_blank');
      alert("Texte copié ! Collez-le dans votre post LinkedIn.");
    });
  };

  // Définition des couleurs/icônes selon l'archétype
  const getArchetypeStyle = (type: string) => {
    const styles: any = {
      'The Strategist': { color: '#8b5cf6', icon: '♟️' }, // Violet
      'The Builder': { color: '#ea580c', icon: '🔨' },    // Orange
      'The Operator': { color: '#16a34a', icon: '⚙️' },   // Vert
      'The Innovator': { color: '#0ea5e9', icon: '💡' },  // Bleu
      'The Navigator': { color: '#e11d48', icon: '🧭' },  // Rouge
    };
    return styles[type] || { color: '#475569', icon: '✨' };
  };

  const style = getArchetypeStyle(archetype);

  return (
    <div className="reality-check-card" style={{ 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
      color: 'white', 
      borderRadius: '1rem', 
      padding: '2rem', 
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      
      {/* Effet de fond */}
      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: style.color, filter: 'blur(100px)', opacity: 0.3 }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Career Intelligence Report</h4>
            <h2 style={{ fontSize: '2rem', margin: '0.5rem 0', fontWeight: 800, background: `linear-gradient(to right, #fff, ${style.color})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {style.icon} {archetype}
            </h2>
            <p style={{ color: '#cbd5e1', fontStyle: 'italic', margin: 0 }}>"{tagline}"</p>
          </div>
          
          <div style={{ textAlign: 'right' }}>
             <div style={{ position: 'relative', display: 'inline-block' }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke={style.color} strokeWidth="8" strokeDasharray={`${score * 2.83} 283`} transform="rotate(-90 50 50)" strokeLinecap="round" />
                  <text x="50" y="55" textAnchor="middle" fontSize="24" fill="white" fontWeight="bold">{score}</text>
                </svg>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px', textAlign: 'center' }}>Employability</div>
             </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
            <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: style.color }}>
              <LucideTrophy size={16} /> Top Skills
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {top_3_skills.map((skill, i) => (
                <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>{skill}</span>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem' }}>
            <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: style.color }}>
              <LucideTrendingUp size={16} /> Market Position
            </h5>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{market_position}</p>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>parmi les profils similaires</p>
          </div>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleShare}
            style={{ 
              background: '#0077b5', // LinkedIn Blue
              color: 'white', 
              border: 'none', 
              padding: '0.75rem 2rem', 
              borderRadius: '2rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              transition: 'transform 0.2s'
            }}
          >
            <LucideShare2 size={18} /> Partager mon Score sur LinkedIn
          </button>
        </div>
      </div>
    </div>
  );
}