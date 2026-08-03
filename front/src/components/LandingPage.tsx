import React, { useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  MessageSquareText,
  Mic,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onLoginRedirect: () => void;
  onShowCGU: () => void;
  onShowPrivacy: () => void;
  onShowLegal: () => void;
  darkMode?: boolean;
}

export function LandingPage({
  onStart,
  onLoginRedirect,
  onShowCGU,
  onShowPrivacy,
  onShowLegal,
  darkMode,
}: LandingPageProps) {
  const pricingRef = useRef<HTMLElement | null>(null);

  const companyTree = [
    {
      name: 'Thales',
      badge: '3 offres',
      items: ['Analyse entreprise réutilisée', 'Offre : Responsable cybersécurité', 'Offre : Directeur de programme', 'Offre : Responsable opérations'],
    },
    {
      name: 'Naval Group',
      badge: '1 analyse',
      items: ['Analyse entreprise réutilisée', 'Offres et entretiens associés'],
    },
    {
      name: 'MBDA',
      badge: '1 analyse',
      items: ['Analyse entreprise réutilisée', 'Offres et entretiens associés'],
    },
  ];

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-container">
      <style>{`
        .lp-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          background: var(--bg-body);
          min-height: 100vh;
          line-height: 1.6;
        }
        .lp-hero {
          padding: 7rem 2rem 5rem;
          text-align: center;
          background:
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.13), transparent 38%),
            var(--bg-body);
        }
        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          padding: .45rem .9rem;
          border: 1px solid var(--border-color);
          border-radius: 999px;
          color: var(--primary);
          background: var(--bg-card);
          font-size: .86rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        .lp-hero-title {
          max-width: 930px;
          margin: 0 auto 1.4rem;
          font-size: clamp(2.25rem, 5vw, 4rem);
          line-height: 1.08;
          letter-spacing: -.04em;
          font-weight: 850;
        }
        .lp-hero-subtitle {
          max-width: 780px;
          margin: 0 auto 2.2rem;
          color: var(--text-muted);
          font-size: clamp(1.05rem, 2vw, 1.25rem);
        }
        .lp-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .lp-button-primary,
        .lp-button-secondary {
          min-height: 52px;
          padding: 0 1.45rem;
          border-radius: .65rem;
          font-size: 1rem;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .65rem;
          transition: .2s ease;
        }
        .lp-button-primary {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: #fff;
          box-shadow: 0 12px 25px rgba(59, 130, 246, .22);
        }
        .lp-button-primary:hover { transform: translateY(-2px); filter: brightness(.96); }
        .lp-button-secondary {
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-main);
        }
        .lp-button-secondary:hover { border-color: var(--primary); transform: translateY(-2px); }
        .lp-reassurance {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem 1.5rem;
          margin-top: 1.25rem;
          color: var(--text-muted);
          font-size: .88rem;
        }
        .lp-reassurance span { display: inline-flex; align-items: center; gap: .4rem; }
        .lp-preview {
          max-width: 1060px;
          margin: 4rem auto 0;
          padding: 0 1rem;
        }
        .lp-preview img {
          display: block;
          width: 100%;
          border-radius: 1rem;
          border: 5px solid var(--bg-card);
          box-shadow: 0 28px 60px -25px rgba(0, 0, 0, .55);
        }
        .lp-preview-caption { margin-top: .9rem; color: var(--text-muted); font-size: .85rem; }
        .lp-band {
          width: 100%;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
        }
        .lp-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5.5rem 2rem;
        }
        .lp-heading {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }
        .lp-heading h2 {
          margin: 0;
          font-size: clamp(1.8rem, 3vw, 2.55rem);
          line-height: 1.2;
          letter-spacing: -.025em;
        }
        .lp-heading p { margin: 1rem auto 0; color: var(--text-muted); font-size: 1.05rem; }
        .lp-grid-3,
        .lp-grid-6,
        .lp-pricing-grid {
          display: grid;
          gap: 1.5rem;
          margin-top: 3.2rem;
        }
        .lp-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .lp-grid-6 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .lp-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1.1rem;
          padding: 1.65rem;
          text-align: left;
          transition: .22s ease;
        }
        .lp-card:hover { transform: translateY(-4px); border-color: var(--primary); }
        .lp-card-icon {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: .8rem;
          color: var(--primary);
          background: rgba(59, 130, 246, .1);
          margin-bottom: 1rem;
        }
        .lp-card h3 { margin: 0 0 .55rem; font-size: 1.16rem; }
        .lp-card p { margin: 0; color: var(--text-muted); font-size: .95rem; }
        .lp-steps .lp-card { position: relative; padding-top: 2rem; }
        .lp-step-label {
          color: var(--primary);
          font-weight: 800;
          font-size: .82rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: .75rem;
        }
        .lp-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 3rem;
        }
        .lp-comparison-column {
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.8rem;
          background: var(--bg-card);
        }
        .lp-comparison-column.highlight { border: 2px solid var(--primary); }
        .lp-comparison-column h3 { margin-top: 0; }
        .lp-checklist { display: grid; gap: .85rem; margin-top: 1.3rem; }
        .lp-check {
          display: flex;
          gap: .7rem;
          align-items: flex-start;
          color: var(--text-main);
        }
        .lp-check svg { flex: 0 0 auto; margin-top: .15rem; color: var(--primary); }
        .lp-outcomes {
          max-width: 900px;
          margin: 3rem auto 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .lp-outcome {
          display: flex;
          gap: .75rem;
          align-items: flex-start;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: .9rem;
          padding: 1rem 1.1rem;
        }
        .lp-outcome svg { color: var(--primary); flex: 0 0 auto; margin-top: .15rem; }
        .lp-data-model {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.5rem;
          margin-top: 3rem;
        }
        .lp-data-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1.1rem;
          padding: 1.7rem;
          text-align: left;
        }
        .lp-data-card.primary { border: 2px solid var(--primary); }
        .lp-data-number {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: rgba(59, 130, 246, .12);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 850;
          margin-bottom: 1rem;
        }
        .lp-data-card h3 { margin: 0 0 .45rem; }
        .lp-data-card > p { color: var(--text-muted); margin: 0 0 1.1rem; }
        .lp-mini-list { display: grid; gap: .55rem; color: var(--text-main); font-size: .92rem; }
        .lp-mini-list span { display: flex; align-items: flex-start; gap: .5rem; }
        .lp-mini-list svg { color: var(--primary); flex: 0 0 auto; margin-top: .15rem; }
        .lp-tree {
          max-width: 920px;
          margin: 2.2rem auto 0;
          padding: 1.4rem;
          border: 1px solid var(--border-color);
          border-radius: 1.1rem;
          background: linear-gradient(145deg, var(--bg-card), var(--bg-secondary));
          box-shadow: 0 20px 40px -24px rgba(0, 0, 0, .35);
        }
        .lp-tree-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: .95rem;
          border-bottom: 1px solid var(--border-color);
        }
        .lp-tree-title {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-main);
        }
        .lp-tree-caption {
          color: var(--text-muted);
          font-size: .84rem;
        }
        .lp-tree-list {
          display: grid;
          gap: .8rem;
        }
        .lp-tree-company {
          border: 1px solid var(--border-color);
          border-radius: .95rem;
          padding: .95rem 1rem;
          background: rgba(255, 255, 255, .04);
        }
        .lp-tree-company-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: .7rem;
        }
        .lp-tree-company-name {
          display: inline-flex;
          align-items: center;
          gap: .55rem;
          font-weight: 750;
          color: var(--text-main);
        }
        .lp-tree-badge {
          display: inline-flex;
          align-items: center;
          padding: .25rem .6rem;
          border-radius: 999px;
          background: rgba(59, 130, 246, .12);
          color: var(--primary);
          font-size: .74rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .lp-tree-items {
          display: grid;
          gap: .55rem;
          padding-left: 1.1rem;
        }
        .lp-tree-item {
          display: flex;
          align-items: flex-start;
          gap: .55rem;
          color: var(--text-main);
          font-size: .92rem;
        }
        .lp-tree-item svg {
          color: var(--primary);
          flex: 0 0 auto;
          margin-top: .1rem;
        }
        .lp-quota-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin: 2.2rem auto 0;
          max-width: 900px;
        }
        .lp-quota-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: .95rem;
          padding: 1.25rem;
          text-align: left;
        }
        .lp-quota-label { color: var(--text-muted); font-size: .84rem; }
        .lp-quota-value { font-size: 1.4rem; font-weight: 850; margin-top: .2rem; }
        .lp-quota-help { color: var(--text-muted); font-size: .82rem; margin-top: .4rem; }
        .lp-pricing-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-width: 960px;
          margin-left: auto;
          margin-right: auto;
        }
        .lp-price-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1.15rem;
          padding: 2.2rem;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .lp-price-card.featured {
          border: 2px solid var(--primary);
          box-shadow: 0 20px 45px rgba(59, 130, 246, .12);
        }
        .lp-badge {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: white;
          padding: .3rem .9rem;
          border-radius: 999px;
          font-size: .76rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .lp-price-card h3 { margin: 0; font-size: 1.35rem; }
        .lp-price-desc { min-height: 52px; color: var(--text-muted); margin: .5rem 0 0; }
        .lp-price { margin: 1.2rem 0 .2rem; font-size: 3rem; font-weight: 850; letter-spacing: -.04em; }
        .lp-price-meta { color: var(--text-muted); font-size: .9rem; }
        .lp-price-list { display: grid; gap: .8rem; text-align: left; margin: 1.7rem 0 2rem; flex-grow: 1; }
        .lp-price-card button { width: 100%; }
        .lp-note {
          max-width: 820px;
          margin: 1.4rem auto 0;
          color: var(--text-muted);
          text-align: center;
          font-size: .9rem;
        }
        .lp-faq { max-width: 860px; margin: 3rem auto 0; }
        .lp-faq-item { padding: 1.4rem 0; border-bottom: 1px solid var(--border-color); }
        .lp-faq-item h3 { margin: 0; font-size: 1.06rem; }
        .lp-faq-item p { margin: .65rem 0 0; color: var(--text-muted); }
        .lp-final {
          max-width: 920px;
          margin: 0 auto;
          padding: 4rem 2rem;
          text-align: center;
          border-radius: 1.3rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
        }
        .lp-final h2 { margin: 0 0 1rem; font-size: clamp(1.8rem, 3vw, 2.5rem); }
        .lp-final p { max-width: 700px; margin: 0 auto 1.7rem; color: var(--text-muted); }
        .lp-footer {
          text-align: center;
          padding: 3rem 2rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
        }
        .lp-footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 1.3rem; margin-top: 1rem; }
        .lp-footer button { border: 0; background: transparent; color: var(--text-muted); cursor: pointer; padding: 0; }
        @media (max-width: 900px) {
          .lp-grid-3, .lp-grid-6 { grid-template-columns: 1fr 1fr; }
          .lp-comparison, .lp-pricing-grid, .lp-data-model { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .lp-hero { padding: 5rem 1.2rem 3.5rem; }
          .lp-section { padding: 4rem 1.2rem; }
          .lp-grid-3, .lp-grid-6, .lp-outcomes, .lp-quota-grid { grid-template-columns: 1fr; }
          .lp-actions { flex-direction: column; }
          .lp-actions button { width: 100%; }
          .lp-tree-header, .lp-tree-company-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <section className="lp-hero">
        <div className="lp-eyebrow"><Target size={16} /> Préparation stratégique aux entretiens</div>
        <h1 className="lp-hero-title">Ne subissez plus l’entretien. Pilotez la conversation.</h1>
        <p className="lp-hero-subtitle">
          BeyondTheCV analyse votre profil, le poste et l’entreprise pour vous aider à construire les bons arguments,
          anticiper les objections et vous entraîner avant un entretien important.
        </p>
        <div className="lp-actions">
          <button onClick={onStart} className="lp-button-primary">
            Préparer mon prochain entretien <ArrowRight size={18} />
          </button>
          <button onClick={scrollToPricing} className="lp-button-secondary">Voir les offres</button>
        </div>
        <div className="lp-reassurance">
          <span><CheckCircle2 size={15} /> Paiement unique</span>
          <span><CheckCircle2 size={15} /> 4 mois d’accès</span>
          <span><ShieldCheck size={15} /> Espace personnel sécurisé</span>
        </div>

        <div className="lp-preview">
          <img
            src={darkMode ? '/dashboard-preview-night.png' : '/dashboard-preview.png'}
            alt="Aperçu de l’espace de préparation BeyondTheCV"
          />
          <p className="lp-preview-caption">Aperçu de votre espace de préparation</p>
        </div>
      </section>

      <div className="lp-band">
        <section className="lp-section">
          <div className="lp-heading">
            <h2>Un bon parcours ne garantit pas un bon entretien</h2>
            <p>
              Vous pouvez avoir l’expérience attendue et perdre l’avantage faute d’exemples précis, d’un discours adapté
              ou d’une réponse solide à une objection sensible.
            </p>
          </div>
          <div className="lp-grid-3">
            <div className="lp-card"><h3>Vous récitez votre CV</h3><p>Votre parcours est riche, mais votre présentation manque de hiérarchie et de message central.</p></div>
            <div className="lp-card"><h3>Une question vous déstabilise</h3><p>Reconversion, trou dans le parcours, manque sectoriel ou rémunération : l’objection arrive sans prévenir.</p></div>
            <div className="lp-card"><h3>Vous quittez l’entretien dans le doute</h3><p>Vous ne savez pas ce qui a convaincu, ce qui a inquiété ni comment préparer le tour suivant.</p></div>
          </div>
        </section>
      </div>

      <section className="lp-section lp-steps">
        <div className="lp-heading">
          <h2>Une préparation continue, avant et après chaque entretien</h2>
          <p>BeyondTheCV ne produit pas une réponse isolée. La plateforme organise toute votre préparation autour d’une candidature réelle.</p>
        </div>
        <div className="lp-grid-3">
          <div className="lp-card">
            <div className="lp-step-label">Avant</div>
            <h3>Construisez votre stratégie</h3>
            <p>Décodez l’offre, analysez l’entreprise, identifiez vos écarts et préparez des pitchs adaptés à chaque interlocuteur.</p>
          </div>
          <div className="lp-card">
            <div className="lp-step-label">Entraînement</div>
            <h3>Testez vos réponses</h3>
            <p>Travaillez les questions probables, les mises en situation, votre expression orale et les objections du recruteur.</p>
          </div>
          <div className="lp-card">
            <div className="lp-step-label">Après</div>
            <h3>Débriefez et progressez</h3>
            <p>Analysez les signaux reçus, corrigez vos réponses et préparez le prochain échange à partir de ce qui s’est réellement passé.</p>
          </div>
        </div>
      </section>

      <div className="lp-band">
        <section className="lp-section">
          <div className="lp-heading">
            <h2>Un profil, plusieurs entreprises, plusieurs candidatures</h2>
            <p>
              Votre recherche d’emploi ne se limite pas à une annonce. BeyondTheCV conserve votre profil,
              mutualise l’analyse de chaque entreprise et prépare séparément chaque offre ciblée.
            </p>
          </div>

          <div className="lp-data-model">
            <div className="lp-data-card">
              <div className="lp-data-number">1</div>
              <h3>Votre profil candidat</h3>
              <p>Créé une fois, puis réutilisé dans toutes vos candidatures.</p>
              <div className="lp-mini-list">
                {['CV et expériences', 'Compétences et réalisations', 'Préférences et prétentions salariales', 'Pitch général'].map((item) => (
                  <span key={item}><CheckCircle2 size={16} />{item}</span>
                ))}
              </div>
            </div>

            <div className="lp-data-card primary">
              <div className="lp-data-number">2</div>
              <h3>Chaque entreprise cible</h3>
              <p>Une analyse dédiée, conservée et réutilisée pour toutes les offres de la même entreprise.</p>
              <div className="lp-mini-list">
                {['Stratégie, marché et actualités', 'Culture, risques et concurrents', 'Enjeux et défis de recrutement', 'Posture à adopter en entretien'].map((item) => (
                  <span key={item}><CheckCircle2 size={16} />{item}</span>
                ))}
              </div>
            </div>

            <div className="lp-data-card">
              <div className="lp-data-number">3</div>
              <h3>Chaque offre ciblée</h3>
              <p>Une préparation spécifique, reliée au bon profil et à la bonne entreprise.</p>
              <div className="lp-mini-list">
                {['Décodage et compétences attendues', 'Adéquation candidat-poste', 'Objections et questions probables', 'Pitch adapté et plan de préparation'].map((item) => (
                  <span key={item}><CheckCircle2 size={16} />{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="lp-tree">
            <div className="lp-tree-header">
              <div className="lp-tree-title">Recherche d’emploi</div>
              <div className="lp-tree-caption">Profil partagé • analyses entreprises • offres spécifiques</div>
            </div>
            <div className="lp-tree-list">
              {companyTree.map((company) => (
                <div className="lp-tree-company" key={company.name}>
                  <div className="lp-tree-company-header">
                    <div className="lp-tree-company-name">
                      <Building2 size={16} />
                      <span>{company.name}</span>
                    </div>
                    <div className="lp-tree-badge">{company.badge}</div>
                  </div>
                  <div className="lp-tree-items">
                    {company.items.map((item) => (
                      <div className="lp-tree-item" key={item}>
                        <CheckCircle2 size={15} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="lp-note">
            Ajouter une nouvelle offre chez Thales ne relance pas toute l’analyse de Thales. Seule l’offre est préparée.
            Ajouter Naval Group crée en revanche une nouvelle analyse d’entreprise, sans effacer les candidatures précédentes.
          </p>
        </section>
      </div>

      <section className="lp-section">
        <div className="lp-heading">
          <h2>Des limites lisibles, jamais un compteur de crédits opaque</h2>
          <p>Vous savez avant chaque action ce qui sera utilisé et ce qui restera dans votre pack.</p>
        </div>
        <div className="lp-quota-grid">
          <div className="lp-quota-card"><div className="lp-quota-label">Entreprises ciblées</div><div className="lp-quota-value">2 / 3 utilisées</div><div className="lp-quota-help">Une analyse complète par entreprise.</div></div>
          <div className="lp-quota-card"><div className="lp-quota-label">Offres préparées</div><div className="lp-quota-value">5 / 9 utilisées</div><div className="lp-quota-help">Chaque annonce conserve son analyse et son suivi.</div></div>
          <div className="lp-quota-card"><div className="lp-quota-label">Entraînements</div><div className="lp-quota-value">4 séances restantes</div><div className="lp-quota-help">Questions, scénarios, oral et négociation.</div></div>
        </div>
        <p className="lp-note">
          Avant de lancer une analyse, BeyondTheCV vous indique clairement si elle utilise une entreprise, une offre ou une séance d’entraînement.
        </p>
      </section>

      <div className="lp-band">
        <section className="lp-section">
          <div className="lp-heading">
            <h2>Tout ce qu’il faut pour transformer votre expérience en arguments convaincants</h2>
          </div>
          <div className="lp-grid-6">
            <div className="lp-card"><div className="lp-card-icon"><FileSearch size={23} /></div><h3>Décodez le poste</h3><p>Repérez les attentes explicites, les besoins cachés et les difficultés que le recrutement doit résoudre.</p></div>
            <div className="lp-card"><div className="lp-card-icon"><Building2 size={23} /></div><h3>Comprenez l’entreprise</h3><p>Identifiez ses actualités, ses priorités et les sujets à connaître avant de rencontrer le recruteur.</p></div>
            <div className="lp-card"><div className="lp-card-icon"><MessageSquareText size={23} /></div><h3>Construisez vos pitchs</h3><p>Adaptez votre présentation au RH, au manager, à la direction ou à un échange réseau.</p></div>
            <div className="lp-card"><div className="lp-card-icon"><Mic size={23} /></div><h3>Entraînez-vous réellement</h3><p>Répondez à des questions et scénarios liés au poste, puis améliorez la structure et l’impact de vos réponses.</p></div>
            <div className="lp-card"><div className="lp-card-icon"><ShieldCheck size={23} /></div><h3>Anticipez les objections</h3><p>Préparez des réponses crédibles sur les écarts de parcours, la reconversion ou la rémunération.</p></div>
            <div className="lp-card"><div className="lp-card-icon"><RefreshCw size={23} /></div><h3>Exploitez chaque entretien</h3><p>Transformez les questions, réactions et signaux du recruteur en plan d’action pour la suite.</p></div>
          </div>
        </section>
      </div>

      <section className="lp-section">
        <div className="lp-heading">
          <h2>Pourquoi ne pas simplement utiliser une IA généraliste ?</h2>
          <p>Une IA généraliste peut répondre à une demande ponctuelle. BeyondTheCV maintient une préparation cohérente tout au long de votre candidature.</p>
        </div>
        <div className="lp-comparison">
          <div className="lp-comparison-column">
            <h3>IA généraliste</h3>
            <div className="lp-checklist">
              <div className="lp-check"><CheckCircle2 size={18} /><span>Répond à un prompt isolé</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>Vous laisse organiser vous-même les informations</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>N’assure pas la continuité entre préparation et débrief</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>N’impose pas de méthode spécifique à l’entretien</span></div>
            </div>
          </div>
          <div className="lp-comparison-column highlight">
            <h3>BeyondTheCV</h3>
            <div className="lp-checklist">
              <div className="lp-check"><CheckCircle2 size={18} /><span>Relie votre profil, l’offre et l’entreprise</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>Centralise pitchs, objections et entraînements</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>Évalue vos réponses selon le poste ciblé</span></div>
              <div className="lp-check"><CheckCircle2 size={18} /><span>Réutilise le débrief pour préparer le tour suivant</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-band">
        <section className="lp-section">
          <div className="lp-heading">
            <h2>À la fin de votre préparation, vous savez précisément quoi défendre</h2>
          </div>
          <div className="lp-outcomes">
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Présenter votre valeur sans réciter votre CV.</span></div>
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Illustrer vos compétences avec des exemples concrets.</span></div>
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Répondre aux principales objections sur votre profil.</span></div>
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Expliquer pourquoi vous visez ce poste et cette entreprise.</span></div>
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Aborder la rémunération avec une position préparée.</span></div>
            <div className="lp-outcome"><CheckCircle2 size={20} /><span>Capitaliser sur chaque entretien pour progresser.</span></div>
          </div>
        </section>
      </div>

      <section ref={pricingRef} className="lp-section">
        <div className="lp-heading">
          <h2>Choisissez votre niveau de préparation</h2>
          <p>Deux offres, un paiement unique et quatre mois pour piloter plusieurs candidatures sans recommencer votre travail.</p>
        </div>
        <div className="lp-pricing-grid">
          <div className="lp-price-card featured">
            <div className="lp-badge">La plus choisie</div>
            <h3>Stratégique</h3>
            <p className="lp-price-desc">La préparation complète à un entretien important.</p>
            <div className="lp-price">119 €</div>
            <div className="lp-price-meta">Paiement unique · Accès 4 mois</div>
            <div className="lp-price-list">
              {[
                '1 profil candidat réutilisable',
                '3 entreprises ciblées et conservées',
                'Jusqu’à 9 offres préparées',
                'Analyse dédiée de chaque entreprise',
                'Décodage et adéquation de chaque offre',
                'Pitchs, objections et questions adaptés',
                'Suivi des entretiens par offre',
                'Débrief et préparation du tour suivant',
                'Exports PDF de préparation',
                '15 séances d’entraînement IA',
              ].map((item) => <div className="lp-check" key={item}><CheckCircle2 size={18} /><span>{item}</span></div>)}
            </div>
            <button onClick={onLoginRedirect} className="lp-button-primary">Préparer mon entretien</button>
          </div>

          <div className="lp-price-card">
            <h3>Décisive</h3>
            <p className="lp-price-desc">Pour un dernier tour, un poste à fort enjeu ou une négociation importante.</p>
            <div className="lp-price">219 €</div>
            <div className="lp-price-meta">Paiement unique · Accès 4 mois</div>
            <div className="lp-price-list">
              {[
                'Tout le pack Stratégique',
                '5 entreprises ciblées et conservées',
                'Jusqu’à 15 offres préparées',
                '30 séances d’entraînement IA',
                'Actualisation des analyses entreprise',
                'Stress Test final sous pression',
                'Négociation salariale avancée',
                'Plan personnalisé « 24 h avant »',
                'Analyse post-entretien avancée',
                'Synthèse finale avant entretien',
              ].map((item) => <div className="lp-check" key={item}><CheckCircle2 size={18} /><span>{item}</span></div>)}
            </div>
            <button onClick={onLoginRedirect} className="lp-button-secondary">Préparer une candidature décisive</button>
          </div>
        </div>
        <p className="lp-note">Des séances supplémentaires pourront être ajoutées ultérieurement depuis votre espace, uniquement si votre préparation l’exige.</p>
      </section>

      <div className="lp-band">
        <section className="lp-section">
          <div className="lp-heading"><h2>Vos questions, nos réponses</h2></div>
          <div className="lp-faq">
            <div className="lp-faq-item"><h3>Pourquoi payer alors que ChatGPT ou Claude existent ?</h3><p>BeyondTheCV ne se limite pas à générer du texte. La plateforme relie toutes les étapes de votre candidature, applique une méthode spécialisée et conserve la continuité entre vos analyses, vos entraînements et vos débriefs.</p></div>
            <div className="lp-faq-item"><h3>Qu’est-ce qu’une séance d’entraînement IA ?</h3><p>Une séance correspond à une interaction d’entraînement ou d’évaluation approfondie : réponse à une question, mise en situation, exercice oral ou négociation. Les analyses d’entreprise et d’offre disposent de leurs propres limites et ne sont jamais mélangées avec ce compteur.</p></div>
            <div className="lp-faq-item"><h3>Puis-je préparer plusieurs offres dans la même entreprise ?</h3><p>Oui. L’analyse de l’entreprise est réalisée une fois puis réutilisée pour ses différentes offres. Chaque annonce conserve toutefois son propre décodage, ses objections, ses questions, ses entretiens et ses débriefs.</p></div>
            <div className="lp-faq-item"><h3>Que se passe-t-il lorsque j’ajoute une autre entreprise ?</h3><p>Une nouvelle analyse d’entreprise est créée sans supprimer les précédentes. Vous pouvez basculer entre vos candidatures et conserver l’historique de chaque offre.</p></div>
            <div className="lp-faq-item"><h3>La plateforme convient-elle aux cadres expérimentés ?</h3><p>Oui. BeyondTheCV est conçu pour les cadres, managers et dirigeants. Le niveau d’exigence porte notamment sur la prise de décision, le leadership, l’impact et les résultats obtenus.</p></div>
            <div className="lp-faq-item"><h3>Combien de temps faut-il prévoir ?</h3><p>Votre espace est prérempli à partir de votre CV et de l’offre. Vous choisissez ensuite le niveau d’approfondissement selon l’échéance de l’entretien. Une préparation sérieuse reste un travail : l’application vous fait gagner du temps, elle ne remplace pas votre implication.</p></div>
            <div className="lp-faq-item"><h3>Mes informations restent-elles confidentielles ?</h3><p>Votre espace est personnel et vos données sont utilisées pour produire votre préparation. Les modalités précises de traitement, de conservation et de suppression sont détaillées dans la politique de confidentialité.</p></div>
            <div className="lp-faq-item"><h3>BeyondTheCV garantit-il une embauche ?</h3><p>Non. Aucun outil sérieux ne peut garantir une décision de recrutement. BeyondTheCV vous aide à arriver mieux préparé, à produire des réponses plus solides et à progresser d’un entretien à l’autre.</p></div>
          </div>
        </section>
      </div>

      <section className="lp-section">
        <div className="lp-final">
          <BarChart3 size={34} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2>Votre prochain entretien mérite mieux qu’une préparation improvisée</h2>
          <p>Construisez un discours adapté au poste, testez vos réponses et arrivez avec une stratégie claire.</p>
          <button onClick={onLoginRedirect} className="lp-button-primary">Construire ma préparation <ArrowRight size={18} /></button>
        </div>
      </section>

      <footer className="lp-footer">
        <p>© 2026 BeyondTheCV. Tous droits réservés.</p>
        <div className="lp-footer-links">
          <button onClick={onShowLegal}>Mentions légales</button>
          <button onClick={onShowCGU}>CGU</button>
          <button onClick={onShowPrivacy}>Politique de confidentialité</button>
        </div>
      </footer>
    </div>
  );
}