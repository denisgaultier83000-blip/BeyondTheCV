import React, { useEffect, useMemo, useState } from 'react';
import {
  Building, Newspaper, ExternalLink, Globe2, Target, Users, TrendingUp, BookOpen,
  Brain, Activity, Linkedin, MapPin, Briefcase, Euro, Globe, Handshake,
  AlertTriangle, Lightbulb, ChevronRight, ShieldCheck, SignalHigh, HelpCircle
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useTranslation } from 'react-i18next';
import { formatStrategicAnalysisReact as formatMarkdownReact } from '../utils/formatUtils';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

type Confidence = 'confirmed' | 'strong_signal' | 'inferred' | 'unverified';
type TabKey = 'overview' | 'structure' | 'dynamics';

interface NormalizedSignal {
  id: string;
  type: string;
  title: string;
  facts: string[];
  confidence: Confidence;
  sourceCount: number;
  impact?: string;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const safeData = data || {};
  const companyName = safeData.company || t('default_target_company', 'Entreprise ciblée');
  const report = safeData.company_report || safeData.synthesis || {};

  const isValidText = (val: any): boolean => {
    if (!val || typeof val !== 'string' || val.trim() === '') return false;
    const normalized = val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return !normalized.includes('non specifie') && !normalized.includes('non renseigne') && !normalized.includes('inconnu');
  };

  const getSafeHttpUrl = (rawUrl: any): string | null => {
    const value = String(rawUrl || '').trim();
    if (!value || value === '#') return null;
    try {
      const normalized = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;
      const parsed = new URL(normalized);
      const host = parsed.hostname.toLowerCase();
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      if (!host || ['example.com', 'www.example.com', 'exemple.com', 'www.exemple.com', 'localhost'].includes(host)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const getSafeLinkedInUrl = (rawUrl: any): string | null => {
    const url = getSafeHttpUrl(rawUrl);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.toLowerCase().includes('linkedin.com')) return null;
      const match = parsed.pathname.match(/^\/company\/[^/]+/);
      if (!match) return null;
      return `https://www.linkedin.com${match[0]}`;
    } catch {
      return null;
    }
  };

  const linkedinUrl = getSafeLinkedInUrl(report.linkedin_url || safeData.linkedin_url);

  // [RESTORED] Favicon du média pour les articles de presse
  const getFaviconCandidates = (url: string | null): string[] => {
    if (!url) return [];
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      return [
        `https://www.google.com/s2/favicons?domain=${host}&sz=32`,
        `https://icons.duckduckgo.com/ip3/${host}.ico`,
        `https://${host}/favicon.ico`,
        `https://${host}/apple-touch-icon.png`,
      ];
    } catch {
      return [];
    }
  };

  const FaviconImage = ({ url }: { url: string | null }) => {
    const candidates = useMemo(() => getFaviconCandidates(url), [url]);
    const [index, setIndex] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      setIndex(0);
      setFailed(false);
    }, [url]);

    if (!url || failed || candidates.length === 0) {
      return null;
    }

    return (
      <img
        src={candidates[index]}
        alt=""
        style={{ width: '16px', height: '16px', marginRight: '6px', borderRadius: '2px', flexShrink: 0 }}
        onError={() => {
          if (index < candidates.length - 1) {
            setIndex(index + 1);
            return;
          }
          setFailed(true);
        }}
      />
    );
  };

  // --- NORMALISATION DES DONNÉES ---

  const locations: any[] = Array.isArray(report.locations) ? report.locations : [];
  const jobs: any[] = Array.isArray(report.job_postings) ? report.job_postings : [];
  const relationships: any[] = Array.isArray(report.relationships) ? report.relationships : [];
  const facts: any[] = Array.isArray(report.facts) ? report.facts : [];
  const rawSignals = Array.isArray(report.signals) ? report.signals : [];
  const strategicChallengesRaw = report.strategic_challenges || [];
  const strategicChallenges = (Array.isArray(strategicChallengesRaw) ? strategicChallengesRaw : (typeof strategicChallengesRaw === 'string' ? [strategicChallengesRaw] : []))
    .filter((c: any) => typeof c === 'string' && c.trim().toLowerCase() !== 'données stratégiques non disponibles.' && c.trim() !== '');
  const interviewQuestions: string[] = Array.isArray(report.interview_questions) ? report.interview_questions : [];
  const sources: string[] = safeData.sources || [];
  const rawNewsLinks = Array.isArray(report.news_links) ? report.news_links : [];

  // [FIX] Exclure les news sans contenu utile (placeholders du fallback sectoriel)
  const newsLinks = rawNewsLinks.filter((n: any) => {
    if (!n || typeof n !== 'object') return false;
    const title = String(n.title || '').trim();
    const analysis = String(n.strategic_analysis || n.analysis || n.hidden_meaning || n.snippet || '').trim();
    return title && title.toLowerCase() !== 'actualité sectorielle' && analysis && !analysis.toLowerCase().startsWith('données');
  });

  const activeLocations = locations.filter((l: any) => l?.is_active !== false);
  const headquarters = activeLocations.find((l: any) => l?.is_headquarters) || activeLocations[0];
  const locationCountries = Array.from(new Set(activeLocations.map((l: any) => l?.country).filter(Boolean)));
  const locationCities = Array.from(new Set(activeLocations.map((l: any) => l?.city).filter(Boolean))).slice(0, 3);

  const jobCount = jobs.length;
  const jobCountries = Array.from(new Set(jobs.map((j: any) => j?.country || j?.location).filter(Boolean)));
  const jobFunctions = Array.from(new Set(jobs.map((j: any) => j?.function).filter(Boolean))).slice(0, 3);

  const partners = relationships.filter((r: any) => ['partner', 'technology_provider'].includes(r?.relationship_type));
  const suppliers = relationships.filter((r: any) => r?.relationship_type === 'supplier');
  const publicClients = relationships.filter((r: any) => r?.relationship_type === 'public_client');

  const internationalFacts = facts.filter((f: any) => f?.category === 'international');

  const financialSummary = isValidText(report.financial_health)
    ? report.financial_health
    : (isValidText(report.key_figures) ? report.key_figures : null);

  // --- SIGNAUX DÉTECTÉS ---

  const signals: NormalizedSignal[] = useMemo(() => {
    const built: NormalizedSignal[] = [];

    if (rawSignals.length > 0) {
      rawSignals.forEach((s: any, idx: number) => {
        built.push({
          id: `signal-${idx}`,
          type: s.signal_type || s.type || 'strategic_signal',
          title: s.title || 'Signal détecté',
          facts: Array.isArray(s.evidence) ? s.evidence : (s.fact ? [s.fact] : []),
          confidence: normalizeConfidence(s.confidence, s.status),
          sourceCount: Array.isArray(s.sources) ? s.sources.length : (s.sourceCount || 1),
          impact: s.candidate_relevance || s.impact || s.interview_impact,
        });
      });
    }

    if (built.length === 0) {
      // Signaux dérivés des données héritées/disponibles
      if (jobCount >= 5) {
        built.push({
          id: 'signal-hiring',
          type: 'hiring',
          title: `Recrutement actif (${jobCount} offres)`,
          facts: [`${jobCount} offres d'emploi actuellement identifiées`, ...jobFunctions.map(f => `Postes ${f}`)],
          confidence: 'strong_signal',
          sourceCount: Math.min(jobCount, 5),
          impact: 'Préparez un exemple montrant votre adaptabilité et votre valeur ajoutée rapide.',
        });
      }
      if (locationCountries.length > 1 || internationalFacts.length > 0) {
        const countries = internationalFacts.map((f: any) => f.country || f.fact).filter(Boolean);
        built.push({
          id: 'signal-international',
          type: 'international_expansion',
          title: 'Présence internationale',
          facts: countries.length ? countries : [`${locationCountries.length} pays identifiés`, ...locationCountries],
          confidence: countries.length ? 'confirmed' : 'strong_signal',
          sourceCount: 2,
          impact: 'Préparez une question sur les priorités géographiques et un exemple multiculturel.',
        });
      }
      if (strategicChallenges.length > 0) {
        const firstChallenge = strategicChallenges[0];
        // [FIX] Ne pas afficher de signal générique si le backend n'a fourni que des placeholders vides.
        if (firstChallenge && firstChallenge.toLowerCase().includes('données')) {
          // rien
        } else {
          built.push({
            id: 'signal-challenges',
            type: 'strategic_challenge',
            title: 'Enjeux stratégiques identifiés',
            facts: strategicChallenges.slice(0, 3),
            confidence: 'strong_signal',
            sourceCount: 1,
            impact: 'Reliez vos expériences passées à ces enjeux en entretien.',
          });
        }
      }
      if (partners.length > 0 || suppliers.length > 0) {
        built.push({
          id: 'signal-ecosystem',
          type: 'ecosystem',
          title: 'Écosystème actif',
          facts: [
            ...(partners.length ? [`${partners.length} partenaire(s) identifié(s)`] : []),
            ...(suppliers.length ? [`${suppliers.length} fournisseur(s) visible(s)`] : []),
            ...(publicClients.length ? [`${publicClients.length} client(s) public(s)`] : []),
          ],
          confidence: 'strong_signal',
          sourceCount: partners.length + suppliers.length + publicClients.length,
          impact: 'Montrez que vous comprenez les interdépendances de l\'entreprise.',
        });
      }
    }

    return built;
  }, [rawSignals, jobCount, jobFunctions, locationCountries, internationalFacts, strategicChallenges, partners, suppliers, publicClients]);

  const growthSignals = signals.filter(s => ['growth', 'hiring', 'international_expansion', 'product_launch', 'digital_transformation'].includes(s.type));
  const riskSignals = signals.filter(s => ['decline', 'restructuring', 'financial_pressure', 'regulatory_exposure', 'customer_pressure'].includes(s.type));
  const neutralSignals = signals.filter(s => !growthSignals.includes(s) && !riskSignals.includes(s));

  // --- HELPERS UI ---

  function normalizeConfidence(confidence: any, status?: string): Confidence {
    if (status === 'confirmed' || confidence === 'confirmed') return 'confirmed';
    if (status === 'inferred' || confidence === 'inferred' || confidence < 0.65) return 'inferred';
    if (status === 'strong_signal' || (typeof confidence === 'number' && confidence >= 0.8) || confidence === 'strong_signal') return 'strong_signal';
    return 'unverified';
  }

  const confidenceMeta: Record<Confidence, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    confirmed: { label: 'Confirmé', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: <ShieldCheck size={12} /> },
    strong_signal: { label: 'Signal fort', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: <SignalHigh size={12} /> },
    inferred: { label: 'Inféré', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <Lightbulb size={12} /> },
    unverified: { label: 'Non vérifié', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <HelpCircle size={12} /> },
  };

  function ConfidenceBadge({ level }: { level: Confidence }) {
    const meta = confidenceMeta[level];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.15rem 0.4rem', borderRadius: '0.25rem',
        background: meta.bg, color: meta.color,
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em'
      }}>
        {meta.icon} {meta.label}
      </span>
    );
  }

  function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
        {icon} {children}
      </h3>
    );
  }

  function CompactCard({ title, icon, children, badge, onClick }: { title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode; onClick?: () => void }) {
    return (
      <div
        onClick={onClick}
        style={{
          background: 'var(--bg-secondary)',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-color)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'box-shadow 0.2s, transform 0.1s',
        }}
        onMouseOver={(e) => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
        onMouseOut={(e) => onClick && (e.currentTarget.style.boxShadow = 'none')}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {icon} {title}
          </h4>
          {badge}
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{children}</div>
      </div>
    );
  }

  function InterviewImpactBlock({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Brain size={16} /> Ce que cela change pour votre entretien
        </h4>
        <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>{children}</div>
      </div>
    );
  }

  function SignalCard({ signal }: { signal: NormalizedSignal }) {
    const isRisk = riskSignals.includes(signal);
    const isGrowth = growthSignals.includes(signal);
    return (
      <div style={{
        background: isRisk ? 'rgba(239, 68, 68, 0.04)' : isGrowth ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
        border: `1px solid ${isRisk ? 'rgba(239, 68, 68, 0.15)' : isGrowth ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-color)'}`,
        borderRadius: '0.75rem', padding: '1rem 1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h5 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700 }}>{signal.title}</h5>
          <ConfidenceBadge level={signal.confidence} />
        </div>
        <ul style={{ margin: '0 0 0.75rem 0', paddingLeft: '1.1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {signal.facts.slice(0, 3).map((fact, i) => (
            <li key={i} style={{ marginBottom: '0.25rem' }}>{fact}</li>
          ))}
        </ul>
        {signal.impact && (
          <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontStyle: 'italic', borderLeft: '2px solid var(--primary)', paddingLeft: '0.6rem' }}>
            {signal.impact}
          </div>
        )}
      </div>
    );
  }

  function SourcesPill({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
      <button style={{
        background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '0.35rem',
        padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
      }}>
        <BookOpen size={12} /> {count} source{count > 1 ? 's' : ''}
      </button>
    );
  }

  // --- RENDU SYNTHÈSE ---

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {(isValidText(report.identity_dna) || linkedinUrl) && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>À retenir sur {companyName}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {isValidText(report.identity_dna) ? report.identity_dna : (
                  <span>
                    Aucune fiche d'identité disponible pour <strong>{companyName}</strong>. Concentrez-vous sur les actualités et les sources analysées ci-dessous pour préparer votre entretien.
                  </span>
                )}
              </p>
            </div>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" title={t('view_on_linkedin', 'Voir sur LinkedIn')} style={{ color: '#0a66c2', flexShrink: 0 }}>
                <Linkedin size={24} />
              </a>
            )}
          </div>
        </div>
      )}

      {signals.length > 0 && (
        <div>
          <SectionTitle icon={<Activity size={20} color="var(--primary)" />}>Signaux détectés</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {signals.slice(0, 4).map(signal => <SignalCard key={signal.id} signal={signal} />)}
          </div>
        </div>
      )}

      {(interviewQuestions.length > 0 || signals.length > 0) && (
        <InterviewImpactBlock>
          {interviewQuestions.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {interviewQuestions.slice(0, 3).map((q, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{q}</li>)}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>
              Reliez vos expériences aux signaux ci-dessus. Préparez une question sur la priorité stratégique la plus visible.
            </p>
          )}
        </InterviewImpactBlock>
      )}
    </div>
  );

  // --- RENDU STRUCTURE & ACTIVITÉ ---

  const renderStructure = () => {
    const cards: React.ReactNode[] = [];

    if (activeLocations.length > 0) {
      cards.push(
        <CompactCard key="locations" title="Implantations" icon={<MapPin size={18} color="#3b82f6" />} badge={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeLocations.length} site{activeLocations.length > 1 ? 's' : ''}</span>}>
          <div><strong>Siège :</strong> {headquarters ? `${headquarters.city || ''}${headquarters.city && headquarters.country ? ', ' : ''}${headquarters.country || ''}` : 'Non précisé'}</div>
          <div><strong>Pays :</strong> {locationCountries.join(', ') || 'Non précisé'}</div>
          {locationCities.length > 0 && <div style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>Villes : {locationCities.join(', ')}</div>}
        </CompactCard>
      );
    }

    const isFallbackFinancialText = (text: string): boolean => {
      const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes('donnees financieres non disponibles')
        || normalized.includes('donnees salariales temporairement indisponibles')
        || normalized.includes('aucun chiffre cle specifique disponible')
        || normalized.includes('aucune information disponible')
        || normalized.includes('non specifie')
        || normalized.includes('non renseigne')
        || normalized.includes('non disponible');
    };

    const usableFinancialSummary = financialSummary && !isFallbackFinancialText(financialSummary) ? financialSummary : null;

    if (usableFinancialSummary) {
      cards.push(
        <CompactCard key="financial" title="Santé & dynamique" icon={<Euro size={18} color="#10b981" />} badge={report.financial_trend ? <ConfidenceBadge level={normalizeConfidence(report.financial_trend_confidence)} /> : undefined}>
          <div style={{ maxHeight: '4.5rem', overflow: 'hidden' }}>{usableFinancialSummary}</div>
        </CompactCard>
      );
    }

    if (jobCount > 0) {
      cards.push(
        <CompactCard key="jobs" title="Recrutements" icon={<Briefcase size={18} color="#8b5cf6" />} badge={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{jobCount} offre{jobCount > 1 ? 's' : ''}</span>}>
          <div><strong>Métiers :</strong> {jobFunctions.join(', ') || 'Non précisé'}</div>
          <div><strong>Zones :</strong> {jobCountries.slice(0, 3).join(', ') || 'Non précisé'}</div>
        </CompactCard>
      );
    }

    if (internationalFacts.length > 0 || locationCountries.length > 1) {
      cards.push(
        <CompactCard key="international" title="International & export" icon={<Globe size={18} color="#f59e0b" />} badge={internationalFacts.length > 0 ? <ConfidenceBadge level="confirmed" /> : undefined}>
          <div><strong>Pays confirmés :</strong> {locationCountries.length > 1 ? locationCountries.length : (internationalFacts.length || 'Non')}</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {internationalFacts.slice(0, 2).map((f: any) => f.fact).join(' ; ')}
          </div>
        </CompactCard>
      );
    }

    if (relationships.length > 0) {
      cards.push(
        <CompactCard key="partners" title="Partenaires & écosystème" icon={<Handshake size={18} color="#ec4899" />} badge={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{relationships.length} lien{relationships.length > 1 ? 's' : ''}</span>}>
          {partners.length > 0 && <div><strong>Partenaires :</strong> {partners.slice(0, 2).map((r: any) => r.related_company_name).join(', ')}</div>}
          {suppliers.length > 0 && <div><strong>Fournisseurs visibles :</strong> {suppliers.slice(0, 2).map((r: any) => r.related_company_name).join(', ')}</div>}
          {publicClients.length > 0 && <div><strong>Clients publics :</strong> {publicClients.slice(0, 2).map((r: any) => r.related_company_name).join(', ')}</div>}
        </CompactCard>
      );
    }

    if (signals.length > 0) {
      cards.push(
        <CompactCard key="signals" title="Signaux stratégiques" icon={<TrendingUp size={18} color="#06b6d4" />} badge={<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{signals.length} signal{signals.length > 1 ? 'ux' : ''}</span>}>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {signals.slice(0, 3).map(s => <li key={s.id} style={{ marginBottom: '0.25rem' }}>{s.title}</li>)}
          </ul>
        </CompactCard>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {cards.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {cards}
          </div>
        ) : null}

        <InterviewImpactBlock>
          {strategicChallenges.length > 0 ? (
            <>
              <p style={{ margin: '0 0 0.5rem 0' }}>Les enjeux suivants devraient guider votre préparation :</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {strategicChallenges.slice(0, 3).map((c, i) => <li key={i} style={{ marginBottom: '0.35rem' }}>{c}</li>)}
              </ul>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              Concentrez-vous sur la trajectoire de l'entreprise et les métiers recrutés. Préparez un exemple concret par axe d'activité.
            </p>
          )}
        </InterviewImpactBlock>
      </div>
    );
  };

  // --- RENDU ACTUALITÉ & DYNAMIQUE ---

  const renderDynamics = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {newsLinks.length > 0 ? (
        <div>
          <SectionTitle icon={<Newspaper size={20} color="var(--primary)" />}>Actualités & signaux faibles</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {newsLinks.slice(0, 5).map((news: any, i: number) => {
              const fullUrl = getSafeHttpUrl(news.url);
              const sourceLabel = news.source || (fullUrl ? new URL(fullUrl).hostname.replace(/^www\./, '') : 'Source');
              return (
                <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                    {fullUrl ? (
                      <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none', lineHeight: 1.4, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>
                        {news.title}
                      </a>
                    ) : (
                      <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>{news.title}</h5>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{news.date}</span>
                  </div>
                  {(isValidText(news.strategic_analysis) || isValidText(news.snippet) || isValidText(news.hidden_meaning)) && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {isValidText(news.strategic_analysis) ? formatMarkdownReact(news.strategic_analysis) : null}
                      {!isValidText(news.strategic_analysis) && isValidText(news.hidden_meaning) ? <div style={{ fontStyle: 'italic' }}>{news.hidden_meaning}</div> : null}
                      {!isValidText(news.strategic_analysis) && !isValidText(news.hidden_meaning) && isValidText(news.snippet) ? <div>{news.snippet}</div> : null}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {fullUrl ? (
                      <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                        <FaviconImage url={fullUrl} />
                        {sourceLabel}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      news.source && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Globe size={14} />
                          {news.source}
                        </span>
                      )
                    )}
                    {!fullUrl && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Lien non disponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Aucune actualité identifiée.</div>
      )}

      {riskSignals.length > 0 && (
        <div>
          <SectionTitle icon={<AlertTriangle size={20} color="#ef4444" />}>Risques & points de vigilance</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {riskSignals.map(signal => <SignalCard key={signal.id} signal={signal} />)}
          </div>
        </div>
      )}

      <InterviewImpactBlock>
        <p style={{ margin: 0 }}>
          En entretien, privilégiez une question ouverte sur un événement récent ou une tendance du secteur. Cela montre que vous suivez l'actualité de l'entreprise.
        </p>
      </InterviewImpactBlock>
    </div>
  );

  // --- TABS ---

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'structure', label: 'Structure & activité' },
    { key: 'dynamics', label: 'Actualité & dynamique' },
  ];

  return (
    <DashboardCard
      title={`${t('strategic_dossier', 'Comprendre l\'entreprise')} : ${companyName}`}
      icon={<Building size={24} />}
      loading={loading}
      loadingText={t('company_loading_text', 'Analyse approfondie et stratégique en cours...')}
      error={error}
      errorText={t('company_error_text', "Impossible de charger les données de l'entreprise.")}
      featureId="company_report"
      feedbackQuestion={t('company_feedback_q', 'Ce dossier de préparation vous donne-t-il un avantage ?')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '0.5rem 0.5rem 0 0',
                border: 'none',
                background: activeTab === tab.key ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                fontSize: '0.9rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'structure' && renderStructure()}
        {activeTab === 'dynamics' && renderDynamics()}

        {sources.length > 0 && (
          <div style={{ width: '100%', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <BookOpen size={14} /> Sources analysées
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {sources.slice(0, 8).map((source: string, idx: number) => {
                const url = getSafeHttpUrl(source);
                const label = url ? new URL(url).hostname.replace(/^www\./, '') : source;
                return url ? (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '0.35rem' }}>
                    {label} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '0.35rem' }}>{label}</span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
