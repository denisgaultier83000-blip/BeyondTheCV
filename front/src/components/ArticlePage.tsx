import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { Clock, ArrowLeft, BookOpen } from 'lucide-react';
import { ArticleResource, getArticleBySlug } from '../utils/articleLoader';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [article, setArticle] = useState<ArticleResource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError(t('resources.article_not_found', 'Article introuvable'));
      return;
    }
    const found = getArticleBySlug(slug);
    if (!found) {
      setError(t('resources.article_not_found', 'Article introuvable'));
      return;
    }
    setArticle(found);
    setError(null);

    // Track read articles in localStorage
    try {
      const raw = localStorage.getItem('btcv_read_articles');
      const read: string[] = raw ? JSON.parse(raw) : [];
      if (!read.includes(found.slug)) {
        localStorage.setItem('btcv_read_articles', JSON.stringify([...read, found.slug]));
      }
    } catch {
      // ignore storage errors
    }

    document.title = `${found.seoTitle || found.title} | BeyondTheCV`;
    return () => {
      document.title = 'BeyondTheCV';
    };
  }, [slug, t]);

  const htmlContent = useMemo(() => {
    if (!article) return '';
    try {
      return marked.parse(article.content, { async: false }) as string;
    } catch {
      return `<pre>${article.content}</pre>`;
    }
  }, [article]);

  if (error || !article) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-main)' }}>{error || t('resources.loading', 'Chargement...')}</h2>
        <button onClick={() => navigate('/ressources')} className="btn-primary" style={{ marginTop: '1rem' }}>
          {t('resources.back_to_list', 'Retour aux ressources')}
        </button>
      </div>
    );
  }

  return (
    <div className="article-page" style={{ padding: '1.5rem 0 4rem' }}>
      <nav style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/ressources"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#0D9488',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> {t('resources.back_to_list', 'Retour aux ressources')}
        </Link>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#CCFBF1',
              color: '#0F766E',
            }}
          >
            <BookOpen size={12} /> {article.category}
          </span>
          {article.readingTime && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
              }}
            >
              <Clock size={12} /> {article.readingTime}
            </span>
          )}
          {article.access === 'premium' && (
            <span
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#92400E',
              }}
            >
              Premium
            </span>
          )}
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: '1.9rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            lineHeight: 1.2,
          }}
        >
          {article.title}
        </h1>

        {article.description && (
          <p
            style={{
              margin: '0.75rem 0 0',
              fontSize: '1.05rem',
              color: 'var(--text-muted)',
              lineHeight: 1.55,
            }}
          >
            {article.description}
          </p>
        )}
      </header>

      <article
        className="article-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '1.5rem 1.75rem',
          color: 'var(--text-main)',
          lineHeight: 1.7,
          fontSize: '1rem',
        }}
      />

      {article.cta?.label && article.cta?.href && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <a
            href={article.cta.href}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {article.cta.label}
          </a>
        </div>
      )}
    </div>
  );
}

export default ArticlePage;
