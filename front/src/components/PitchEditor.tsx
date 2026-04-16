import React, { useState, useEffect, useRef } from "react";
import ScoreGauge from "./ScoreGauge";
import { useTranslation } from "react-i18next";
import { Mic, User, Briefcase, Star, Target, Printer, ArrowLeft, Lightbulb, Play, Pause, RotateCcw, X, MonitorPlay } from 'lucide-react';
import { createPortal } from 'react-dom';

interface PitchData {
  accroche: string;
  preuve: string;
  valeur: string;
  projection: string;
  analysis?: any;
}

interface PitchEditorProps {
  data: PitchData;
  onBack: () => void;
}

// --- COMPOSANT TÉLÉPROMPTEUR INTÉGRÉ (Sorti du composant parent pour éviter les re-renders mortels) ---
const Teleprompter = ({ text, onClose }: { text: string, onClose: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180s
  const [isActive, setIsActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(); // To hold the requestAnimationFrame ID
  const [mounted, setMounted] = useState(false);

  // [FIX] Sécurisation du Portal : on s'assure d'être côté client avant d'attaquer document.body
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // [FIX] Remplacement de setInterval par requestAnimationFrame pour un défilement fluide
  useEffect(() => {
    const scrollSpeed = 0.8; // Pixels per frame. Ajuster pour la vitesse.

    const scrollStep = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop += scrollSpeed;
      }
      animationFrameId.current = requestAnimationFrame(scrollStep);
    };

    if (isActive) {
      animationFrameId.current = requestAnimationFrame(scrollStep);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return createPortal(
    {/* [FIX EXPERT] Forçage d'un fond NOIR solide et absolu pour isoler totalement le téléprompteur du Dashboard */}
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button onClick={onClose} title="Fermer le téléprompteur" style={{ position: 'absolute', top: '0.5rem', right: '2rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, transition: 'background 0.2s' }}>
        <X size={28} />
      </button>
      
      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', padding: '1rem 2.5rem', borderRadius: '50px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '2rem', zIndex: 100000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <span style={{ fontSize: '2.5rem', fontFamily: 'monospace', color: timeLeft <= 30 ? '#ef4444' : 'white', fontWeight: 'bold', width: '120px', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {formatTime(timeLeft)}
        </span>
        <div style={{ width: '2px', height: '40px', background: 'rgba(255,255,255,0.3)' }}></div>
        <button onClick={() => setIsActive(!isActive)} style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#3b82f6', border: 'none', color: 'white', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
          {isActive ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
        </button>
        <button onClick={() => { setIsActive(false); setTimeLeft(180); if (scrollRef.current) scrollRef.current.scrollTop = 0; }} style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.4)', color: 'white', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
          <RotateCcw size={24} />
        </button>
      </div>

      <div ref={scrollRef} style={{ width: '100%', maxWidth: '800px', flex: 1, overflowY: 'auto', textAlign: 'center', paddingTop: '15rem', paddingBottom: '50vh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {text.split('\n').map((para, idx) => para.trim() ? (
          <p key={idx} style={{ color: '#FFFFFF', fontSize: '3.5rem', lineHeight: 1.5, marginBottom: '4rem', fontWeight: 700, fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 4px 8px rgba(0,0,0,0.8)', letterSpacing: '-0.02em' }}>{para}</p>
        ) : null)}
      </div>
      </div>, document.body
  );
};

export default function PitchEditor({ data: initialData, onBack }: PitchEditorProps) {
  const { t } = useTranslation();
  const [pitch, setPitch] = useState<PitchData>(initialData);
  const [showTeleprompter, setShowTeleprompter] = useState(false);

  const handleChange = (key: keyof PitchData, value: string) => {
    setPitch(prev => ({ ...prev, [key]: value }));
  };

  // Configuration des sections avec icônes et couleurs
  const sections = [
    { 
      key: "accroche", 
      title: t('pitch_hook', "1. L'Accroche (Identité pro)"), 
      icon: <User size={22} />, 
      color: "#3b82f6", // Blue
      bg: "#eff6ff"
    },
    { 
      key: "preuve", 
      title: t('pitch_proof', "2. La Preuve (Réalisations)"), 
      icon: <Briefcase size={22} />, 
      color: "#8b5cf6", // Violet
      bg: "#f5f3ff"
    },
    { 
      key: "valeur", 
      title: t('pitch_value', "3. La Valeur (Votre apport)"), 
      icon: <Star size={22} />, 
      color: "#eab308", // Yellow
      bg: "#fefce8"
    },
    { 
      key: "projection", 
      title: t('pitch_projection', "4. La Projection (Pourquoi eux)"), 
      icon: <Target size={22} />, 
      color: "#10b981", // Green
      bg: "#f0fdf4"
    }
  ];

  return (
    <div className="step-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> {t('back_productions') || 'Retour'}
        </button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
          <Mic size={28} color="var(--primary)" />
          {t('pitch_editor_title', 'Mon Pitch de 3 minutes')}
        </h2>
        <button className="btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={16} /> {t('print') || 'Imprimer'}
        </button>
      </div>

      {pitch.analysis && (
        <div style={{ marginBottom: "2rem" }}>
            <ScoreGauge 
                score={pitch.analysis.global_score} 
                label={t('pitch_analysis_title', 'Impact Pitch Oral')} 
                critique={pitch.analysis.critique}
            />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {sections.map((section) => (
          <div key={section.key} style={{ 
            background: 'var(--bg-card)', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s ease-in-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: section.bg, padding: '0.6rem', borderRadius: '10px', color: section.color }}>
                {section.icon}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '600' }}>{section.title}</h3>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1 }}>
              <textarea
                rows={6}
                value={pitch[section.key as keyof PitchData]}
                onChange={(e) => handleChange(section.key as keyof PitchData, e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", resize: "vertical", fontFamily: "inherit", fontSize: "0.95rem", lineHeight: "1.6", color: "#334155", outline: "none" }}
                placeholder={t('pitch_placeholder', "Rédigez le contenu de cette section ici...")}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Aperçu complet pour lecture fluide */}
      <div style={{ marginTop: '3rem', background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary)' }}>
            <Mic size={20} /> {t('pitch_preview_title', 'Aperçu complet (Lecture à voix haute)')}
          </h3>
          <button className="btn-primary" onClick={() => setShowTeleprompter(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MonitorPlay size={16} /> Lancer le Téléprompteur
          </button>
        </div>
        
        <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#1e293b', padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ marginBottom: '1rem' }}>{pitch.accroche}</p>
          <p style={{ marginBottom: '1rem' }}>{pitch.preuve}</p>
          <p style={{ marginBottom: '1rem' }}>{pitch.valeur}</p>
          <p style={{ marginBottom: 0 }}>{pitch.projection}</p>
        </div>
      </div>
      
      {/* Affichage conditionnel du Téléprompteur */}
      {showTeleprompter && <Teleprompter text={`${pitch.accroche}\n\n${pitch.preuve}\n\n${pitch.valeur}\n\n${pitch.projection}`} onClose={() => setShowTeleprompter(false)} />}
    </div>
  );
}