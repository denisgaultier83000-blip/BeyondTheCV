import React from 'react';
import { Target, MessageSquare, FileText, ArrowRight, CheckCircle2, BrainCircuit, Compass, Search, Play } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onShowCGU: () => void;
  onShowPrivacy: () => void;
  onShowLegal: () => void;
}

export function LandingPage({ onStart, onShowCGU, onShowPrivacy, onShowLegal }: LandingPageProps) {
  return (
    <div className="lp-container">
      {/* Styles encapsulés pour un rendu "Plug & Play" */}
      <style>{`
        .lp-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          background-color: var(--bg-body);
        }
        .lp-hero {
          background: linear-gradient(135deg, #0F2650 0%, #1a365d 100%);
          color: #F7FAFC;
          padding: 8rem 2rem 6rem 2rem;
          text-align: center;
          border-radius: 0 0 3rem 3rem;
          margin-top: -100px; /* Compense le padding du layout principal de l'App */
          padding-top: 140px;
        }
        .lp-hero-title {
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          font-weight: 800;
          line-height: 1.1;
          max-width: 900px;
          margin: 0 auto 1.5rem auto;
          letter-spacing: -0.02em;
        }
        .lp-hero-subtitle {
          font-size: 1.25rem;
          color: #cbd5e1;
          max-width: 700px;
          margin: 0 auto 3rem auto;
          line-height: 1.6;
        }
        .lp-cta-main {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 1.25rem 2.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          border-radius: 3rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 10px 25px -5px rgba(109, 190, 247, 0.4);
        }
        .lp-cta-main:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 25px -5px rgba(109, 190, 247, 0.5);
        }
        .lp-section {
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .lp-section-title {
          font-size: clamp(2rem, 3vw, 2.5rem);
          font-weight: 800;
        }
        .lp-grid-4 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }
        .lp-card {
          background: var(--bg-card);
          padding: 2.5rem 2rem;
          border-radius: 1.5rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          transition: transform 0.3s, box-shadow 0.3s;
          text-align: left;
        }
        .lp-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .lp-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .lp-feature-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4rem;
          margin-bottom: 6rem;
        }
        .lp-feature-row.reverse {
          flex-direction: row-reverse;
        }
        .lp-feature-text {
          flex: 1;
          min-width: 300px;
          text-align: left;
        }
        .lp-feature-image-wrapper {
          flex: 1;
          min-width: 300px;
          position: relative;
        }
        .lp-placeholder-img {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          aspect-ratio: 16/10;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 1.25rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          text-align: center;
        }
        .lp-pricing {
          background: var(--bg-card);
          border-radius: 2rem;
          padding: 4rem 2rem;
          text-align: center;
          margin: 4rem auto;
          max-width: 800px;
          border: 1px solid var(--border-color);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
        }
        .lp-check-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          margin-bottom: 1rem;
          color: var(--text-main);
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="lp-hero">
        <h1 className="lp-hero-title">
          L'entretien se gagne <span style={{color: '#6DBEF7'}}>avant d'entrer</span> dans la pièce.
        </h1>
        <p className="lp-hero-subtitle">
          BeyondTheCV n'est pas un générateur de CV. C'est votre coach stratégique pour structurer votre discours, comprendre votre cible et décrocher le poste.
        </p>
        <button onClick={onStart} className="lp-cta-main">
          Préparer ma candidature (99$) <ArrowRight size={20} />
        </button>
        
        {/* Main Dashboard Screenshot Placeholder */}
        <div style={{ marginTop: '4rem', padding: '0 1rem' }}>
          <div className="lp-placeholder-img" style={{ maxWidth: '1000px', margin: '0 auto', background: 'linear-gradient(to bottom, #1e293b, #0f172a)', color: '#94a3b8', border: '1px solid #334155' }}>
            [📸 Insérez ici une capture d'écran du Dashboard Principal]
          </div>
        </div>
      </section>

      {/* PROBLEM & METHODOLOGY SECTION */}
      <section className="lp-section" style={{ textAlign: 'center' }}>
        <h2 className="lp-section-title" style={{ marginBottom: '1.5rem' }}>
          Le CV n'est qu'un ticket d'entrée.<br/><span style={{color: 'var(--primary)'}}>L'entretien est l'épreuve finale.</span>
        </h2>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto' }}>
          La plupart des candidats échouent parce qu'ils récitent leur CV au lieu de vendre leur valeur. Un entretien réussi est le résultat d'une préparation méthodique, pas du hasard.
        </p>

        <div className="lp-grid-4">
          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><BrainCircuit size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Coaching Structuré</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Un questionnaire guidé pour construire votre logique, identifier vos failles et corriger votre posture.</p>
          </div>
          
          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><Target size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Analyse Stratégique</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Compréhension profonde des enjeux de l'entreprise, de son marché et analyse des écarts avec votre profil.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef' }}><MessageSquare size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Pitch de 3 Minutes</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Un discours clair, structuré et impactant généré sur-mesure pour répondre à l'inévitable « Parlez-moi de vous ».</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><FileText size={28} /></div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>CV Optimisé ATS</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Une version technique épurée conçue spécifiquement pour franchir les filtres logiciels et soutenir votre oral.</p>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION (THE "KILLER FEATURES") */}
      <section className="lp-section" style={{ background: 'var(--bg-card)', borderRadius: '3rem', margin: '2rem auto', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 className="lp-section-title">Une arme secrète pour votre carrière.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Allez bien au-delà de la simple mise en page.</p>
        </div>

        {/* Feature 1: Décodeur RH */}
        <div className="lp-feature-row">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700, marginBottom: '1rem' }}><Search size={18} /> Décodeur de Fiche de Poste</div>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Lisez entre les lignes.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>Ne tombez plus dans les pièges du jargon RH. Notre IA analyse l'offre d'emploi et vous traduit les <strong>véritables attentes cachées</strong>, les signaux d'alerte (red flags) et la culture réelle de l'entreprise.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Le Décodeur d'Offre]</div>
          </div>
        </div>

        {/* Feature 2: Simulateur */}
        <div className="lp-feature-row reverse">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(217, 70, 239, 0.1)', color: '#d946ef', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700, marginBottom: '1rem' }}><Play size={18} /> Simulateur de Carrière</div>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Testez vos choix avant de les faire.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>"Que se passe-t-il si je passe la certification AWS ?" Entrez une action potentielle et l'IA simulera instantanément l'impact sur votre score d'employabilité et votre salaire cible.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Simulateur de Carrière]</div>
          </div>
        </div>

        {/* Feature 3: Career Radar */}
        <div className="lp-feature-row">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 700, marginBottom: '1rem' }}><Compass size={18} /> Career Radar</div>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Découvrez des pivots insoupçonnés.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>Vous stagnez ? Le Radar identifie des trajectoires professionnelles alternatives basées sur vos compétences transverses, avec le temps d'adaptation requis et le potentiel salarial.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Career Radar]</div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-pricing">
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Un investissement clair.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Pas d'abonnement caché. Vous gardez le contrôle.</p>
          
          <div style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '1.5rem 0' }}>99 €</div>
          <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '2.5rem' }}>Accès 100% illimité pendant 3 mois</p>
          
          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 2.5rem auto' }}>
            <div className="lp-check-item"><CheckCircle2 size={20} color="#10b981" /> Génération de CVs ATS illimitée</div>
            <div className="lp-check-item"><CheckCircle2 size={20} color="#10b981" /> Analyses d'Entreprises et de Marché illimitées</div>
            <div className="lp-check-item"><CheckCircle2 size={20} color="#10b981" /> Simulateur et Career Radar inclus</div>
            <div className="lp-check-item"><CheckCircle2 size={20} color="#10b981" /> Préparation aux entretiens (Pitch & Q/A)</div>
          </div>

          <button onClick={onStart} className="lp-cta-main" style={{ width: '100%', justifyContent: 'center' }}>
            Démarrer ma préparation
          </button>
          
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <strong>Toujours en recherche après 3 mois ?</strong><br />
            Vos données sont conservées. Prolongez votre accès complet pour seulement 30 € les 2 mois.
          </div>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <p>© {new Date().getFullYear()} BeyondTheCV. Tous droits réservés.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <button onClick={onShowLegal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            Mentions Légales
          </button>
          <button onClick={onShowCGU} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            CGU
          </button>
          <button onClick={onShowPrivacy} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            Politique de Confidentialité
          </button>
        </div>
      </footer>
    </div>
  );
}