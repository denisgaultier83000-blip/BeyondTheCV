import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock, ArrowRight, Sparkles } from 'lucide-react';
import {
  ArticleResource,
  ArticleMarker,
  loadArticles,
  groupByCategory,
  computeMarkers,
} from '../utils/articleLoader';

interface ResourcesTabProps {
  embedded?: boolean;
  recommendedSlugs?: string[];
  readSlugs?: string[];
}

const markerConfig: Record<
  ArticleMarker,
  { label: string; bg: string; color: string }
> = {
  recommended: { label: 'À lire', bg: '#DCFCE7', color: '#166534' },
  new: { label: 'Nouveau', bg: '#DBEAFE', color: '#1E40AF' },
  read: { label: 'Lu', bg: '#F3F4F6', color: '#4B5563' },
  premium: { label: 'Premium', bg: '#FEF3C7', color: '#92400E' },
  reread: { label: 'À relire', bg: '#F3E8FF', color: '#7C3AED' },
};

function MarkerBadge({ marker }: { marker: ArticleMarker }) {
  const config = markerConfig[marker];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        background: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      {marker === 'recommended' && <Sparkles size={11} />}
      {config.label}
    </span>
  );
}

function ArticleCard({
  article,
  recommendedSlugs,
  readSlugs,
}: {
  article: ArticleResource;
  recommendedSlugs?: string[];
  readSlugs?: string[];
}) {
  const navigate = useNavigate();
  const isNew = article.status === 'ready' && !readSlugs?.includes(article.slug);
  const markers = computeMarkers(article, {
    isNew,
    isRead: readSlugs?.includes(article.slug),
    isPremium: article.access === 'premium',
    recommendedSlugs,
  });

  return (
    <button
      onClick={() => navigate(`/ressources/${article.slug}`)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.55rem',
        width: '100%',
        padding: '1rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {markers.map((m) => (
          <MarkerBadge key={m} marker={m} />
        ))}
      </div>
      <h4
        style={{
          margin: 0,
          fontSize: '0.98rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          lineHeight: 1.35,
        }}
      >
        {article.title}
      </h4>
      {article.excerpt && (
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.excerpt}
        </p>
      )}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}
      >
        {article.readingTime && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> {article.readingTime}
          </span>
        )}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600,
            color: '#0D9488',
          }}
        >
          Lire <ArrowRight size={12} />
        </span>
      </div>
    </button>
  );
}

export function ResourcesTab({
  embedded,
  recommendedSlugs = [],
  readSlugs: externalReadSlugs,
}: ResourcesTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleResource[]>([]);
  const [readSlugs, setReadSlugs] = useState<string[]>([]);

  useEffect(() => {
    setArticles(loadArticles());
    try {
      const raw = localStorage.getItem('btcv_read_articles');
      if (raw) setReadSlugs(JSON.parse(raw));
    } catch {
      setReadSlugs([]);
    }
  }, []);

  const effectiveReadSlugs = externalReadSlugs ?? readSlugs;

  const grouped = useMemo(() => groupByCategory(articles), [articles]);
  const recommended = useMemo(
    () => articles.filter((a) => recommendedSlugs.includes(a.slug)),
    [articles, recommendedSlugs]
  );
  const continueReading = useMemo(
    () => articles.filter((a) => effectiveReadSlugs.includes(a.slug)).slice(0, 3),
    [articles, effectiveReadSlugs]
  );

  const title = embedded
    ? t('resources.title_dashboard', 'Ressources')
    : t('resources.title_page', 'Centre de ressources');
  const subtitle = t(
    'resources.subtitle',
    'Guides et conseils sélectionnés pour mieux préparer vos entretiens.'
  );

  return (
    <div
      className="resources-tab"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2.25rem',
        padding: embedded ? 0 : '1rem 0 3rem',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.4rem',
          }}
        >
          <BookOpen size={24} color="#0D9488" />
          <h1
            style={{
              margin: 0,
              fontSize: embedded ? '1.55rem' : '2rem',
              fontWeight: 800,
              color: 'var(--text-main)',
            }}
          >
            {title}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>

      {recommended.length > 0 && (
        <section>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.9rem',
            }}
          >
            <Sparkles size={16} color="#0D9488" />
            {t('resources.recommended', 'Sélectionné pour vous')}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#0D9488',
                background: '#CCFBF1',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
              }}
            >
              {recommended.length} {t('resources.recommendation_count', 'recommandation(s) pour votre candidature actuelle')}
            </span>
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {recommended.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                recommendedSlugs={recommendedSlugs}
                readSlugs={effectiveReadSlugs}
              />
            ))}
          </div>
        </section>
      )}

      {continueReading.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '0.9rem',
            }}
          >
            {t('resources.continue_reading', 'Continuer ma lecture')}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {continueReading.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                recommendedSlugs={recommendedSlugs}
                readSlugs={effectiveReadSlugs}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.9rem',
          }}
        >
          {t('resources.all_resources', 'Toutes les ressources')}
        </h2>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '2rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.6rem',
                marginBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.45rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0D9488',
                }}
              >
                {category}
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {items.length} {items.length > 1 ? 'articles' : 'article'}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {items.map((article) => (
                <ArticleCard
                  key={article.slug}
                  article={article}
                  recommendedSlugs={recommendedSlugs}
                  readSlugs={effectiveReadSlugs}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {!embedded && (
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ alignSelf: 'flex-start' }}
        >
          {t('resources.back', 'Retour')}
        </button>
      )}
    </div>
  );
}

export default ResourcesTab;
