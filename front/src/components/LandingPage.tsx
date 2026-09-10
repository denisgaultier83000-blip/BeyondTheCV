import React, { useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  Gauge,
  MessageSquareText,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
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

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features = [
    {
      icon: <FileSearch size={23} />,
      title: 'Décoder le poste',
      text: 'Comprenez les attentes explicites, les besoins cachés et les difficultés que le recrutement doit résoudre.',
    },
    {
      icon: <Building2 size={23} />,
      title: 'Comprendre l’entreprise',
      text: 'Analysez sa stratégie, son marché, ses actualités, ses enjeux et les éléments à connaître avant l’entretien.',
    },
    {
      icon: <MessageSquareText size={23} />,
      title: 'Construire votre discours',
      text: 'Préparez vos pitchs, vos arguments clés et vos réponses aux objections à partir de votre profil réel.',
    },
    {
      icon: <Mic size={23} />,
      title: 'Vous entraîner réellement',
      text: 'Répondez aux questions, mises en situation et simulations, puis améliorez vos réponses après analyse.',
    },
    {
      icon: <TrendingUp size={23} />,
      title: 'Suivre votre progression',
      text: 'Votre profil stratégique évolue avec vos entraînements et fait ressortir vos forces, vos écarts et vos priorités.',
    },
    {
      icon: <RefreshCw size={23} />,
      title: 'Capitaliser après l’entretien',
      text: 'Débriefez les questions posées, les signaux reçus et préparez le prochain échange sans repartir de zéro.',
    },
  ];

  return (
    <div className="lp-container">
      <style>{`
        .lp-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-main);
          background: var(--bg-body);
          min-height: 100vh;
          line-height: 1.6;
          --lp-blue-soft: rgba(59,130,246,.08);
          --lp-blue-soft-2: rgba(59,130,246,.13);
          --lp-cyan-soft: rgba(20,184,166,.10);
          --lp-violet-soft: rgba(139,92,246,.10);
          --lp-amber-soft: rgba(245,158,11,.11);
          --lp-rose-soft: rgba(239,68,68,.09);
        }

        .lp-shell {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .lp-hero {
          position: relative;
          overflow: hidden;
          padding: 7rem 0 5rem;
          background:
            radial-gradient(circle at 82% 18%, rgba(59,130,246,.24), transparent 30%),
            radial-gradient(circle at 12% 4%, rgba(99,102,241,.14), transparent 28%),
            linear-gradient(180deg, rgba(59,130,246,.045), rgba(59,130,246,0) 65%),
            var(--bg-body);
        }

        .lp-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(520px, 1.15fr);
          gap: 4rem;
          align-items: center;
        }

        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          padding: .42rem .85rem;
          border: 1px solid rgba(59,130,246,.28);
          border-radius: 999px;
          background: rgba(59,130,246,.08);
          color: var(--primary);
          font-size: .84rem;
          font-weight: 800;
          margin-bottom: 1.4rem;
        }

        .lp-hero-title {
          margin: 0;
          max-width: 720px;
          font-size: clamp(2.65rem, 5vw, 4.65rem);
          line-height: 1.03;
          letter-spacing: -.055em;
          font-weight: 880;
        }

        .lp-hero-subtitle {
          max-width: 690px;
          margin: 1.5rem 0 0;
          color: var(--text-muted);
          font-size: clamp(1.05rem, 1.8vw, 1.22rem);
        }

        .lp-hero-strong {
          color: var(--text-main);
          font-weight: 760;
        }

        .lp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: .9rem;
          margin-top: 2rem;
        }

        .lp-button-primary,
        .lp-button-secondary {
          min-height: 52px;
          padding: 0 1.4rem;
          border-radius: .62rem;
          font-size: .98rem;
          font-weight: 780;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .65rem;
          transition: transform .2s ease, border-color .2s ease, filter .2s ease;
        }

        .lp-button-primary {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: #fff;
          box-shadow: 0 14px 30px rgba(59,130,246,.22);
        }

        .lp-button-primary:hover {
          transform: translateY(-2px);
          filter: brightness(.96);
        }

        .lp-button-secondary {
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          color: var(--text-main);
        }

        .lp-button-secondary:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }

        .lp-reassurance {
          display: flex;
          flex-wrap: wrap;
          gap: .8rem 1.15rem;
          margin-top: 1.15rem;
          color: var(--text-muted);
          font-size: .86rem;
        }

        .lp-reassurance span {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
        }

        .lp-product-frame {
          position: relative;
          padding: 1rem;
          border-radius: 1.35rem;
          background: linear-gradient(145deg, rgba(59,130,246,.24), rgba(99,102,241,.08));
          border: 1px solid rgba(59,130,246,.30);
          box-shadow: 0 35px 70px -35px rgba(0,0,0,.55);
        }

        .lp-product-frame img {
          width: 100%;
          display: block;
          border-radius: .95rem;
          border: 1px solid var(--border-color);
        }

        .lp-floating-card {
          position: absolute;
          left: -2rem;
          bottom: 1.5rem;
          width: 245px;
          padding: 1rem 1.05rem;
          border-radius: .9rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: 0 18px 35px -18px rgba(0,0,0,.45);
        }

        .lp-floating-card strong {
          display: block;
          font-size: .92rem;
        }

        .lp-floating-card span {
          display: block;
          margin-top: .25rem;
          color: var(--text-muted);
          font-size: .8rem;
        }

        .lp-trust-strip {
          padding: 1.15rem 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          background: linear-gradient(90deg, rgba(59,130,246,.07), rgba(99,102,241,.05));
        }

        .lp-trust-items {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: .88rem;
          font-weight: 680;
        }

        .lp-section {
          padding: 6rem 0;
        }

        .lp-section.soft {
          background:
            radial-gradient(circle at 90% 10%, rgba(59,130,246,.10), transparent 25%),
            linear-gradient(180deg, rgba(59,130,246,.045), rgba(99,102,241,.025)),
            var(--bg-secondary);
          border-top: 1px solid rgba(59,130,246,.14);
          border-bottom: 1px solid rgba(59,130,246,.14);
        }

        .lp-section-header {
          max-width: 760px;
          margin-bottom: 3rem;
        }

        .lp-section-header.center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }

        .lp-section-kicker {
          color: var(--primary);
          font-size: .82rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: .7rem;
        }

        .lp-section h2 {
          margin: 0;
          font-size: clamp(2rem, 3.4vw, 3rem);
          line-height: 1.13;
          letter-spacing: -.035em;
        }

        .lp-section-header p {
          margin: 1rem 0 0;
          color: var(--text-muted);
          font-size: 1.05rem;
        }

        .lp-problem-grid {
          display: grid;
          grid-template-columns: .85fr 1.15fr;
          gap: 4rem;
          align-items: center;
        }

        .lp-problem-copy {
          display: grid;
          gap: 1rem;
        }

        .lp-problem-item {
          padding: 1.05rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .lp-problem-item:last-child {
          border-bottom: 0;
        }

        .lp-problem-item strong {
          display: block;
          margin-bottom: .25rem;
        }

        .lp-problem-item span {
          color: var(--text-muted);
          font-size: .94rem;
        }

        .lp-solution-panel {
          border: 1px solid var(--border-color);
          border-radius: 1.25rem;
          background: var(--bg-card);
          padding: 1.8rem;
          box-shadow: 0 24px 50px -32px rgba(0,0,0,.45);
        }

        .lp-solution-title {
          display: flex;
          align-items: center;
          gap: .7rem;
          margin-bottom: 1.3rem;
          font-weight: 820;
        }

        .lp-step {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: .9rem;
          padding: 1rem 0;
          border-top: 1px solid var(--border-color);
        }

        .lp-step:first-of-type { border-top: 0; }

        .lp-step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59,130,246,.10);
          color: var(--primary);
          font-weight: 850;
        }

        .lp-step strong { display: block; }
        .lp-step span {
          display: block;
          margin-top: .2rem;
          color: var(--text-muted);
          font-size: .9rem;
        }

        .lp-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 1.2rem;
        }

        .lp-feature-card {
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 1.45rem;
          transition: transform .2s ease, border-color .2s ease;
        }

        .lp-feature-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
        }

        .lp-feature-icon {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: .75rem;
          background: rgba(59,130,246,.10);
          color: var(--primary);
          margin-bottom: 1rem;
        }

        .lp-feature-card h3 {
          margin: 0 0 .45rem;
          font-size: 1.08rem;
        }

        .lp-feature-card p {
          margin: 0;
          color: var(--text-muted);
          font-size: .92rem;
        }

        .lp-feature-card:nth-child(1) { background: linear-gradient(180deg, var(--lp-blue-soft), var(--bg-card)); }
        .lp-feature-card:nth-child(2) { background: linear-gradient(180deg, var(--lp-cyan-soft), var(--bg-card)); }
        .lp-feature-card:nth-child(3) { background: linear-gradient(180deg, var(--lp-violet-soft), var(--bg-card)); }
        .lp-feature-card:nth-child(4) { background: linear-gradient(180deg, var(--lp-amber-soft), var(--bg-card)); }
        .lp-feature-card:nth-child(5) { background: linear-gradient(180deg, var(--lp-rose-soft), var(--bg-card)); }
        .lp-feature-card:nth-child(6) { background: linear-gradient(180deg, var(--lp-blue-soft-2), var(--bg-card)); }

        .lp-method-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 2.6rem;
          align-items: stretch;
        }

        .lp-method-card {
          position: relative;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 1.45rem 1.15rem;
          min-height: 235px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .lp-method-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 35px -26px rgba(0,0,0,.35);
        }

        .lp-method-card.accent-1 {
          border-top: 4px solid #3b82f6;
          background: linear-gradient(180deg, var(--lp-blue-soft), var(--bg-card));
        }
        .lp-method-card.accent-2 {
          border-top: 4px solid #14b8a6;
          background: linear-gradient(180deg, var(--lp-cyan-soft), var(--bg-card));
        }
        .lp-method-card.accent-3 {
          border-top: 4px solid #8b5cf6;
          background: linear-gradient(180deg, var(--lp-violet-soft), var(--bg-card));
        }
        .lp-method-card.accent-4 {
          border-top: 4px solid #f59e0b;
          background: linear-gradient(180deg, var(--lp-amber-soft), var(--bg-card));
        }
        .lp-method-card.accent-5 {
          border-top: 4px solid #ef4444;
          background: linear-gradient(180deg, var(--lp-rose-soft), var(--bg-card));
        }

        .lp-method-card h3 {
          margin: 0;
          font-size: 1.04rem;
          line-height: 1.25;
        }

        .lp-method-card ul {
          list-style: none;
          padding: 0;
          margin: 1.5rem 0 0;
          display: grid;
          gap: .6rem;
        }

        .lp-method-card li {
          color: var(--text-muted);
          font-size: .9rem;
          line-height: 1.35;
        }

        .lp-method-footer {
          max-width: 920px;
          margin: 2.4rem auto 0;
          padding: 1rem 1.2rem;
          text-align: center;
          border-radius: .9rem;
          background: rgba(59,130,246,.08);
          border: 1px solid rgba(59,130,246,.18);
          color: var(--text-main);
          font-weight: 780;
        }

        .lp-eval-showcase {
          margin-top: 2.5rem;
        }

        .lp-eval-frame {
          padding: 1rem;
          border-radius: 1.25rem;
          background: linear-gradient(145deg, rgba(59,130,246,.18), rgba(99,102,241,.06));
          border: 1px solid rgba(59,130,246,.28);
          box-shadow: 0 28px 55px -34px rgba(0,0,0,.45);
        }

        .lp-eval-frame img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: .9rem;
          border: 1px solid var(--border-color);
        }

        .lp-eval-points {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.2rem;
        }

        .lp-eval-point {
          display: flex;
          gap: .65rem;
          align-items: flex-start;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: .9rem;
          background: var(--bg-card);
        }

        .lp-eval-point svg {
          color: var(--primary);
          flex: 0 0 auto;
          margin-top: .15rem;
        }

        .lp-eval-point strong {
          display: block;
          margin-bottom: .2rem;
          font-size: .95rem;
        }

        .lp-eval-point span {
          color: var(--text-muted);
          font-size: .85rem;
          line-height: 1.45;
        }

        .lp-showcase {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .lp-showcase.reverse .lp-showcase-copy { order: 2; }
        .lp-showcase.reverse .lp-showcase-visual { order: 1; }

        .lp-showcase-copy h2 {
          margin: 0;
          font-size: clamp(2rem, 3.2vw, 2.85rem);
          line-height: 1.14;
          letter-spacing: -.035em;
        }

        .lp-showcase-copy > p {
          color: var(--text-muted);
          font-size: 1.02rem;
          margin: 1rem 0 0;
        }

        .lp-bullet-list {
          display: grid;
          gap: .8rem;
          margin-top: 1.5rem;
        }

        .lp-bullet {
          display: flex;
          gap: .65rem;
          align-items: flex-start;
        }

        .lp-bullet svg {
          color: var(--primary);
          flex: 0 0 auto;
          margin-top: .15rem;
        }

        .lp-showcase-visual {
          min-height: 350px;
          padding: 1.5rem;
          border-radius: 1.25rem;
          border: 1px solid var(--border-color);
          background:
            radial-gradient(circle at 82% 18%, rgba(59,130,246,.18), transparent 36%),
            linear-gradient(160deg, rgba(59,130,246,.06), rgba(139,92,246,.035)),
            var(--bg-card);
          box-shadow: 0 24px 50px -32px rgba(0,0,0,.45);
        }

        .lp-profile-top {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: .75rem;
        }

        .lp-profile-stat {
          padding: .9rem;
          border-radius: .8rem;
          border: 1px solid var(--border-color);
          background: rgba(59,130,246,.05);
        }

        .lp-profile-stat span {
          display: block;
          color: var(--text-muted);
          font-size: .72rem;
          text-transform: uppercase;
          font-weight: 760;
        }

        .lp-profile-stat strong {
          display: block;
          margin-top: .2rem;
          font-size: 1.02rem;
        }

        .lp-profile-bars {
          display: grid;
          gap: .85rem;
          margin-top: 1.25rem;
        }

        .lp-profile-row {
          display: grid;
          grid-template-columns: 145px 1fr 40px;
          align-items: center;
          gap: .7rem;
          font-size: .82rem;
        }

        .lp-progress {
          height: 8px;
          background: var(--bg-secondary);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .lp-progress > span {
          display: block;
          height: 100%;
          background: var(--primary);
          border-radius: inherit;
        }

        .lp-priority-card {
          margin-top: 1.3rem;
          padding: 1rem;
          border: 1px solid rgba(59,130,246,.35);
          background: rgba(59,130,246,.08);
          border-radius: .85rem;
        }

        .lp-priority-card small {
          color: var(--primary);
          font-weight: 800;
          text-transform: uppercase;
        }

        .lp-priority-card strong {
          display: block;
          margin-top: .25rem;
        }







        .lp-compare-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.3rem;
        }

        .lp-compare-card {
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 1.5rem;
        }

        .lp-compare-card.highlight {
          border: 2px solid var(--primary);
          background: linear-gradient(180deg, rgba(59,130,246,.10), var(--bg-card));
          box-shadow: 0 20px 40px -30px rgba(59,130,246,.55);
        }

        .lp-compare-card h3 { margin-top: 0; }

        .lp-checklist {
          display: grid;
          gap: .8rem;
          margin-top: 1rem;
        }

        .lp-check {
          display: flex;
          gap: .65rem;
          align-items: flex-start;
        }

        .lp-check svg {
          color: var(--primary);
          flex: 0 0 auto;
          margin-top: .16rem;
        }

        .lp-outcomes {
          max-width: 920px;
          margin: 2rem auto 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
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

        .lp-outcome svg {
          color: var(--primary);
          flex: 0 0 auto;
          margin-top: .15rem;
        }

        .lp-pricing-wrap {
          max-width: 860px;
          margin: 0 auto;
        }

        .lp-price-card {
          border: 2px solid var(--primary);
          background:
            radial-gradient(circle at 85% 0%, rgba(59,130,246,.14), transparent 28%),
            linear-gradient(180deg, rgba(59,130,246,.045), rgba(59,130,246,0)),
            var(--bg-card);
          border-radius: 1.2rem;
          padding: 2.2rem;
          box-shadow: 0 25px 55px -28px rgba(59,130,246,.45);
        }

        .lp-price-top {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          align-items: flex-start;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .lp-price-eyebrow {
          color: var(--primary);
          font-weight: 850;
          text-transform: uppercase;
          font-size: .78rem;
          letter-spacing: .08em;
        }

        .lp-price-card h3 {
          margin: .35rem 0 0;
          font-size: 1.6rem;
        }

        .lp-price-card .desc {
          margin: .55rem 0 0;
          color: var(--text-muted);
        }

        .lp-price {
          white-space: nowrap;
          text-align: right;
        }

        .lp-price strong {
          font-size: 3rem;
          letter-spacing: -.045em;
        }

        .lp-price span {
          display: block;
          color: var(--text-muted);
          font-size: .86rem;
        }

        .lp-included-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: .8rem 1.3rem;
          margin: 1.5rem 0 1.8rem;
        }

        .lp-capacity {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: .8rem;
          margin: 1.3rem 0 1.6rem;
        }

        .lp-capacity-card {
          padding: 1rem;
          text-align: center;
          border: 1px solid var(--border-color);
          border-radius: .8rem;
          background: var(--bg-secondary);
        }

        .lp-capacity-card strong {
          display: block;
          font-size: 1.55rem;
        }

        .lp-capacity-card span {
          display: block;
          color: var(--text-muted);
          font-size: .8rem;
          margin-top: .15rem;
        }

        .lp-recharge-title {
          margin-top: 4.2rem;
          text-align: center;
        }

        .lp-recharge-title h3 {
          font-size: 1.55rem;
          margin-bottom: .35rem;
        }

        .lp-recharge-title p {
          margin: 0;
          color: var(--text-muted);
        }

        .lp-recharge-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .lp-recharge-card {
          padding: 1.35rem;
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          background: var(--bg-card);
        }

        .lp-recharge-card.featured {
          border-color: var(--primary);
        }

        .lp-recharge-card:nth-child(1) {
          background: linear-gradient(180deg, var(--lp-blue-soft), var(--bg-card));
        }
        .lp-recharge-card:nth-child(2) {
          background: linear-gradient(180deg, var(--lp-violet-soft), var(--bg-card));
        }
        .lp-recharge-card:nth-child(3) {
          background: linear-gradient(180deg, var(--lp-cyan-soft), var(--bg-card));
        }

        .lp-recharge-card .label {
          color: var(--text-muted);
          font-size: .76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .lp-recharge-card .recharge-price {
          margin: .25rem 0 .85rem;
          font-size: 1.9rem;
          font-weight: 850;
        }

        .lp-recharge-card strong {
          display: block;
          margin-bottom: .25rem;
        }

        .lp-recharge-card p {
          margin: 0;
          color: var(--text-muted);
          font-size: .88rem;
        }

        .lp-note {
          max-width: 820px;
          margin: 1.3rem auto 0;
          text-align: center;
          color: var(--text-muted);
          font-size: .88rem;
        }

        .lp-faq {
          max-width: 880px;
          margin: 0 auto;
        }

        .lp-faq-item {
          padding: 1.35rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .lp-faq-item h3 {
          margin: 0;
          font-size: 1.03rem;
        }

        .lp-faq-item p {
          margin: .55rem 0 0;
          color: var(--text-muted);
        }

        .lp-founder-card {
          max-width: 980px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 2rem;
          align-items: start;
          padding: 2rem;
          border: 1px solid var(--border-color);
          border-radius: 1.2rem;
          background:
            radial-gradient(circle at 0% 0%, rgba(59,130,246,.10), transparent 28%),
            var(--bg-card);
          box-shadow: 0 22px 45px -30px rgba(0,0,0,.35);
        }

        .lp-founder-photo-wrap {
          display: flex;
          justify-content: center;
          padding-top: .2rem;
        }

        .lp-founder-photo {
          width: 132px;
          height: 132px;
          object-fit: cover;
          object-position: center 24%;
          border-radius: 50%;
          border: 4px solid var(--bg-card);
          outline: 1px solid var(--border-color);
          box-shadow: 0 12px 28px rgba(0,0,0,.18);
        }

        .lp-founder-content h2 {
          margin: 0;
          font-size: 1.7rem;
          line-height: 1.15;
          letter-spacing: -.02em;
        }

        .lp-founder-role {
          margin: .3rem 0 1rem !important;
          color: var(--text-muted);
          font-weight: 650;
        }

        .lp-founder-content > p {
          margin: .8rem 0;
          color: var(--text-muted);
        }

        .lp-founder-content > p strong {
          color: var(--text-main);
        }

        .lp-founder-tags {
          display: flex;
          flex-wrap: wrap;
          gap: .55rem;
          margin-top: 1.05rem;
        }

        .lp-founder-tag {
          display: inline-flex;
          align-items: center;
          gap: .42rem;
          padding: .36rem .68rem;
          border-radius: 999px;
          background: rgba(59,130,246,.08);
          color: var(--primary);
          border: 1px solid rgba(59,130,246,.18);
          font-size: .8rem;
          font-weight: 740;
        }

        .lp-founder-quote {
          margin-top: 1.1rem !important;
          color: var(--text-main) !important;
          font-weight: 780;
          font-size: 1rem;
        }

        .lp-final {
          text-align: center;
          padding: 4.2rem 2rem;
          border-radius: 1.3rem;
          border: 1px solid rgba(59,130,246,.20);
          background:
            radial-gradient(circle at 50% 0%, rgba(59,130,246,.24), transparent 48%),
            linear-gradient(160deg, rgba(59,130,246,.08), rgba(99,102,241,.05)),
            var(--bg-card);
        }

        .lp-final h2 {
          margin: .75rem auto 0;
          max-width: 760px;
          font-size: clamp(2rem, 3.2vw, 2.8rem);
          line-height: 1.15;
          letter-spacing: -.035em;
        }

        .lp-final p {
          max-width: 680px;
          margin: 1rem auto 1.7rem;
          color: var(--text-muted);
        }

        .lp-footer {
          padding: 3rem 0;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          color: var(--text-muted);
          text-align: center;
        }

        .lp-footer-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1.2rem;
          margin-top: .9rem;
        }

        .lp-footer button {
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        @media (max-width: 980px) {
          .lp-hero-grid,
          .lp-problem-grid,
          .lp-showcase {
            grid-template-columns: 1fr;
          }

          .lp-hero-grid { gap: 3rem; }
          .lp-showcase.reverse .lp-showcase-copy,
          .lp-showcase.reverse .lp-showcase-visual { order: initial; }
          .lp-feature-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .lp-floating-card { left: 1rem; }
          .lp-trust-items { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 680px) {
          .lp-shell { width: min(100% - 28px, 1180px); }
          .lp-hero { padding: 5rem 0 3.7rem; }
          .lp-section { padding: 4.3rem 0; }
          .lp-feature-grid,
          .lp-compare-grid,
          .lp-included-grid,
          .lp-recharge-grid,
          .lp-capacity,
          .lp-profile-top,
          .lp-method-grid,
          .lp-eval-points,
          .lp-outcomes {
            grid-template-columns: 1fr;
          }
          .lp-actions { flex-direction: column; }
          .lp-actions button { width: 100%; }
          .lp-floating-card {
            position: static;
            width: auto;
            margin-top: .8rem;
          }
          .lp-price-top {
            flex-direction: column;
          }
          .lp-price { text-align: left; }
          .lp-profile-row {
            grid-template-columns: 110px 1fr 34px;
          }

          .lp-founder-card {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 1.5rem;
          }

          .lp-founder-photo {
            width: 116px;
            height: 116px;
          }

          .lp-founder-tags {
            justify-content: center;
          }
        }
      `}</style>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-shell lp-hero-grid">
          <div>
            <div className="lp-eyebrow">
              <Sparkles size={16} /> Préparation stratégique et suivi de progression
            </div>

            <h1 className="lp-hero-title">
              Préparez chaque candidature comme si vous aviez un coach à vos côtés.
            </h1>

            <p className="lp-hero-subtitle">
              BeyondTheCV relie votre profil, l’entreprise, le poste et vos entraînements
              pour vous aider à <span className="lp-hero-strong">comprendre, convaincre,
              vous entraîner et progresser</span> jusqu’à l’entretien.
            </p>

            <div className="lp-actions">
              <button onClick={onStart} className="lp-button-primary">
                Préparer ma prochaine candidature <ArrowRight size={18} />
              </button>
              <button onClick={scrollToPricing} className="lp-button-secondary">
                Voir l’offre à 29,90 €
              </button>
            </div>

            <div className="lp-reassurance">
              <span><CheckCircle2 size={15} /> 5 candidatures chaque mois</span>
              <span><CheckCircle2 size={15} /> 150 entraînements analysés</span>
              <span><ShieldCheck size={15} /> Sans engagement</span>
            </div>
          </div>

          <div className="lp-product-frame">
            <img
              src={darkMode ? '/dashboard-preview-night.png' : '/dashboard-preview.png'}
              alt="Aperçu du tableau de bord BeyondTheCV"
            />
            <div className="lp-floating-card">
              <strong>Votre préparation reste structurée</strong>
              <span>Profil, entreprises, postes, entraînements et débriefs réunis dans un même espace.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-trust-strip">
        <div className="lp-shell lp-trust-items">
          <div>Profil réutilisable</div>
          <div>Analyses contextualisées</div>
          <div>Suivi de progression</div>
          <div>Débrief après entretien</div>
        </div>
      </div>

      {/* PROBLEM / SOLUTION */}
      <section className="lp-section">
        <div className="lp-shell lp-problem-grid">
          <div>
            <div className="lp-section-kicker">Le problème</div>
            <h2>Un bon CV vous ouvre la porte. Il ne répond pas à votre place.</h2>
            <div className="lp-problem-copy">
              <div className="lp-problem-item">
                <strong>Votre parcours est riche, mais difficile à synthétiser.</strong>
                <span>Vous risquez de réciter votre CV au lieu de défendre une proposition de valeur claire.</span>
              </div>
              <div className="lp-problem-item">
                <strong>Chaque poste change les attentes.</strong>
                <span>Un argument pertinent chez Thales ne sera pas forcément le bon chez Naval Group ou MBDA.</span>
              </div>
              <div className="lp-problem-item">
                <strong>Vous savez rarement quoi travailler en priorité.</strong>
                <span>Sans suivi, vous répétez parfois les mêmes erreurs d’un entretien à l’autre.</span>
              </div>
            </div>
          </div>

          <div className="lp-solution-panel">
            <div className="lp-solution-title">
              <Target size={21} color="var(--primary)" />
              BeyondTheCV transforme la recherche d’emploi en préparation structurée
            </div>

            <div className="lp-step">
              <div className="lp-step-number">1</div>
              <div>
                <strong>Votre profil est construit une fois</strong>
                <span>CV, expériences, compétences, réalisations, préférences, salaire et pitch général.</span>
              </div>
            </div>

            <div className="lp-step">
              <div className="lp-step-number">2</div>
              <div>
                <strong>Chaque candidature reçoit son contexte</strong>
                <span>Entreprise, offre, enjeux, adéquation, objections, questions et plan de préparation.</span>
              </div>
            </div>

            <div className="lp-step">
              <div className="lp-step-number">3</div>
              <div>
                <strong>Vos entraînements font évoluer votre profil</strong>
                <span>L’application détecte les points solides, les axes à renforcer et les trois priorités du moment.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Une méthode complète</div>
            <h2>De l’annonce au débrief, tout reste relié</h2>
            <p>
              BeyondTheCV n’empile pas des outils. Chaque module utilise le même profil
              et le même contexte de candidature pour maintenir une préparation cohérente.
            </p>
          </div>

          <div className="lp-feature-grid">
            {features.map((feature) => (
              <div className="lp-feature-card" key={feature.title}>
                <div className="lp-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* METHOD */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Une méthode, pas un catalogue</div>
            <h2>Votre préparation s’organise autour de cinq étapes simples.</h2>
            <p>
              Vous avancez étape par étape, en sachant toujours ce que vous devez comprendre,
              préparer, entraîner et améliorer.
            </p>
          </div>

          <div className="lp-method-grid">
            <div className="lp-method-card accent-1">
              <div>
                <h3>Comprendre le poste</h3>
                <ul>
                  <li>Décoder l’annonce</li>
                  <li>Analyser ses écarts</li>
                  <li>Se voir comme un recruteur</li>
                </ul>
              </div>
            </div>

            <div className="lp-method-card accent-2">
              <div>
                <h3>Comprendre l’entreprise</h3>
                <ul>
                  <li>Comprendre l’entreprise</li>
                  <li>Comprendre le marché</li>
                  <li>Enjeux &amp; culture</li>
                </ul>
              </div>
            </div>

            <div className="lp-method-card accent-3">
              <div>
                <h3>Construire le discours</h3>
                <ul>
                  <li>Préparer son pitch</li>
                  <li>Arguments clés</li>
                  <li>Répondre à ses points faibles</li>
                </ul>
              </div>
            </div>

            <div className="lp-method-card accent-4">
              <div>
                <h3>S’entraîner</h3>
                <ul>
                  <li>Questions probables</li>
                  <li>Mises en situation</li>
                  <li>Entraînement oral</li>
                </ul>
              </div>
            </div>

            <div className="lp-method-card accent-5">
              <div>
                <h3>Progresser</h3>
                <ul>
                  <li>Profil stratégique</li>
                  <li>Débrief &amp; suivi</li>
                  <li>Recommandations</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="lp-method-footer">
            BTCV n’aide pas seulement à écrire. Il organise la préparation et fait travailler le candidat.
          </div>
        </div>
      </section>


      {/* TRAINING PROGRESS SHOWCASE */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Mesurez vos progrès</div>
            <h2>Suivez votre évolution, pas seulement vos réponses.</h2>
            <p>
              BeyondTheCV consolide vos entraînements, suit votre progression et
              met en évidence les thématiques à renforcer avant le prochain entretien.
            </p>
          </div>

          <div className="lp-eval-showcase">
            <div className="lp-eval-frame">
              <img
                src={darkMode ? '/evaluation-preview-night.png' : '/evaluation-preview.png'}
                alt="Suivi des entraînements et de la progression dans BeyondTheCV"
              />
            </div>

            <div className="lp-eval-points">
              <div className="lp-eval-point">
                <BarChart3 size={19} />
                <div>
                  <strong>Progression globale</strong>
                  <span>Visualisez l’évolution de vos performances au fil des entraînements.</span>
                </div>
              </div>

              <div className="lp-eval-point">
                <Target size={19} />
                <div>
                  <strong>Détail par thématique</strong>
                  <span>Repérez rapidement les domaines solides et ceux qui demandent encore du travail.</span>
                </div>
              </div>

              <div className="lp-eval-point">
                <Sparkles size={19} />
                <div>
                  <strong>Conseils personnalisés</strong>
                  <span>Le coach vous oriente vers les prochains exercices les plus utiles à votre préparation.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRATEGIC PROFILE */}
      <section className="lp-section">
        <div className="lp-shell lp-showcase">
          <div className="lp-showcase-copy">
            <div className="lp-section-kicker">Le coach qui apprend avec vous</div>
            <h2>Votre profil stratégique évolue à mesure que vous vous entraînez.</h2>
            <p>
              Comme un coach suit vos entraînements, BeyondTheCV observe les éléments
              réellement travaillés et fait évoluer ses recommandations.
            </p>

            <div className="lp-bullet-list">
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>Identifie vos forces à exploiter.</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>Repère les domaines qui restent fragiles ou peu documentés.</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>Fait ressortir trois priorités concrètes plutôt qu’une liste interminable.</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>Vous renvoie directement vers l’exercice le plus utile à ce moment-là.</span>
              </div>
            </div>
          </div>

          <div className="lp-showcase-visual" aria-label="Aperçu du profil stratégique évolutif">
            <div className="lp-profile-top">
              <div className="lp-profile-stat">
                <span>Niveau actuel</span>
                <strong>En progression</strong>
              </div>
              <div className="lp-profile-stat">
                <span>Lecture</span>
                <strong>Continue</strong>
              </div>
              <div className="lp-profile-stat">
                <span>Mise à jour</span>
                <strong>Dynamique</strong>
              </div>
            </div>

            <div className="lp-profile-bars">
              <div className="lp-profile-row">
                <span>Clarté du discours</span>
                <div className="lp-progress"><span style={{ width: '82%' }} /></div>
                <strong>82</strong>
              </div>
              <div className="lp-profile-row">
                <span>Impact et preuves</span>
                <div className="lp-progress"><span style={{ width: '66%' }} /></div>
                <strong>66</strong>
              </div>
              <div className="lp-profile-row">
                <span>Adéquation au poste</span>
                <div className="lp-progress"><span style={{ width: '81%' }} /></div>
                <strong>81</strong>
              </div>
              <div className="lp-profile-row">
                <span>Gestion objections</span>
                <div className="lp-progress"><span style={{ width: '82%' }} /></div>
                <strong>82</strong>
              </div>
              <div className="lp-profile-row">
                <span>Posture / leadership</span>
                <div className="lp-progress"><span style={{ width: '53%' }} /></div>
                <strong>53</strong>
              </div>
            </div>

            <div className="lp-priority-card">
              <small>Priorité actuelle</small>
              <strong>Renforcer votre posture sur les situations managériales</strong>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI APPLICATION MODEL */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Plusieurs candidatures, sans repartir de zéro</div>
            <h2>Votre profil reste. Chaque candidature garde sa propre préparation.</h2>
            <p>
              Vous pouvez viser plusieurs entreprises et plusieurs postes sans écraser
              les analyses précédentes. Votre profil candidat est réutilisé, tandis que
              chaque candidature conserve son contexte, ses entraînements, ses entretiens
              et ses débriefs.
            </p>
          </div>

          <div className="lp-outcomes">
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>Un profil candidat commun à toute votre recherche.</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>Une analyse dédiée à chaque entreprise ciblée.</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>Une préparation spécifique pour chaque offre.</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>Un historique conservé pour suivre chaque candidature dans le temps.</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI GENERALIST */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Plus qu’un chatbot</div>
            <h2>Pourquoi ne pas simplement utiliser ChatGPT ou Claude ?</h2>
            <p>
              Une IA généraliste peut répondre à une question. BeyondTheCV organise
              une préparation complète, persistante et centrée sur chaque candidature.
            </p>
          </div>

          <div className="lp-compare-grid">
            <div className="lp-compare-card">
              <h3>IA généraliste</h3>
              <div className="lp-checklist">
                <div className="lp-check"><CheckCircle2 size={18} /><span>Répond à un prompt ponctuel.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Vous laisse organiser seul les informations et l’historique.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Ne structure pas naturellement plusieurs candidatures.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Ne transforme pas automatiquement vos résultats en plan de progression.</span></div>
              </div>
            </div>

            <div className="lp-compare-card highlight">
              <h3>BeyondTheCV</h3>
              <div className="lp-checklist">
                <div className="lp-check"><CheckCircle2 size={18} /><span>Relie profil, entreprise, offre et entraînements.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Centralise vos candidatures et leur historique.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Évalue vos réponses dans le contexte du poste ciblé.</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>Met à jour votre profil stratégique et vos priorités.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-founder-card">
            <div className="lp-founder-photo-wrap">
              <img
                src="/denis-gaultier.png"
                alt="Denis Gaultier, fondateur de BeyondTheCV"
                className="lp-founder-photo"
              />
            </div>

            <div className="lp-founder-content">
              <div className="lp-section-kicker">Pourquoi BeyondTheCV a été créé</div>
              <h2>Denis Gaultier</h2>
              <p className="lp-founder-role">
                Fondateur de BeyondTheCV — TacticEdge
              </p>

              <p>
                Plus de vingt ans d’expérience dans des environnements exigeants, avec des responsabilités
                de management, d’évaluation et de recrutement de profils à haut niveau de responsabilité,
                notamment au sein d’organisations opérationnelles et de sécurité nationale.
              </p>

              <p>
                BeyondTheCV est né d’un constat simple : on peut avoir un excellent parcours et pourtant
                mal défendre sa valeur en entretien. La plateforme a donc été conçue pour transformer
                l’expérience du candidat en une préparation structurée, progressive et directement actionnable.
              </p>

              <div className="lp-founder-tags">
                <span className="lp-founder-tag"><CheckCircle2 size={15} />Management</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />Évaluation et recrutement</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />Cyber et environnements complexes</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />Préparation à forte exigence</span>
              </div>

              <p className="lp-founder-quote">
                Un bon parcours ne suffit pas. Il faut savoir le défendre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section ref={pricingRef} className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Une offre simple</div>
            <h2>5 nouvelles candidatures chaque mois. Toutes les fonctionnalités.</h2>
            <p>
              Pas de pack amputé, pas de choix entre plusieurs niveaux de préparation.
              Votre abonnement vous donne accès à l’ensemble de BeyondTheCV.
            </p>
          </div>

          <div className="lp-pricing-wrap">
            <div className="lp-price-card">
              <div className="lp-price-top">
                <div>
                  <div className="lp-price-eyebrow">Abonnement BeyondTheCV</div>
                  <h3>Préparation complète</h3>
                  <p className="desc">
                    Pour piloter plusieurs candidatures et progresser pendant toute votre recherche.
                  </p>
                </div>

                <div className="lp-price">
                  <strong>29,90 €</strong>
                  <span>par mois · sans engagement</span>
                </div>
              </div>

              <div className="lp-capacity">
                <div className="lp-capacity-card">
                  <strong>5</strong>
                  <span>nouvelles candidatures / mois</span>
                </div>
                <div className="lp-capacity-card">
                  <strong>150</strong>
                  <span>entraînements analysés / mois</span>
                </div>
                <div className="lp-capacity-card">
                  <strong>200</strong>
                  <span>plafond d’entraînements disponibles</span>
                </div>
              </div>

              <div className="lp-included-grid">
                {[
                  'Profil candidat réutilisable',
                  'Analyse entreprise et marché',
                  'Décodage de chaque offre',
                  'Gap analysis et objections',
                  'Pitchs adaptés',
                  'Questions probables',
                  'Mises en situation',
                  'Entraînement oral',
                  'Négociation salariale',
                  'Débrief post-entretien',
                  'Profil stratégique évolutif',
                  'Recommandations personnalisées',
                ].map((item) => (
                  <div className="lp-check" key={item}>
                    <CheckCircle2 size={18} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button onClick={onLoginRedirect} className="lp-button-primary">
                Commencer ma préparation <ArrowRight size={18} />
              </button>
            </div>

            <p className="lp-note">
              Une candidature correspond à un poste dans une entreprise donnée.
              Si plusieurs postes visent la même entreprise, l’analyse entreprise peut être réutilisée.
              Les entraînements non utilisés peuvent être conservés dans la limite de 200 disponibles.
            </p>

            <div className="lp-recharge-title">
              <h3>Votre recherche s’intensifie ?</h3>
              <p>Ajoutez des candidatures immédiatement, sans changer d’abonnement.</p>
            </div>

            <div className="lp-recharge-grid">
              <div className="lp-recharge-card">
                <div className="label">Recharge ponctuelle</div>
                <div className="recharge-price">9 €</div>
                <strong>+1 candidature</strong>
                <p>+30 entraînements analysés associés.</p>
              </div>

              <div className="lp-recharge-card featured">
                <div className="label">La plus polyvalente</div>
                <div className="recharge-price">19 €</div>
                <strong>+3 candidatures</strong>
                <p>+90 entraînements analysés associés.</p>
              </div>

              <div className="lp-recharge-card">
                <div className="label">Recherche intensive</div>
                <div className="recharge-price">29 €</div>
                <strong>+5 candidatures</strong>
                <p>+150 entraînements analysés associés.</p>
              </div>
            </div>

            <p className="lp-note">
              Les recharges augmentent immédiatement votre capacité de préparation.
              Elles ne débloquent aucune fonctionnalité supplémentaire : tout est déjà inclus dans l’abonnement.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">Questions fréquentes</div>
            <h2>Ce que vous devez savoir avant de commencer</h2>
          </div>

          <div className="lp-faq">
            <div className="lp-faq-item">
              <h3>Qu’est-ce qu’une candidature ?</h3>
              <p>
                Une candidature correspond à l’association d’une entreprise et d’un poste ciblé.
                Vous disposez de 5 nouvelles candidatures chaque mois.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>Puis-je préparer plusieurs postes dans la même entreprise ?</h3>
              <p>
                Oui. Chaque poste constitue une candidature distincte, mais l’analyse de l’entreprise
                déjà réalisée peut être réutilisée au lieu d’être reconstruite inutilement.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>Qu’est-ce qu’un entraînement analysé ?</h3>
              <p>
                Il s’agit d’une réponse, d’un pitch, d’une mise en situation ou d’une simulation courte
                que BeyondTheCV analyse pour vous fournir un retour et vous faire progresser.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>Que deviennent les entraînements non utilisés ?</h3>
              <p>
                Ils peuvent être conservés d’un mois sur l’autre dans la limite de 200 entraînements
                disponibles. Au-delà de ce plafond, les nouveaux entraînements mensuels ne s’ajoutent plus.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>À quoi sert le profil stratégique évolutif ?</h3>
              <p>
                Il synthétise les éléments observés pendant votre préparation, fait ressortir vos forces,
                vos axes de progrès et vos trois priorités du moment. Il évolue avec vos nouveaux exercices
                et vos entretiens.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>Le profil stratégique est-il une évaluation psychologique ?</h3>
              <p>
                Non. Il repose sur les informations que vous avez fournies et sur les performances observées
                dans l’application. Les scores sont des indicateurs de préparation, pas une prédiction du
                comportement d’un recruteur ni un diagnostic psychologique.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>L’abonnement est-il avec engagement ?</h3>
              <p>Non. Il est mensuel et peut être résilié à tout moment.</p>
            </div>

            <div className="lp-faq-item">
              <h3>Pourquoi payer alors que ChatGPT ou Claude existent ?</h3>
              <p>
                BeyondTheCV ne se limite pas à générer du texte. Il relie durablement votre profil,
                vos candidatures, vos entraînements, vos progrès et vos débriefs dans une méthode spécialisée.
              </p>
            </div>

            <div className="lp-faq-item">
              <h3>BeyondTheCV garantit-il une embauche ?</h3>
              <p>
                Non. Aucun outil sérieux ne peut garantir une décision de recrutement.
                BeyondTheCV vous aide à arriver mieux préparé et à progresser d’un entretien à l’autre.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-final">
            <Gauge size={34} color="var(--primary)" />
            <h2>Votre prochaine candidature mérite mieux qu’une préparation improvisée.</h2>
            <p>
              Centralisez vos candidatures, entraînez vos réponses et laissez votre profil
              stratégique vous indiquer ce qu’il faut travailler ensuite.
            </p>
            <button onClick={onLoginRedirect} className="lp-button-primary">
              Commencer pour 29,90 € / mois <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-shell">
          <p>© 2026 BeyondTheCV. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
