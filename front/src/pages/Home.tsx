import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Mic, Network, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body, #f8fafc)', color: 'var(--text-main, #0f172a)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 5%', backgroundColor: 'var(--bg-card, #ffffff)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--bleu-fonce, #0F2650)', letterSpacing: '-0.5px' }}>
          BeyondThe<span style={{ color: 'var(--primary, #3b82f6)' }}>CV</span>
        </div>
        <button 
          onClick={() => navigate('/candidate')} 
          style={{ background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem' }}
        >
          Connexion
        </button>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '6rem 5%', textAlign: 'center', background: 'linear-gradient(to bottom, #0F2650, #1e293b)', color: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '1.5rem' }}>
            ARRÊTEZ D'ENVOYER DES LISTES DE TÂCHES. POSTULEZ COMME UN LEADER.
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-1px' }}>
            Reprenez le contrôle total de votre trajectoire professionnelle.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Ce qui fait la différence entre une candidature ignorée et une offre signée, c'est le positionnement. Découvrez le premier <strong>Coach de Carrière augmenté par l'IA</strong>, conçu pour les cadres exigeants.
          </p>
          <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#94a3b8', marginBottom: '2.5rem' }}>
            "BeyondTheCV, parce que les recruteurs lisent entre les lignes."
          </p>
          <button 
            onClick={() => navigate('/candidate')}
            style={{ background: 'var(--primary, #3b82f6)', color: 'white', border: 'none', padding: '1rem 2.5rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)', transition: 'transform 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Auditer mon profil professionnel <ArrowRight size={20} />
          </button>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
            Diagnostic immédiat de vos angles morts stratégiques
          </div>
        </div>
      </header>

      {/* Problem & Solution Section */}
      <section style={{ padding: '5rem 5%', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--bleu-fonce, #0F2650)', marginBottom: '1.5rem' }}>
            Pourquoi les meilleurs profils sont-ils parfois écartés ?
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.7, maxWidth: '800px', margin: '0 auto' }}>
            En tant que cadre, votre CV est lourd et complexe. Mais face à un DRH ou un chasseur de têtes, la décision se prend en 10 secondes. Ils ne lisent pas vos puces. Ils cherchent des réponses à des questions invisibles : <br/><br/>
            <em>Ce profil est-il trop rigide ? Est-ce un vrai leader ou juste un technicien ? Quels sont les "Red Flags" cachés derrière ce jargon ?</em><br/><br/>
            <strong>Vous ne pouvez pas corriger ce que vous ne voyez pas. Il vous faut un regard de l'intérieur.</strong>
          </p>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '3rem', borderRadius: '1.5rem', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary, #3b82f6)', marginBottom: '1rem' }}>
            L'œil clinique du Recruteur. La main tendue du Coach.
          </h3>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-main, #334155)', lineHeight: 1.6, margin: 0 }}>
            BeyondTheCV ne se contente pas de reformuler vos phrases. Notre algorithme agit comme un véritable <strong>sparring-partner</strong>. Il attaque votre profil avec la sévérité d'un chasseur de têtes, puis vous accompagne avec la bienveillance d'un coach exécutif pour corriger le tir avant l'envoi.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '5rem 5%', background: 'var(--bg-card, #ffffff)', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'var(--bleu-fonce, #0F2650)', marginBottom: '4rem' }}>
            4 modules stratégiques pour sécuriser votre prochaine étape
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              { icon: <Shield size={32} color="#ef4444" />, title: "Le Crash-Test Recruteur", desc: "Découvrez exactement ce qu'un DRH pense de votre profil en 'off'. Nous identifions vos signaux d'alerte (Red Flags) et évaluons votre probabilité de décrocher l'entretien." },
              { icon: <Search size={32} color="#3b82f6" />, title: "Le Décodeur de Fiche", desc: "Ne répondez plus à côté. Nous traduisons le jargon RH en réalité opérationnelle. Découvrez les véritables attentes cachées et les pièges du poste." },
              { icon: <Mic size={32} color="#8b5cf6" />, title: "L'Entraînement Exécutif", desc: "L'entretien se gagne dans les 3 premières minutes. Obtenez un Pitch oral millimétré et anticipez les 20 questions pièges spécifiques à votre parcours." },
              { icon: <Network size={32} color="#10b981" />, title: "Le Radar du Marché", desc: "Évaluez votre employabilité en temps réel. Accédez à un baromètre de salaires précis et identifiez les entreprises qui recrutent sous le radar." }
            ].map((f, i) => (
              <div key={i} style={{ padding: '2rem', background: 'var(--bg-body, #f8fafc)', borderRadius: '1rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <div style={{ marginBottom: '1.5rem', background: 'white', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  {f.icon}
                </div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main, #0f172a)' }}>{f.title}</h4>
                <p style={{ color: 'var(--text-muted, #64748b)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '6rem 5%', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--bleu-fonce, #0F2650)', marginBottom: '1rem' }}>
            Un investissement stratégique
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '3rem' }}>
            Oubliez les abonnements mensuels obscurs et les coachings à plus de 1500€. Obtenez un arsenal complet pour la durée exacte de votre transition.
          </p>

          <div style={{ background: 'white', padding: '3rem', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', border: '2px solid #bae6fd', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--primary, #3b82f6)', color: 'white', padding: '0.5rem 1.5rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              PASS "TRANSITION EXÉCUTIVE"
            </div>
            
            <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--bleu-fonce, #0F2650)', margin: '1.5rem 0 0.5rem 0', lineHeight: 1 }}>
              129 €
            </div>
            <div style={{ color: '#64748b', fontWeight: 500, marginBottom: '2.5rem' }}>
              Paiement unique pour 3 mois d'accès illimité
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', maxWidth: '450px', margin: '0 auto 3rem auto' }}>
              {[
                "Audit de professionnalisme en temps réel",
                "Génération de CV (Format Unique optimisé ATS & DRH)",
                "Accès au Career Simulator (Pivots de carrière)",
                "Décodage illimité d'offres d'emploi",
                "Analyses des marchés et baromètres de salaires",
                "Préparation intensive aux entretiens de haut niveau"
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <CheckCircle2 size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#334155', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => navigate('/candidate')}
              style={{ background: 'var(--bleu-fonce, #0F2650)', color: 'white', border: 'none', padding: '1.25rem 3rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '0.75rem', cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1e3a8a'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--bleu-fonce, #0F2650)'}
            >
              Démarrer ma transition aujourd'hui
            </button>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Un seul entretien réussi rentabilise cet investissement au centuple.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', padding: '3rem 5%', color: '#cbd5e1', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'white' }}>
          <Lock size={20} />
          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Votre carrière, vos données.</h4>
        </div>
        <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.8 }}>
          En tant que cadre, la discrétion est absolue. Vos données ne sont jamais vendues, ni utilisées pour entraîner des modèles publics. L'audit de votre profil se fait dans un environnement sécurisé et strictement confidentiel.
        </p>
        <div style={{ marginTop: '3rem', fontSize: '0.8rem', opacity: 0.5 }}>
          © {new Date().getFullYear()} BeyondTheCV. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}