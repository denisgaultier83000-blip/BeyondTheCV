import React from 'react';
import { Trophy, Award, Lock, AlertTriangle, Users, MessageSquare, ListChecks, BrainCircuit, Shield, X } from 'lucide-react';
import scenariosData from './scenarios.json';

const iconMap: { [key: string]: React.ElementType } = {
  AlertTriangle,
  Users,
  MessageSquare,
  ListChecks,
  BrainCircuit,
  Shield
};

interface RewardsModalProps {
  onClose: () => void;
  cvData: any;
  customScenariosResult: any;
}

export default function RewardsModal({ onClose, cvData, customScenariosResult }: RewardsModalProps) {
  const scores = cvData?.simulatorScores || {};
  
  // On utilise les scénarios sur-mesure de l'IA s'ils existent, sinon les génériques
  const scenarios = (customScenariosResult?.categories?.length > 0)
    ? customScenariosResult.categories
    : scenariosData;

  const totalBadges = scenarios.length;
  
  // Fonction de validation d'un badge
  const isCategoryMastered = (category: any) => {
    if (!category.scenarios || category.scenarios.length === 0) return false;
    return category.scenarios.every((sc: any) => {
      const scId = sc.id || sc.title;
      return scores[scId] !== undefined && scores[scId] >= 50;
    });
  };

  const earnedBadges = scenarios.filter(isCategoryMastered).length;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(15, 23, 42, 0.8)", zIndex: 1100,
      display: "flex", justifyContent: "center", alignItems: "center",
      backdropFilter: "blur(8px)"
    }}>
      <div className="card" style={{ width: "90%", maxWidth: "800px", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        
        {/* Header de la modale */}
        <div style={{ padding: "2rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.8rem", color: "var(--text-main)", display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Trophy size={32} color="#f59e0b" /> Ma Salle des Trophées
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
              Vous avez débloqué {earnedBadges} badge{earnedBadges > 1 ? 's' : ''} sur {totalBadges}.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
            <X size={24} />
          </button>
        </div>

        {/* Grille des Badges */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {scenarios.map((cat: any, idx: number) => {
            const isMastered = isCategoryMastered(cat);
            const Icon = iconMap[cat.icon] || BrainCircuit;
            
            return (
              <div key={idx} style={{ 
                background: isMastered ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)', 
                border: `2px solid ${isMastered ? '#10b981' : 'var(--border-color)'}`, 
                padding: '1.5rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', 
                position: 'relative', transition: 'all 0.3s', filter: isMastered ? 'none' : 'grayscale(100%) opacity(0.6)'
              }}>
                {!isMastered && <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', top: '1rem', right: '1rem' }} />}
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: isMastered ? '#10b981' : 'var(--border-color)', color: isMastered ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: isMastered ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none' }}>
                  {isMastered ? <Award size={32} /> : <Icon size={32} />}
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: isMastered ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '1.1rem' }}>{cat.category}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: isMastered ? '#10b981' : 'var(--text-muted)', fontWeight: isMastered ? 600 : 400 }}>
                  {isMastered ? "Maîtrisé" : "À débloquer"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}