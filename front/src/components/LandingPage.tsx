import React from 'react';
import { Target, MessageSquare, FileText, ArrowRight, CheckCircle2, BrainCircuit, Compass, Search, Mic, FolderOpen, Award } from 'lucide-react';

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
          line-height: 1.6;
        }
        .lp-hero {
          background: #0F2650;
          color: #F7FAFC;
          padding: 7rem 2rem 5rem 2rem;
          text-align: center;
          margin-top: 60px; /* [FIX CRITIQUE] Repousse la page sous le header fixe */
        }
        .lp-hero-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 700;
          line-height: 1.2;
          max-width: 900px;
          margin: 0 auto 1.5rem auto;
          letter-spacing: -0.01em;
        }
        .lp-hero-subtitle {
          font-size: 1.15rem;
          color: #cbd5e1;
          max-width: 700px;
          margin: 0 auto 3rem auto;
          font-weight: 300;
        }
        .lp-cta-main {
          background-color: #ffffff;
          color: #0F2650;
          border: 1px solid transparent;
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 0.5rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s ease;
        }
        .lp-cta-main:hover {
          background-color: #f8fafc;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .lp-section {
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .lp-section-title {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.01em;
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
          border-radius: 0.75rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: box-shadow 0.3s;
          text-align: left;
        }
        .lp-card:hover {
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
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
          border-radius: 0.5rem;
          aspect-ratio: 16/10;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 1.25rem;
          overflow: hidden;
          text-align: center;
        }
        .lp-pricing {
          background: var(--bg-card);
          border-radius: 0.75rem;
          padding: 4rem 3rem;
          text-align: center;
          margin: 4rem auto;
          max-width: 700px;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
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
          L'entretien ne se passe pas au talent. Il se prépare.
        </h1>
        <p className="lp-hero-subtitle">
          Générez votre <strong>dossier de préparation ultra-complet</strong> en quelques minutes : analyse de l'entreprise, coaching sur les questions pièges et entraînements oraux face à l'IA.
        </p>
        <button onClick={onStart} className="lp-cta-main">
          Débloquer mon dossier complet (XX €) <ArrowRight size={18} />
        </button>
        
        {/* Main Dashboard Screenshot Placeholder */}
        <div style={{ marginTop: '4rem', padding: '0 1rem' }}>
          <div className="lp-placeholder-img" style={{ maxWidth: '1000px', margin: '0 auto', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            [📸 Insérez ici une capture du Dashboard (Vue d'ensemble avec jauges et scores)]
          </div>
        </div>
      </section>

      {/* PROBLEM & METHODOLOGY SECTION */}
      <section className="lp-section" style={{ textAlign: 'center' }}>
        <h2 className="lp-section-title" style={{ marginBottom: '1rem', color: '#0F2650' }}>
          Ne vous contentez plus d'un simple CV.<br/>Arrivez sur-préparé à votre entretien.
        </h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto' }}>
          Les recruteurs écartent les candidats qui récitent leur parcours sans comprendre les vrais enjeux du poste. Notre Intelligence Artificielle décortique le marché et vous coache à l'oral pour faire de vous l'évidence.
        </p>

        <div className="lp-grid-4">
          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: '#f1f5f9', color: '#0F2650' }}><FolderOpen size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#0F2650' }}>Dossier Stratégique</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>Un rapport complet sur votre cible : culture d'entreprise, actualités, santé financière, baromètre des salaires et décodage de l'offre d'emploi.</p>
          </div>
          
          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: '#f1f5f9', color: '#0F2650' }}><Target size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#0F2650' }}>Coaching Réponses & Défauts</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>L'IA anticipe les 10 questions pièges que l'on va vous poser, et transforme vos pires défauts en arguments de force implacables.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: '#f1f5f9', color: '#0F2650' }}><Mic size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#0F2650' }}>Entraînement Oral</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>Prenez le micro ! Notre simulateur vocal analyse votre débit de parole, vos tics de langage ("euh", "du coup") et l'impact de votre présentation.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper" style={{ background: '#f1f5f9', color: '#0F2650' }}><FileText size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#0F2650' }}>CV "Anti-Rejet" (ATS)</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>Une version de votre CV formatée au pixel près pour franchir les logiciels de tri automatique (ATS) des grandes entreprises.</p>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION (THE "KILLER FEATURES") */}
      <section className="lp-section" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title" style={{ color: '#0F2650' }}>Tout ce dont vous avez besoin. Et bien plus.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Un accompagnement de classe "Executive", disponible 24/7.</p>
        </div>

        {/* Feature 1: Le Dossier Complet */}
        <div className="lp-feature-row">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0F2650', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><FolderOpen size={16} /> Le Dossier d'Investigation</div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#0F2650' }}>Sachez exactement où vous mettez les pieds.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>Avant même de serrer la main du recruteur, vous aurez lu notre rapport complet : décodage de l'offre d'emploi (pièges et attentes cachées), analyse financière de la boîte, baromètre des salaires et revues de presse récentes.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Dossier Entreprise / Décodeur]</div>
          </div>
        </div>

        {/* Feature 2: L'Entraînement Oral */}
        <div className="lp-feature-row reverse">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0F2650', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Mic size={16} /> Le Simulateur d'Entretien Vocal</div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#0F2650' }}>Arrêtez de bégayer. Mesurez votre impact.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>Lisez votre Pitch de 3 minutes sur notre Téléprompteur intégré, ou activez le micro pour une session sans filet ! L'IA analysera votre débit vocal (mots/minute), traquera vos tics de langage et notera votre force de persuasion.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Module d'entraînement vocal et Jauges]</div>
          </div>
        </div>

        {/* Feature 3: Career Radar */}
        <div className="lp-feature-row">
          <div className="lp-feature-text">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0F2650', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}><Compass size={16} /> Career Radar</div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem', color: '#0F2650' }}>Le GPS de votre Carrière.</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>Identifiez instantanément les "gaps" (lacunes) de votre profil par rapport au poste visé. Découvrez également des trajectoires de carrières alternatives et accédez aux stratégies pour percer le Marché Caché.</p>
          </div>
          <div className="lp-feature-image-wrapper">
            <div className="lp-placeholder-img">[📸 Capture d'écran : Dashboard GPS / Marché Caché]</div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="lp-section">
        <div className="lp-pricing">
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#0F2650' }}>Un investissement clair.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem' }}>Pas d'abonnement caché. Vous gardez le contrôle.</p>
          
          <div style={{ fontSize: '3.5rem', fontWeight: 700, color: '#0F2650', margin: '1.5rem 0' }}>XX €</div>
          <p style={{ fontWeight: 600, color: '#475569', marginBottom: '2.5rem' }}>Accès à vie à votre espace pour cette candidature</p>
          
          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 2.5rem auto' }}>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#0F2650" /> <strong>Dossier complet</strong> (Entreprise, Marché, Culture)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#0F2650" /> <strong>Coaching Q&A</strong> (Méthode STAR, Parades défauts)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#0F2650" /> <strong>Simulateur Vocal</strong> (Analyse IA de l'oral)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#0F2650" /> Génération du CV "Anti-Rejet" (ATS)</div>
          </div>

          <button onClick={onStart} className="lp-cta-main" style={{ width: '100%', justifyContent: 'center', backgroundColor: '#0F2650', color: 'white' }}>
            Obtenir mon Dossier de Préparation
          </button>
          
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Award size={16} /> Satisfait ou remboursé sous 14 jours.
          </div>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <p>© 2026 BeyondTheCV. Tous droits réservés.</p>
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