export interface PilotSummaryGap {
  skill: string;
  impact: string;
  action: string;
}

export interface PilotSummaryData {
  matchScore: number;
  summary: string;
  strengths: string[];
  gapsMatrix: PilotSummaryGap[];
  recommendedStrategy: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed;
  }
  return '';
};

const splitSkills = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const dedupe = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) {
      return false;
    }
    seen.add(normalized.toLowerCase());
    return true;
  });
};

export const buildFallbackPilotSummary = (payload: any, researchData?: any): PilotSummaryData => {
  const targetRole = normalizeText(payload?.target_job || payload?.target_role_primary || payload?.current_role) || 'le poste visé';
  const targetCompany = normalizeText(payload?.target_company || payload?.current_company) || 'l’entreprise cible';
  const skills = dedupe([
    ...splitSkills(payload?.skills),
    ...((payload?.experiences || []) as any[]).flatMap((experience: any) => splitSkills(experience?.title || experience?.role || experience?.position)),
    ...((payload?.experiences || []) as any[]).flatMap((experience: any) => splitSkills(experience?.company))
  ]);
  const experienceTitles = dedupe(((payload?.experiences || []) as any[])
    .map((experience: any) => normalizeText(experience?.title || experience?.role || experience?.position))
    .filter(Boolean));

  const baseStrengths = dedupe([
    ...skills.slice(0, 4),
    ...experienceTitles.slice(0, 3),
    normalizeText(payload?.current_role) || 'Expérience professionnelle',
    'Capacité d’adaptation',
    'Mise en valeur des résultats'
  ]).slice(0, 6);

  const strengthList = baseStrengths.length > 0 ? baseStrengths : ['Expérience professionnelle', 'Réactivité', 'Mise en valeur des résultats'];
  const scoreBase = 58 + Math.min(20, skills.length * 3) + (targetRole !== 'le poste visé' ? 6 : 0) + (targetCompany !== 'l’entreprise cible' ? 4 : 0);
  const score = clamp(scoreBase + (researchData ? 3 : 0), 55, 92);

  const researchHint = normalizeText((researchData && typeof researchData === 'object') ? (researchData.executive_summary || researchData.summary) : '');
  const summary = [
    `Votre profil semble cohérent avec ${targetRole}.`,
    `La synthèse IA n’était pas disponible, donc voici une première lecture locale basée sur les informations saisies.`,
    researchHint ? `Contexte marché : ${researchHint.slice(0, 180)}` : ''
  ].filter(Boolean).join(' ');

  return {
    matchScore: score,
    summary,
    strengths: strengthList,
    gapsMatrix: [
      {
        skill: 'Preuve d’impact chiffré',
        impact: 'High',
        action: 'Ajoutez 2 à 3 résultats mesurables à votre CV et à votre pitch.'
      },
      {
        skill: 'Alignement poste / entreprise',
        impact: 'Medium',
        action: `Adaptez votre récit aux attentes de ${targetCompany}.`
      },
      {
        skill: 'Réponses structurées',
        impact: 'Medium',
        action: 'Préparez 3 exemples STAR spécifiques à ce poste.'
      }
    ],
    recommendedStrategy: `Mettez en avant vos résultats les plus tangibles pour ${targetRole}, puis adaptez votre narrative à ${targetCompany} avec des exemples concrets et mesurables.`
  };
};

export const normalizePilotSummaryResponse = (payload: any, responseData: any, researchData?: any): PilotSummaryData => {
  if (!responseData || typeof responseData !== 'object') {
    return buildFallbackPilotSummary(payload, researchData);
  }

  const safeGaps = Array.isArray(responseData.gapsMatrix)
    ? responseData.gapsMatrix
    : (Array.isArray(responseData.skills_to_bridge) ? responseData.skills_to_bridge.map((item: any) => ({ skill: typeof item === 'string' ? item : (item?.skill || item?.name || 'Compétence à renforcer'), impact: 'Medium', action: 'À prioriser pour ce poste.' })) : []);

  const safeStrengths = Array.isArray(responseData.strengths)
    ? responseData.strengths
    : (Array.isArray(responseData.key_strengths) ? responseData.key_strengths : []);

  const matchScoreValue = responseData.matchScore ?? responseData.match_score ?? 0;
  const matchScore = typeof matchScoreValue === 'number' ? matchScoreValue : Number(matchScoreValue) || 0;

  const summary = normalizeText(responseData.summary || responseData.match_summary) || '';
  const strategy = normalizeText(responseData.recommendedStrategy || (Array.isArray(responseData.application_strategy) ? responseData.application_strategy.join('\n• ') : '')) || '';

  if (summary || safeStrengths.length || safeGaps.length || strategy || matchScore > 0) {
    return {
      matchScore: clamp(matchScore, 0, 100),
      summary: summary || buildFallbackPilotSummary(payload, researchData).summary,
      strengths: safeStrengths.map((item: any) => typeof item === 'string' ? item : normalizeText(item?.skill || item?.name || item)).filter(Boolean),
      gapsMatrix: safeGaps.map((item: any) => ({
        skill: typeof item === 'string' ? item : normalizeText(item?.skill || item?.name || 'Compétence à renforcer'),
        impact: normalizeText(item?.impact) || 'Medium',
        action: normalizeText(item?.action) || 'À prioriser pour ce poste.'
      })).filter((item) => item.skill),
      recommendedStrategy: strategy || buildFallbackPilotSummary(payload, researchData).recommendedStrategy
    };
  }

  return buildFallbackPilotSummary(payload, researchData);
};
