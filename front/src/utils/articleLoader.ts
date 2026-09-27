export type ArticleStatus = 'ready' | 'draft' | 'archived';
export type ArticleAccess = 'free' | 'freemium' | 'premium';
export type ArticleMarker = 'read' | 'new' | 'premium' | 'reread' | 'recommended';

export interface ArticleResource {
  slug: string;
  title: string;
  seoTitle?: string;
  description?: string;
  excerpt?: string;
  category: string;
  tags: string[];
  audience: string[];
  access: ArticleAccess;
  status: ArticleStatus;
  language: string;
  author?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  readingTime?: string;
  featured?: boolean;
  pillar?: boolean;
  cta?: { label?: string; href?: string };
  content: string;
  raw: string;
  markers?: ArticleMarker[];
}

function parseYamlBlock(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;

    const listMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!currentList) {
        currentList = [];
        result[currentKey] = currentList;
      }
      currentList.push(listMatch[2].trim());
      continue;
    }

    const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      currentKey = keyValueMatch[1];
      currentList = null;
      const value = keyValueMatch[2].trim();
      if (value === 'null') {
        result[currentKey] = null;
      } else if (value === 'true') {
        result[currentKey] = true;
      } else if (value === 'false') {
        result[currentKey] = false;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        result[currentKey] = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        result[currentKey] = value.slice(1, -1);
      } else if (value === '') {
        result[currentKey] = undefined;
      } else {
        result[currentKey] = value;
      }
    }
  }

  return result;
}

function parseFrontMatter(raw: string): { frontmatter: Record<string, any>; content: string } {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, content: trimmed };
  }
  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: trimmed };
  }
  const yaml = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3).trim();
  return { frontmatter: parseYamlBlock(yaml), content };
}

function toArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') return value ? [value] : [];
  return [];
}

export function loadArticles(): ArticleResource[] {
  try {
    const files = import.meta.glob('/content/articles/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

    return Object.entries(files)
      .map(([path, raw]) => {
        const slug = path.replace(/^.*\//, '').replace(/\.md$/, '');
        const { frontmatter, content } = parseFrontMatter(raw);

        const article: ArticleResource = {
          slug,
          title: frontmatter.title || slug,
          seoTitle: frontmatter.seoTitle || frontmatter.title || slug,
          description: frontmatter.description || '',
          excerpt: frontmatter.excerpt || '',
          category: frontmatter.category || 'Général',
          tags: toArray(frontmatter.tags),
          audience: toArray(frontmatter.audience),
          access: (frontmatter.access as ArticleAccess) || 'free',
          status: (frontmatter.status as ArticleStatus) || 'ready',
          language: frontmatter.language || 'fr',
          author: frontmatter.author || 'BeyondTheCV',
          publishedAt: frontmatter.publishedAt ?? null,
          updatedAt: frontmatter.updatedAt ?? null,
          readingTime: frontmatter.readingTime || '',
          featured: frontmatter.featured === true,
          pillar: frontmatter.pillar === true,
          cta: frontmatter.cta || {},
          content,
          raw,
        };

        return article;
      })
      .filter((a) => a.status !== 'archived')
      .sort((a, b) => (a.category || '').localeCompare(b.category || '', 'fr'));
  } catch (error) {
    console.error('[articleLoader] Failed to load articles:', error);
    return [];
  }
}

export function getArticleBySlug(slug: string): ArticleResource | undefined {
  return loadArticles().find((a) => a.slug === slug);
}

export function groupByCategory(articles: ArticleResource[]): Record<string, ArticleResource[]> {
  return articles.reduce((acc, article) => {
    const category = article.category || 'Général';
    if (!acc[category]) acc[category] = [];
    acc[category].push(article);
    return acc;
  }, {} as Record<string, ArticleResource[]>);
}

export function computeMarkers(
  article: ArticleResource,
  options: {
    isNew?: boolean;
    isRead?: boolean;
    isPremium?: boolean;
    recommendedSlugs?: string[];
  } = {}
): ArticleMarker[] {
  const markers: ArticleMarker[] = [];
  if (options.isRead) markers.push('read');
  else if (options.recommendedSlugs?.includes(article.slug)) markers.push('recommended');
  else if (options.isNew) markers.push('new');
  if (options.isPremium || article.access === 'premium') markers.push('premium');
  return markers;
}
