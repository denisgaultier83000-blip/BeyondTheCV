import React from 'react';
import { Target, FileText, ArrowRight, CheckCircle2, Compass, Search, Mic, FolderOpen, Award, ShieldQuestion, BarChart3, Users } from 'lucide-react';

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
          color: #f8fafc;
          background-color: #020617;
          line-height: 1.6;
        }
        .lp-hero {
          background: transparent;
          padding: 7rem 2rem 5rem 2rem;
          text-align: center;
          margin-top: 60px; /* [FIX CRITIQUE] Repousse la page sous le header fixe */
        }
        .lp-hero-title {
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-weight: 800;
          background: linear-gradient(to right, #f8fafc, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.2;
          max-width: 900px;
          margin: 0 auto 1.5rem auto;
          letter-spacing: -0.02em;
        }
        .lp-hero-subtitle {
          font-size: 1.15rem;
          color: #94a3b8;
          max-width: 700px;
          margin: 0 auto 3rem auto;
          font-weight: 400;
        }
        .lp-cta-main {
          background-color: #3b82f6;
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
          background: #0a0f1c;
          border-top: 1px solid #1e293b;
          border-bottom: 1px solid #1e293b;
          width: 100%; /* Prend toute la largeur */
        }
        .lp-section-title {
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #f8fafc;
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
          background: #0f172a;
          padding: 2.5rem 2rem;
          border-radius: 1rem;
          border: 1px solid #1e293b;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s;
          text-align: left;
        }
        .lp-card:hover {
          border-color: #334155;
          transform: translateY(-5px);
        }
        .lp-icon-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 1rem;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }
        .lp-pricing {
          background: #0f172a;
          border-radius: 1rem;
          padding: 4rem 3rem;
          text-align: center;
          margin: 4rem auto;
          max-width: 700px;
          border: 1px solid #1e293b;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .lp-check-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
          margin-bottom: 1rem;
          color: #cbd5e1;
        }
        .lp-testimonial-box {
          max-width: 800px;
          margin: 0 auto;
          background: #0f172a;
          padding: 2.5rem;
          border-radius: 1rem;
          border: 1px solid #1e293b;
        }
        .lp-faq-item {
          text-align: left;
          border-bottom: 1px solid #1e293b;
          padding: 1.5rem 0;
        }
        .lp-faq-question {
          font-weight: 600;
          font-size: 1.1rem;
          color: #f8fafc;
        }
        .lp-faq-answer {
          color: #94a3b8;
          margin-top: 0.75rem;
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="lp-hero">
        <h1 className="lp-hero-title">
          Ne cherchez plus un emploi. Dominez votre prochain entretien.
        </h1>
        <p className="lp-hero-subtitle">
          Le CV n'est qu'un ticket d'entrée. <strong>Beyond The CV</strong> est votre stratège personnel pour décoder l'entreprise visée, anticiper ses failles et structurer le discours qui décrochera le poste. Réservé aux profils exigeants.
        </p>
        <button onClick={onStart} className="lp-cta-main">
          Démarrer mon analyse stratégique <ArrowRight size={18} />
        </button>
        
        <div style={{ marginTop: '4rem', padding: '0 1rem' }}>
          {/* Mockup d'interface 100% CSS (Plus d'image cassée) */}
          <div style={{ maxWidth: '1000px', width: '100%', aspectRatio: '16/9', margin: '0 auto', background: '#0f172a', borderRadius: '0.75rem', border: '1px solid #1e293b', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', gap: '1.5rem', position: 'relative', overflow: 'hidden', textAlign: 'left' }}>
            <div style={{ position: 'absolute', top: '10%', left: '30%', width: '400px', height: '400px', background: '#3b82f6', filter: 'blur(120px)', opacity: 0.15, pointerEvents: 'none' }}></div>
            {/* Sidebar */}
            <div style={{ width: '20%', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 1 }}>
              <div style={{ height: '30px', width: '80%', background: '#1e293b', borderRadius: '0.25rem', marginBottom: '1.5rem' }}></div>
              <div style={{ height: '40px', width: '100%', background: '#3b82f6', borderRadius: '0.5rem', opacity: 0.9 }}></div>
              <div style={{ height: '40px', width: '100%', background: '#1e293b', borderRadius: '0.5rem' }}></div>
              <div style={{ height: '40px', width: '100%', background: '#1e293b', borderRadius: '0.5rem' }}></div>
            </div>
            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: '36px', width: '40%', background: '#1e293b', borderRadius: '0.5rem' }}></div>
                <div style={{ height: '36px', width: '15%', background: '#1e293b', borderRadius: '0.5rem' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                <div style={{ height: '220px', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}></div>
                <div style={{ height: '220px', background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', flex: 1 }}>
                <div style={{ background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}></div>
                <div style={{ background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}></div>
                <div style={{ background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM (AGITATION) SECTION */}
      <section className="lp-section lp-section dark">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="lp-section-title">Vous vous battez avec les mêmes armes que tout le monde.</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            Vous envoyez des CV dans le vide. Vous attendez qu'on vous rappelle. Et quand vous obtenez un entretien, vous vous contentez de réciter votre parcours.
            <br/><br/>
            Le problème n'est pas votre parcours. <strong>Le problème est votre niveau de préparation stratégique.</strong>
          </p>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="lp-section">
        <div style={{ textAlign: 'center' }}>
          <h2 className="lp-section-title">4 piliers pour transformer une candidature en évidence</h2>
        </div>

        <div className="lp-grid-4">
          <div className="lp-card">
            <div className="lp-icon-wrapper"><Search size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>Lisez dans les pensées de votre cible</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Notre IA fouille le web et vous livre un rapport stratégique sur l'entreprise : sa culture réelle, ses défis actuels et ses dernières actualités.</p>
          </div>
          
          <div className="lp-card">
            <div className="lp-icon-wrapper"><Mic size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>Prenez le contrôle des 3 premières minutes</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Obtenez un pitch d'introduction implacable, structuré selon la Pyramide de Minto. Entraînez-vous vocalement face à notre simulateur.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper"><ShieldQuestion size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>Anticipez vos propres failles</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>L'algorithme compare votre parcours à la réalité du marché et vous montre vos faiblesses avant que le recruteur ne le fasse.</p>
          </div>

          <div className="lp-card">
            <div className="lp-icon-wrapper"><FileText size={24} /></div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>Passez les robots, marquez les humains</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Obtenez un CV au format "ATS" pour les algorithmes RH, et une version Design pour marquer l'esprit du décideur final.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (PROOF) SECTION */}
      <section className="lp-section lp-section dark">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title">Ce qu'en disent les professionnels de haut niveau</h2>
        </div>
        <div className="lp-testimonial-box">
          <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.7 }}>
            "Je pensais savoir me vendre. Beyond The CV m'a mis face à une réalité brutale : je ne racontais qu'une chronologie ennuyeuse. Le rapport OSINT et le simulateur vocal m'ont permis de décrocher un poste de Direction avec 15% de salaire en plus."
          </p>
          <p style={{ fontWeight: 600, marginTop: '1.5rem', color: '#f8fafc', textAlign: 'right' }}>— Marc D., Directeur des Opérations (C-Level)</p>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="lp-section">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title">De chercheur d'emploi à candidat stratégique</h2>
        </div>
        <div className="lp-grid-3">
          <div className="lp-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>1. Ciblez</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Importez votre profil et indiquez l'entreprise ou le poste que vous visez. Notre système commence l'analyse en arrière-plan.</p>
          </div>
          <div className="lp-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>2. Analysez</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Pendant que vous répondez à quelques questions de clarification, notre IA fouille le web (marché, entreprise, salaires).</p>
          </div>
          <div className="lp-card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem', color: '#f8fafc' }}>3. Dominez</h3>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>Atterrissez sur votre tableau de bord. Adaptez votre CV, lisez votre rapport d'entreprise et lancez le simulateur d'entretien.</p>
          </div>
        </div>
      </section>

      {/* OBJECTIONS (FAQ) SECTION */}
      <section className="lp-section lp-section dark">
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 className="lp-section-title">Vos questions, nos réponses</h2>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="lp-faq-item">
            <p className="lp-faq-question">J'ai déjà un bon CV, ai-je besoin de ça ?</p>
            <p className="lp-faq-answer">Un bon CV vous obtient un rendez-vous. Il ne vous donne pas la répartie pour répondre aux questions pièges, ni la connaissance des défis internes de l'entreprise. Nous préparons la phase orale et stratégique.</p>
          </div>
          <div className="lp-faq-item">
            <p className="lp-faq-question">Est-ce que ça va me prendre des heures ?</p>
            <p className="lp-faq-answer">Non. Vous importez vos données, le système travaille en tâche de fond. En moins de 5 minutes, vous accédez à votre Tableau de Bord de Pilotage avec les premières analyses.</p>
          </div>
          <div className="lp-faq-item">
            <p className="lp-faq-question">Et concernant le prix ?</p>
            <p className="lp-faq-answer">Combien vous coûte une opportunité ratée pour un poste à 80K€, 100K€ ou 150K€ ? Beyond The CV est l'investissement le plus rentable de votre transition professionnelle. Un tarif net pour un avantage décisif.</p>
          </div>
        </div>
      </section>

      {/* PRICING / FINAL CTA SECTION */}
      <section className="lp-section">
        <div className="lp-pricing">
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>Un investissement clair.</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '450px', margin: '0.5rem auto 0 auto' }}>
            Pas d'abonnement toxique. Un tarif net pour un avantage décisif.
          </p>
          
          <div style={{ fontSize: '3.5rem', fontWeight: 700, color: '#3b82f6', margin: '1.5rem 0' }}>99 €</div>
          <p style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '2.5rem' }}>Accès valable 4 mois. Renouvelable pour 20€.</p>
          
          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 2.5rem auto' }}>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#3b82f6" /> <strong>Dossier d'investigation complet</strong> (OSINT)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#3b82f6" /> <strong>Coaching Q&A</strong> (Méthode STAR, Parades défauts)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#3b82f6" /> <strong>Simulateur Vocal & Pitch</strong> (Analyse IA)</div>
            <div className="lp-check-item"><CheckCircle2 size={18} color="#3b82f6" /> <strong>CV Optimisé (ATS)</strong></div>
          </div>

          <button onClick={onStart} className="lp-cta-main" style={{ width: '100%', justifyContent: 'center' }}>
            Démarrer mon analyse stratégique
          </button>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '3rem 2rem', color: '#94a3b8', borderTop: '1px solid #1e293b', backgroundColor: '#020617' }}>
        <p>© 2026 BeyondTheCV. Tous droits réservés.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <button onClick={onShowLegal} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            Mentions Légales
          </button>
          <button onClick={onShowCGU} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            CGU
          </button>
          <button onClick={onShowPrivacy} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            Politique de Confidentialité
          </button>
        </div>
      </footer>
    </div>
  );
}