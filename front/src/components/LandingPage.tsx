import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ResponsiveImage } from './ResponsiveImage';

// Also emit these values in index.html or the prerendered HTML for crawlers
// that do not execute JavaScript. HTTP security headers belong to the server.
export const LANDING_SEO = {
  title: 'BeyondTheCV | Préparez vos entretiens avec l’IA',
  description: 'Préparez vos entretiens d’embauche avec BeyondTheCV : analyse du poste, pitch personnalisé et simulations pour vous entraîner avec l’IA.',
};

function getLandingSeo(t: (key: string) => string) {
  return {
    title: t('landing.seo.title'),
    description: t('landing.seo.description'),
  };
}

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
  const { t, i18n } = useTranslation();
  const pricingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const cleanups: Array<() => void> = [];
    const seo = getLandingSeo(t);
    document.title = seo.title;

    // Restore the previous head when leaving the landing page (SPA navigation).
    const setHead = (selector: string, tag: string, attributes: Record<string, string>) => {
      const existing = document.head.querySelector<HTMLElement>(selector);
      const element = existing ?? document.createElement(tag);
      const previous = Object.keys(attributes).map(key => [key, element.getAttribute(key)] as const);
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
      if (!existing) document.head.appendChild(element);
      cleanups.push(() => {
        if (!existing) { element.remove(); return; }
        previous.forEach(([key, value]) => {
          if (value === null) element.removeAttribute(key);
          else element.setAttribute(key, value);
        });
      });
    };
    const meta = (key: string, value: string, attribute = 'name') => {
      setHead(`meta[${attribute}="${key}"]`, 'meta', { [attribute]: key, content: value });
    };
    const pageUrl = new URL(window.location.pathname, window.location.origin).href;
    const imageUrl = new URL('/dashboard-preview.png', window.location.origin).href;
    meta('description', seo.description);
    meta('og:type', 'website', 'property');
    meta('og:site_name', 'BeyondTheCV', 'property');
    meta('og:locale', i18n.language === 'en' ? 'en_US' : i18n.language === 'de' ? 'de_DE' : i18n.language === 'es' ? 'es_ES' : i18n.language === 'it' ? 'it_IT' : 'fr_FR', 'property');
    meta('og:title', seo.title, 'property');
    meta('og:description', seo.description, 'property');
    meta('og:url', pageUrl, 'property');
    meta('og:image', imageUrl, 'property');
    meta('og:image:alt', t('landing.seo.og_image_alt'), 'property');
    meta('twitter:card', 'summary_large_image');
    meta('twitter:title', seo.title);
    meta('twitter:description', seo.description);
    meta('twitter:image', imageUrl);

    // Never force indexation or invent the production domain on preview hosts.
    // Mirror staging noindex in HTTP headers: this client-side rule is a fallback.
    if (window.location.hostname === 'staging.beyondthecv.app') {
      meta('robots', 'noindex, nofollow');
    }
    if (['beyondthecv.app', 'www.beyondthecv.app'].includes(window.location.hostname)
        && !document.head.querySelector('link[rel="canonical"]')) {
      setHead('link[rel="canonical"]', 'link', { rel: 'canonical', href: pageUrl });
    }
    return () => {
      document.title = previousTitle;
      cleanups.reverse().forEach(cleanup => cleanup());
    };
  }, [t, i18n.language]);

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const faq = Array.from({ length: 10 }, (_, i) => ({
    q: t(`landing.faq.items.${i}.q`),
    a: t(`landing.faq.items.${i}.a`),
  }));

  const featureIcons = [
    <FileSearch size={23} />,
    <Building2 size={23} />,
    <MessageSquareText size={23} />,
    <Mic size={23} />,
    <TrendingUp size={23} />,
    <RefreshCw size={23} />,
  ];
  const features = featureIcons.map((icon, i) => ({
    icon,
    title: t(`landing.features.list.${i}.title`),
    text: t(`landing.features.list.${i}.text`),
  }));

  const resourceClusters = [
    {
      title: t('landing.resources.cluster_prepare', 'Préparer son entretien'),
      icon: <Target size={20} />,
      links: [
        t('landing.resources.prepare_full', 'Préparer un entretien de A à Z'),
        t('landing.resources.prepare_offer', "Analyser une offre d'emploi"),
        t('landing.resources.prepare_company', "Comprendre l'entreprise en 15 minutes"),
        t('landing.resources.prepare_swot', 'Identifier ses forces et faiblesses'),
        t('landing.resources.prepare_lastmin', 'Préparation de dernière heure'),
      ],
    },
    {
      title: t('landing.resources.cluster_recruiter', 'Comprendre le recruteur'),
      icon: <Building2 size={20} />,
      links: [
        t('landing.resources.recruiter_wants', 'Ce que le recruteur cherche vraiment'),
        t('landing.resources.recruiter_redflags', "Les signaux d'alerte à éviter"),
        t('landing.resources.recruiter_ats', 'Passer le filtre ATS'),
        t('landing.resources.recruiter_feedback', "Décrypter un retour d'entretien"),
      ],
    },
    {
      title: t('landing.resources.cluster_pitch', 'Construire son pitch'),
      icon: <MessageSquareText size={20} />,
      links: [
        t('landing.resources.pitch_pillar', "L'art du pitch d'entretien"),
        t('landing.resources.pitch_30s', 'Le pitch 30 secondes'),
        t('landing.resources.pitch_executive', 'Pitch cadre et dirigeant'),
        t('landing.resources.pitch_tellme', 'Répondre à « Parlez-moi de vous »'),
        t('landing.resources.pitch_mistakes', 'Erreurs fréquentes de pitch'),
      ],
    },
    {
      title: t('landing.resources.cluster_questions', 'Répondre aux questions'),
      icon: <Mic size={20} />,
      links: [
        t('landing.resources.questions_pillar', "Les questions d'entretien les plus courantes"),
        t('landing.resources.questions_trick', 'Questions pièges et comment les gérer'),
        t('landing.resources.questions_manager', 'Questions pour managers et cadres'),
        t('landing.resources.questions_ask', 'Questions à poser au recruteur'),
        t('landing.resources.questions_difficult', 'Répondre aux questions difficiles'),
      ],
    },
    {
      title: t('landing.resources.cluster_salary', 'Négocier son salaire'),
      icon: <TrendingUp size={20} />,
      links: [
        t('landing.resources.salary_benchmark', 'Se situer sur le marché'),
        t('landing.resources.salary_negotiate', 'Négocier une augmentation'),
        t('landing.resources.salary_package', 'Tout le package : variable, avantages, télétravail'),
        t('landing.resources.salary_counteroffer', 'Gérer une contre-proposition'),
      ],
    },
    {
      title: t('landing.resources.cluster_leadership', 'Manager / Cadre / Dirigeant'),
      icon: <ShieldCheck size={20} />,
      links: [
        t('landing.resources.leadership_role', 'Vendre une expérience de management'),
        t('landing.resources.leadership_vision', 'Présenter sa vision'),
        t('landing.resources.leadership_transfo', 'Parler transformation et changement'),
        t('landing.resources.leadership_comex', 'Convaincre un COMEX / CODIR'),
        t('landing.resources.leadership_failure', 'Raconter un projet qui a échoué'),
      ],
    },
  ];

  return (
    <div className="lp-container" lang={i18n.language ?? 'fr'}>
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
          height: auto;
          display: block;
          border-radius: .95rem;
          border: 1px solid var(--border-color);
          aspect-ratio: 1868 / 938;
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

        .lp-resources-section {
          background:
            radial-gradient(circle at 10% 90%, rgba(59,130,246,.08), transparent 28%),
            radial-gradient(circle at 90% 10%, rgba(99,102,241,.08), transparent 26%),
            var(--bg-body);
        }

        .lp-resources-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.3rem;
        }

        .lp-resource-cluster {
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 1.45rem;
          transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .lp-resource-cluster:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 18px 40px -28px rgba(59,130,246,.35);
        }

        .lp-resource-cluster-header {
          display: flex;
          align-items: center;
          gap: .7rem;
          margin-bottom: 1.1rem;
        }

        .lp-resource-cluster-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: .7rem;
          background: rgba(59,130,246,.10);
          color: var(--primary);
        }

        .lp-resource-cluster h3 {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.25;
        }

        .lp-resource-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: .35rem;
        }

        .lp-resource-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: .7rem;
          padding: .55rem .65rem;
          border-radius: .55rem;
          color: var(--text-main);
          text-decoration: none;
          font-size: .9rem;
          transition: background .15s ease, color .15s ease;
        }

        .lp-resource-link:hover {
          background: rgba(59,130,246,.08);
          color: var(--primary);
        }

        .lp-resource-soon {
          flex: 0 0 auto;
          font-size: .68rem;
          font-weight: 780;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: .2rem .45rem;
          border-radius: 999px;
          background: rgba(245,158,11,.12);
          color: #d97706;
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
          .lp-resources-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .lp-floating-card { left: 1rem; }
          .lp-trust-items { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        @media (max-width: 680px) {
          .lp-shell { width: min(100% - 28px, 1180px); }
          .lp-hero { padding: 5rem 0 3.7rem; }
          .lp-section { padding: 4.3rem 0; }
          .lp-feature-grid,
          .lp-resources-grid,
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
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-shell lp-hero-grid">
          <div>
            <div className="lp-eyebrow">
              <Sparkles size={16} /> {t('landing.hero.eyebrow')}
            </div>

            <h1 id="lp-title" className="lp-hero-title">
              {t('landing.hero.title')}
            </h1>

            <p className="lp-hero-subtitle">
              {t('landing.hero.subtitle')}
            </p>

            <div className="lp-actions">
              <button onClick={onStart} className="lp-button-primary">
                {t('landing.hero.cta_primary')} <ArrowRight size={18} />
              </button>
              <button onClick={scrollToPricing} className="lp-button-secondary">
                {t('landing.hero.cta_secondary')}
              </button>
            </div>

            <div className="lp-reassurance">
              <span><CheckCircle2 size={15} /> {t('landing.hero.reassurance_1')}</span>
              <span><CheckCircle2 size={15} /> {t('landing.hero.reassurance_2')}</span>
              <span><ShieldCheck size={15} /> {t('landing.hero.reassurance_3')}</span>
            </div>
          </div>

          <div className="lp-product-frame">
            <ResponsiveImage
              src={darkMode ? '/dashboard-preview-night.png' : '/dashboard-preview.png'}
              alt={t('landing.hero.frame_alt')}
              widths={[800, 1200]}
              sizes="(max-width: 980px) 100vw, 55vw"
              width={1200}
              height={603}
              loading="eager"
            />
            <div className="lp-floating-card">
              <strong>{t('landing.hero.floating_title')}</strong>
              <span>{t('landing.hero.floating_text')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-trust-strip">
        <div className="lp-shell lp-trust-items">
          <div>{t('landing.trust.item_1')}</div>
          <div>{t('landing.trust.item_2')}</div>
          <div>{t('landing.trust.item_3')}</div>
          <div>{t('landing.trust.item_4')}</div>
        </div>
      </div>

      {/* PROBLEM / SOLUTION */}
      <section className="lp-section">
        <div className="lp-shell lp-problem-grid">
          <div>
            <div className="lp-section-kicker">{t('landing.problem.kicker')}</div>
            <h2>{t('landing.problem.title')}</h2>
            <div className="lp-problem-copy">
              <div className="lp-problem-item">
                <strong>{t('landing.problem.item1_title')}</strong>
                <span>{t('landing.problem.item1_text')}</span>
              </div>
              <div className="lp-problem-item">
                <strong>{t('landing.problem.item2_title')}</strong>
                <span>{t('landing.problem.item2_text')}</span>
              </div>
              <div className="lp-problem-item">
                <strong>{t('landing.problem.item3_title')}</strong>
                <span>{t('landing.problem.item3_text')}</span>
              </div>
            </div>
          </div>

          <div className="lp-solution-panel">
            <div className="lp-solution-title">
              <Target size={21} color="var(--primary)" />
              {t('landing.solution.title')}
            </div>

            <div className="lp-step">
              <div className="lp-step-number">1</div>
              <div>
                <strong>{t('landing.solution.step1_title')}</strong>
                <span>{t('landing.solution.step1_text')}</span>
              </div>
            </div>

            <div className="lp-step">
              <div className="lp-step-number">2</div>
              <div>
                <strong>{t('landing.solution.step2_title')}</strong>
                <span>{t('landing.solution.step2_text')}</span>
              </div>
            </div>

            <div className="lp-step">
              <div className="lp-step-number">3</div>
              <div>
                <strong>{t('landing.solution.step3_title')}</strong>
                <span>{t('landing.solution.step3_text')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.features.kicker')}</div>
            <h2>{t('landing.features.title')}</h2>
            <p>
              {t('landing.features.intro')}
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
            <div className="lp-section-kicker">{t('landing.method.kicker')}</div>
            <h2>{t('landing.method.title')}</h2>
            <p>
              {t('landing.method.intro')}
            </p>
          </div>

          <div className="lp-method-grid">
            {[0, 1, 2, 3, 4].map((i) => (
              <div className={`lp-method-card accent-${i + 1}`} key={i}>
                <div>
                  <h3>{t(`landing.method.cards.${i}.title`)}</h3>
                  <ul>
                    {[0, 1, 2].map((j) => (
                      <li key={j}>{t(`landing.method.cards.${i}.items.${j}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="lp-method-footer">
            {t('landing.method.footer')}
          </div>
        </div>
      </section>


      {/* TRAINING PROGRESS SHOWCASE */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.progress.kicker')}</div>
            <h2>{t('landing.progress.title')}</h2>
            <p>
              {t('landing.progress.intro')}
            </p>
          </div>

          <div className="lp-eval-showcase">
            <div className="lp-eval-frame">
              <ResponsiveImage
                src={darkMode ? '/evaluation-preview-night.png' : '/evaluation-preview.png'}
                alt={t('landing.progress.image_alt')}
                widths={[600, 885]}
                sizes="(max-width: 980px) 100vw, 55vw"
                width={885}
                height={702}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="lp-eval-points">
              <div className="lp-eval-point">
                <BarChart3 size={19} />
                <div>
                  <strong>{t('landing.progress.point1_title')}</strong>
                  <span>{t('landing.progress.point1_text')}</span>
                </div>
              </div>

              <div className="lp-eval-point">
                <Target size={19} />
                <div>
                  <strong>{t('landing.progress.point2_title')}</strong>
                  <span>{t('landing.progress.point2_text')}</span>
                </div>
              </div>

              <div className="lp-eval-point">
                <Sparkles size={19} />
                <div>
                  <strong>{t('landing.progress.point3_title')}</strong>
                  <span>{t('landing.progress.point3_text')}</span>
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
            <div className="lp-section-kicker">{t('landing.profile.kicker')}</div>
            <h2>{t('landing.profile.title')}</h2>
            <p>
              {t('landing.profile.intro')}
            </p>

            <div className="lp-bullet-list">
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>{t('landing.profile.bullet1')}</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>{t('landing.profile.bullet2')}</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>{t('landing.profile.bullet3')}</span>
              </div>
              <div className="lp-bullet">
                <CheckCircle2 size={18} />
                <span>{t('landing.profile.bullet4')}</span>
              </div>
            </div>
          </div>

          <div className="lp-showcase-visual" aria-label={t('landing.profile.visual_aria')}>
            <div className="lp-profile-top">
              <div className="lp-profile-stat">
                <span>{t('landing.profile.stat1_label')}</span>
                <strong>{t('landing.profile.stat1_value')}</strong>
              </div>
              <div className="lp-profile-stat">
                <span>{t('landing.profile.stat2_label')}</span>
                <strong>{t('landing.profile.stat2_value')}</strong>
              </div>
              <div className="lp-profile-stat">
                <span>{t('landing.profile.stat3_label')}</span>
                <strong>{t('landing.profile.stat3_value')}</strong>
              </div>
            </div>

            <div className="lp-profile-bars">
              <div className="lp-profile-row">
                <span>{t('landing.profile.bar1_label')}</span>
                <div className="lp-progress"><span style={{ width: '82%' }} /></div>
                <strong>82</strong>
              </div>
              <div className="lp-profile-row">
                <span>{t('landing.profile.bar2_label')}</span>
                <div className="lp-progress"><span style={{ width: '66%' }} /></div>
                <strong>66</strong>
              </div>
              <div className="lp-profile-row">
                <span>{t('landing.profile.bar3_label')}</span>
                <div className="lp-progress"><span style={{ width: '81%' }} /></div>
                <strong>81</strong>
              </div>
              <div className="lp-profile-row">
                <span>{t('landing.profile.bar4_label')}</span>
                <div className="lp-progress"><span style={{ width: '82%' }} /></div>
                <strong>82</strong>
              </div>
              <div className="lp-profile-row">
                <span>{t('landing.profile.bar5_label')}</span>
                <div className="lp-progress"><span style={{ width: '53%' }} /></div>
                <strong>53</strong>
              </div>
            </div>

            <div className="lp-priority-card">
              <small>{t('landing.profile.priority_label')}</small>
              <strong>{t('landing.profile.priority_value')}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI APPLICATION MODEL */}
      <section className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.multi.kicker')}</div>
            <h2>{t('landing.multi.title')}</h2>
            <p>
              {t('landing.multi.intro')}
            </p>
          </div>

          <div className="lp-outcomes">
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>{t('landing.multi.outcome1')}</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>{t('landing.multi.outcome2')}</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>{t('landing.multi.outcome3')}</span>
            </div>
            <div className="lp-outcome">
              <CheckCircle2 size={20} />
              <span>{t('landing.multi.outcome4')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI GENERALIST */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.ai_compare.kicker')}</div>
            <h2>{t('landing.ai_compare.title')}</h2>
            <p>
              {t('landing.ai_compare.intro')}
            </p>
          </div>

          <div className="lp-compare-grid">
            <div className="lp-compare-card">
              <h3>{t('landing.ai_compare.general_title')}</h3>
              <div className="lp-checklist">
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.general_item1')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.general_item2')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.general_item3')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.general_item4')}</span></div>
              </div>
            </div>

            <div className="lp-compare-card highlight">
              <h3>{t('landing.ai_compare.btcv_title')}</h3>
              <div className="lp-checklist">
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.btcv_item1')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.btcv_item2')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.btcv_item3')}</span></div>
                <div className="lp-check"><CheckCircle2 size={18} /><span>{t('landing.ai_compare.btcv_item4')}</span></div>
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
              <ResponsiveImage
                src="/denis-gaultier.png"
                alt={t('landing.founder.image_alt')}
                className="lp-founder-photo"
                widths={[132, 186]}
                sizes="132px"
                width={186}
                height={234}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="lp-founder-content">
              <div className="lp-section-kicker">{t('landing.founder.kicker')}</div>
              <h2>{t('landing.founder.name')}</h2>
              <p className="lp-founder-role">
                {t('landing.founder.role')}
              </p>

              <p>
                {t('landing.founder.para1')}
              </p>

              <p>
                {t('landing.founder.para2')}
              </p>

              <div className="lp-founder-tags">
                <span className="lp-founder-tag"><CheckCircle2 size={15} />{t('landing.founder.tag1')}</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />{t('landing.founder.tag2')}</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />{t('landing.founder.tag3')}</span>
                <span className="lp-founder-tag"><CheckCircle2 size={15} />{t('landing.founder.tag4')}</span>
              </div>

              <p className="lp-founder-quote">
                {t('landing.founder.quote')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="tarifs" ref={pricingRef} className="lp-section soft">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.pricing.kicker')}</div>
            <h2>{t('landing.pricing.title')}</h2>
            <p>
              {t('landing.pricing.intro')}
            </p>
          </div>

          <div className="lp-pricing-wrap">
            <div className="lp-price-card">
              <div className="lp-price-top">
                <div>
                  <div className="lp-price-eyebrow">{t('landing.pricing.eyebrow')}</div>
                  <h3>{t('landing.pricing.plan_title')}</h3>
                  <p className="desc">
                    {t('landing.pricing.plan_desc')}
                  </p>
                </div>

                <div className="lp-price">
                  <strong>{t('landing.pricing.price')}</strong>
                  <span>{t('landing.pricing.price_period')}</span>
                </div>
              </div>

              <div className="lp-capacity">
                <div className="lp-capacity-card">
                  <strong>5</strong>
                  <span>{t('landing.capacity_label_1')}</span>
                </div>
                <div className="lp-capacity-card">
                  <strong>150</strong>
                  <span>{t('landing.capacity_label_2')}</span>
                </div>
                <div className="lp-capacity-card">
                  <strong>200</strong>
                  <span>{t('landing.capacity_label_3')}</span>
                </div>
              </div>

              <div className="lp-included-grid">
                {Array.from({ length: 12 }, (_, i) => (
                  <div className="lp-check" key={i}>
                    <CheckCircle2 size={18} />
                    <span>{t(`landing.pricing.included.${i}`)}</span>
                  </div>
                ))}
              </div>

              <button onClick={onLoginRedirect} className="lp-button-primary">
                {t('landing.pricing.cta')} <ArrowRight size={18} />
              </button>
            </div>

            <p className="lp-note">
              {t('landing.pricing.note1')}
            </p>

            <div className="lp-recharge-title">
              <h3>{t('landing.pricing.recharge_title')}</h3>
              <p>{t('landing.pricing.recharge_subtitle')}</p>
            </div>

            <div className="lp-recharge-grid">
              <div className="lp-recharge-card">
                <div className="label">{t('landing.pricing.recharge1_label')}</div>
                <div className="recharge-price">{t('landing.pricing.recharge1_price')}</div>
                <strong>{t('landing.pricing.recharge1_title')}</strong>
                <p>{t('landing.pricing.recharge1_desc')}</p>
              </div>

              <div className="lp-recharge-card featured">
                <div className="label">{t('landing.pricing.recharge2_label')}</div>
                <div className="recharge-price">{t('landing.pricing.recharge2_price')}</div>
                <strong>{t('landing.pricing.recharge2_title')}</strong>
                <p>{t('landing.pricing.recharge2_desc')}</p>
              </div>

              <div className="lp-recharge-card">
                <div className="label">{t('landing.pricing.recharge3_label')}</div>
                <div className="recharge-price">{t('landing.pricing.recharge3_price')}</div>
                <strong>{t('landing.pricing.recharge3_title')}</strong>
                <p>{t('landing.pricing.recharge3_desc')}</p>
              </div>
            </div>

            <p className="lp-note">
              {t('landing.pricing.note2')}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.faq.kicker')}</div>
            <h2>{t('landing.faq.title')}</h2>
          </div>

          <div className="lp-faq">
            {faq.map((item, i) => (
              <div className="lp-faq-item" key={i}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>          </div>
        
      </section>

      {/* RESOURCES */}
      <section id="ressources" className="lp-section lp-resources-section">
        <div className="lp-shell">
          <div className="lp-section-header center">
            <div className="lp-section-kicker">{t('landing.resources.kicker', 'Centre de ressources')}</div>
            <h2>{t('landing.resources.title', 'Pour aller plus loin')}</h2>
            <p>
              {t('landing.resources.intro', 'Guides pratiques, méthodes et exemples pour mieux préparer vos candidatures et vos entretiens.')}
            </p>
          </div>

          <div className="lp-resources-grid">
            {resourceClusters.map((cluster) => (
              <div className="lp-resource-cluster" key={cluster.title}>
                <div className="lp-resource-cluster-header">
                  <div className="lp-resource-cluster-icon">{cluster.icon}</div>
                  <h3>{cluster.title}</h3>
                </div>
                <ul className="lp-resource-links">
                  {cluster.links.map((link) => (
                    <li key={link}>
                      <a href="#ressources" onClick={(e) => e.preventDefault()} className="lp-resource-link">
                        {link}
                        <span className="lp-resource-soon">{t('landing.resources.soon', 'Bientôt')}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-section">
        <div className="lp-shell">
          <div className="lp-final">
            <Gauge size={34} color="var(--primary)" />
            <h2>{t('landing.final.title')}</h2>
            <p>
              {t('landing.final.text')}
            </p>
            <button onClick={onLoginRedirect} className="lp-button-primary">
              {t('landing.final.cta')} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-shell">
          <p>{t('landing.footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
