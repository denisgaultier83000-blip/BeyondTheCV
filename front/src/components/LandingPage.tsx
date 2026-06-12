import React from 'react';
import { Target, FileText, ArrowRight, CheckCircle2, Compass, Search, Mic, FolderOpen, Award, ShieldQuestion, BarChart3, Users } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onShowCGU: () => void;
  onShowPrivacy: () => void;
  onShowLegal: () => void;
  darkMode?: boolean;
}

export function LandingPage({ onStart, onShowCGU, onShowPrivacy, onShowLegal, darkMode }: LandingPageProps) {
  return (
    <div className="lp-container">
      {/* Styles encapsulés pour un rendu "Plug & Play" */}
      <style>{`
        .lp-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          background: var(--bg-body);
          min-height: 100vh;
          line-height: 1.6;
        }
        .lp-hero {
          background: var(--bg-body);
          color: var(--text-main);
          padding: 8rem 2rem 5rem 2rem;
          text-align: center;
        }
        .lp-hero-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 800;
          color: var(--text-main);
          line-height: 1.2;
          max-width: 900px;
          margin: 0 auto 1.5rem auto;
          letter-spacing: -0.02em;
        }
        .lp-hero-subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          max-width: 700px;
          margin: 0 auto 3rem auto;
          font-weight: 400;
        }
        .lp-cta-main {
          background-color: var(--primary);
          color: #ffffff;
          border: none;
          padding: 1.1rem 2.5rem;
          font-size: 1.15rem;
          font-weight: 600;
          border-radius: 0.5rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
        }
        .lp-cta-main:hover {
          background-color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
        }
        .lp-section {
          padding: 6rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .lp-section.dark {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          width: 100%; /* Prend toute la largeur */
        }
        .lp-section-title {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--text-main);
        }
        .lp-grid-4 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }
        .lp-grid-3 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 4rem;
        }
        .lp-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          padding: 1.5rem;
          border-radius: 1.5rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s;
          text-align: left;
        }
        .lp-card:hover {
          border-color: var(--primary);
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        }
        .lp-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          background: var(--bg-secondary);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .lp-card:hover .lp-icon-wrapper {
          background: rgba(59, 130, 246, 0.1);
          transform: scale(1.1);
        }
        .lp-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          transition: color 0.3s ease;
        }
        .lp-card:hover .lp-card-title {
          color: var(--primary);
        }
        .lp-card-desc {
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 0.95rem;
          flex-grow: 1;
        }
        .lp-pricing {
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 4rem 3rem;
          text-align: center;
          margin: 4rem auto;
          max-width: 700px;
          border: 1px solid var(--border-color);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.05);
        }
        .lp-check-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          margin-bottom: 1rem;
          color: var(--text-main);
        }
        .lp-testimonial-box {
          max-width: 800px;
          margin: 0 auto;
          background: var(--bg-card);
          padding: 2.5rem;
          border-radius: 1rem;
          border: 1px solid var(--border-color);
        }
        .lp-faq-item {
          text-align: left;
          border-bottom: 1px solid var(--border-color);
          padding: 1.5rem 0;
        }
        .lp-faq-question {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--text-main);
        }
        .lp-faq-answer {
          color: var(--text-muted);
          margin-top: 0.75rem;
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="lp-hero">
        <h1 className="lp-hero-title">
          Ne subissez plus l'entretien.<br/>Pilotez la conversation.
        </h1>
        <p className="lp-hero-subtitle">
          Le CV n'est qu'un ticket d'entrée. <strong>Beyond The CV</strong> est votre plateforme d'Intelligence Stratégique pour décoder votre cible, anticiper ses failles et structurer un discours exécutif implacable. Pensé pour les cadres et dirigeants.
        </p>
        <button onClick={onStart} className="lp-cta-main">
          Démarrer l'audit de mon profil <ArrowRight size={18} />
        </button>
        
        <div style={{ marginTop: '4rem', padding: '0 1rem' }}>
          {/* EMPLACEMENT CAPTURE D'ÉCRAN N°1 : Le Cockpit / Hub Central */}
          <img 
            src={darkMode ? "/dashboard-preview-night.png" : "/dashboard-preview.png"} 
            alt="Aperçu du Dashboard Beyond The CV" 
            style={{ maxWidth: '1000px', width: '100%', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '0.75rem', border: '4px solid var(--bg-card)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
          />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>*Aperçu du Cockpit Stratégique</p>
        </div>
      </section>

      {/* PROBLEM (AGITATION) SECTION */}
      <section className="lp-section dark">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="lp-section-title">L'improvisation n'a pas sa place à ce niveau de responsabilité.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            La majorité des candidats se contentent de réciter la chronologie de leur CV. Ils subissent l'entretien et manquent de vision sur les véritables enjeux du recrutement.
            <br/><br/>
            Votre parcours a de la valeur. <strong>Notre rôle est d'en faire un avantage concurrentiel décisif</strong> grâce à la méthode STAR et à une analyse des signaux faibles du marché.
          </p>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="lp-section">
        <div style={{ textAlign: 'center' }}>
          <h2 className="lp-section-title">L'arsenal complet du candidat exigeant</h2>
        </div>

        <div className="lp-grid-4">
          <div className="lp-card">
            <div className="lp-icon-wrapper"><Search size={24} strokeWidth={2} /></div>
            <h3 className="lp-card-title">Intelligence Économique (OSINT)</h3>
            <p className="lp-card-desc">Notre algorithme scanne le web pour décoder la santé financière, l'ADN, la culture et les derniers défis stratégiques de votre entreprise cible.</p>
          </div>
          
          <div className="lp-card">
            <div className="lp-icon-wrapper"><Mic size={24} strokeWidth={2} /></div>
            <h3 className="lp-card-title">Simulateur Vocal d'Impact</h3>
            <p className="lp-card-desc">Testez votre discours d'introduction en conditions réelles. L'IA évalue votre débit (mots/minute), vos tics de langage et la force de vos exemples.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper"><ShieldQuestion size={24} strokeWidth={2} /></div>
            <h3 className="lp-card-title">Anticipation des Failles</h3>
            <p className="lp-card-desc">Cartographie de vos écarts face à l'offre d'emploi (Gap Analysis) et génération d'arguments défensifs pour contrer chaque objection du recruteur.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper"><FileText size={24} strokeWidth={2} /></div>
            <h3 className="lp-card-title">Méthode STAR & Scénarios</h3>
            <p className="lp-card-desc">Finies les réponses évasives. Structurez vos réussites en situations concrètes et testez votre sang-froid avec nos scénarios de gestion de crise sur mesure.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (PROOF) SECTION */}
      <section className="lp-section lp-section dark">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title">Ce qu'en disent les professionnels de haut niveau</h2>
        </div>
        <div className="lp-testimonial-box">
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.7 }}>
            "En tant que directeur, je pensais savoir me vendre. L'outil m'a mis face à une réalité brutale : je n'étais pas assez concret. Le rapport sur les défis de l'entreprise cible et le simulateur vocal m'ont permis de négocier mon package avec un aplomb que je n'aurais pas eu seul."
          </p>
          <p style={{ fontWeight: 600, marginTop: '1.5rem', color: 'var(--text-main)', textAlign: 'right' }}>— Alexandre D., Directeur des Opérations (C-Level)</p>
        </div>
      </section>

      {/* OBJECTIONS (FAQ) SECTION */}
      <section className="lp-section">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title">Vos questions, nos réponses</h2>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="lp-faq-item">
            <p className="lp-faq-question">Je suis un profil senior, cette plateforme est-elle adaptée ?</p>
            <p className="lp-faq-answer">Absolument. BeyondTheCV a été conçu précisément pour les cadres, managers et dirigeants. L'IA adapte son niveau d'exigence et son vocabulaire à votre séniorité pour évaluer votre leadership et votre vision stratégique.</p>
          </div>
          <div className="lp-faq-item">
            <p className="lp-faq-question">Est-ce que ça va me prendre des heures ?</p>
            <p className="lp-faq-answer">Non. Importez votre PDF LinkedIn ou votre CV en un clic. L'Intelligence Artificielle travaille en tâche de fond. En quelques minutes, vous accédez à votre Cockpit Stratégique et à votre plan d'action logistique immédiat.</p>
          </div>
          <div className="lp-faq-item">
            <p className="lp-faq-question">Et concernant le prix ?</p>
            <p className="lp-faq-answer">Combien vous coûte une opportunité manquée ou une négociation salariale mal préparée ? BeyondTheCV est un investissement unique (One-Off) sans abonnement caché, directement rentabilisé dès votre premier entretien.</p>
          </div>
        </div>
      </section>

      {/* PRICING / FINAL CTA SECTION */}
      <section className="lp-section dark">
        <div className="lp-pricing">
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>Un investissement clair.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '450px', margin: '0.5rem auto 0 auto' }}>
            Pas d'abonnement toxique. Un tarif net pour un avantage décisif.
          </p>
          
          <div style={{ fontSize: '3.5rem', fontWeight: 700, color: 'var(--primary)', margin: '1.5rem 0' }}>129 €</div>
          <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Accès complet de 4 mois. Renouvelable pour 30€ si votre recherche se prolonge.</p>
          
          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 2.5rem auto' }}>
            <div className="lp-check-item"><CheckCircle2 size={18} color="var(--primary)" /> <strong>Dossier de Renseignement</strong> (OSINT Entreprise)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="var(--primary)" /> <strong>Simulateur Vocal d'Entretien</strong> (Micro Actif)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="var(--primary)" /> <strong>Scénarios de Crise & Parades</strong></div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="var(--primary)" /> <strong>Décodeur du jargon RH</strong> (Gap Analysis)</div>
          </div>

          <button onClick={onStart} className="lp-cta-main" style={{ width: '100%', justifyContent: 'center' }}>
            Créer mon profil candidat
          </button>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
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