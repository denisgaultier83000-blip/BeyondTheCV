import React, { useMemo, useState } from 'react';
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  Eye,
  Lightbulb,
  MessageSquare,
  Mic,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Zap
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useDashboard } from '../hooks/DashboardContext';

type ProfileMode = 'general' | 'application';

type AxisId =
  | 'clarity'
  | 'impact'
  | 'jobFit'
  | 'companyKnowledge'
  | 'objections'
  | 'leadership'
  | 'salary';

interface AxisDefinition {
  id: AxisId;
  label: string;
  shortLabel: string;
  score: number;
  color: string;
  level: string;
  why: string;
  evidence: string[];
  recommendationTitle: string;
  recommendationAction: string;
  targetTab: string;
  targetAnchor: string;
}

interface StrategicProfileTabProps {
  onNavigate: (tab: string, anchor?: string) => void;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const toNumber = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const levelForScore = (score: number) => {
  if (score >= 75) return 'Solide';
  if (score >= 55) return 'À renforcer';
  return 'Prioritaire';
};

const colorForScore = (score: number) => {
  if (score >= 75) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
};

const getQuestionsArray = (data: any): any[] => {
  if (!data) return [];
  let actualData = data.result !== undefined ? data.result : data;
  let depth = 0;

  while (typeof actualData === 'string' && depth < 5) {
    try {
      const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      actualData = JSON.parse(match ? match[1] : actualData);
      depth += 1;
    } catch {
      break;
    }
  }

  if (Array.isArray(actualData)) return actualData;

  const payload = actualData?.interview_questions_result || actualData?.interview_questions || actualData;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.questions)) return payload.questions;

  const deepSearch = (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    const found: any[] = [];
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && (value[0].question || value[0].text)) {
        found.push(...value);
      } else if (value && typeof value === 'object') {
        found.push(...deepSearch(value));
      }
    }
    return found;
  };

  return deepSearch(payload);
};

const getFlawList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const payload = data.flaw_coaching_result || data.flaw_coaching || data;
  if (Array.isArray(payload)) return payload;

  const list = payload.coaching || payload.flaws || payload.parades || payload.defauts || Object.values(payload).find((value) => Array.isArray(value));
  return Array.isArray(list) ? list : [];
};

const hasContent = (value: any) => {
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

export function StrategicProfileTab({ onNavigate }: StrategicProfileTabProps) {
  const {
    cvData,
    gapResult,
    researchResult,
    salaryResult,
    pitchResult,
    questionsResult,
    recruiterResult,
    flawCoachingResult,
    jobDecoderResult,
    actionPlanResult,
    customScenariosResult
  } = useDashboard();
  const [mode, setMode] = useState<ProfileMode>('general');

  const profile = useMemo(() => {
    const experiences = Array.isArray(cvData?.experiences) ? cvData.experiences : [];
    const simulatorScores = Object.values(cvData?.simulatorScores || {})
      .map((value) => toNumber(value))
      .filter((value) => value > 0);
    const simulatorAverage = average(simulatorScores);

    const quantifiedExperienceCount = experiences.filter((experience: any) => {
      const text = [
        experience?.title,
        experience?.role,
        experience?.description,
        experience?.achievement,
        experience?.results,
        experience?.impact
      ]
        .filter(Boolean)
        .join(' ');
      return /\d/.test(text);
    }).length;

    const pitchText =
      cvData?.editablePitch?.full_text ||
      pitchResult?.core_pitches?.three_minutes?.oral ||
      pitchResult?.core_pitches?.pitch_3min?.oral ||
      pitchResult?.pitch?.oral ||
      pitchResult?.pitch?.written ||
      '';

    const pitchCoverage = [
      cvData?.editablePitch?.written,
      cvData?.editablePitch?.oral,
      cvData?.editablePitch?.full_text,
      pitchResult?.coaching_notes?.strongest_angle,
      pitchResult?.coaching_notes?.natural_version_tip
    ].filter(hasContent).length;

    const questions = getQuestionsArray(questionsResult);
    const questionCount = questions.length;
    const flawList = getFlawList(flawCoachingResult);
    const flawCount = flawList.length;
    const recruiterPersona = recruiterResult?.recruiter_persona || {};
    const recruiterProbability = toNumber(recruiterPersona?.interview_probability);
    const recruiterRedFlags = Array.isArray(recruiterPersona?.red_flags) ? recruiterPersona.red_flags.length : 0;
    const recruiterReassurance = Array.isArray(recruiterPersona?.reassurance_points) ? recruiterPersona.reassurance_points.length : 0;

    const gapData = gapResult?.gap_analysis || gapResult || {};
    const gapScore = clamp(
      toNumber(gapData?.match_score || gapData?.score_adequation || gapData?.matchScore || gapData?.score)
    );

    const companyReport = researchResult?.company_report || {};
    const marketReport = researchResult?.market_report || {};
    const hasCompanyResearch = hasContent(companyReport);
    const hasMarketResearch = hasContent(marketReport);
    const companySignalCount = [
      companyReport?.identity_dna,
      companyReport?.hot_news,
      companyReport?.strategic_challenges,
      companyReport?.culture_environment,
      companyReport?.news_links
    ].filter(hasContent).length;

    const marketSignalCount = [
      marketReport?.tension_score,
      marketReport?.top_skills,
      marketReport?.trends,
      marketReport?.recruitment_dynamics,
      salaryResult?.salary_range
    ].filter(hasContent).length;

    const salaryRangeReady = hasContent(salaryResult?.salary_range);
    const salaryExpectationsReady = hasContent(cvData?.salary_expectations);
    const negotiationHistory = Array.isArray(cvData?.negotiationHistory) ? cvData.negotiationHistory : [];
    const negotiationAverage = average(
      negotiationHistory.map((entry: any) => toNumber(entry?.feedback?.score)).filter((value: number) => value > 0)
    );

    const scenarioCount = Array.isArray(customScenariosResult)
      ? customScenariosResult.length
      : hasContent(customScenariosResult)
        ? 1
        : 0;

    const hasJobDescription = hasContent(cvData?.job_description);
    const hasJobDecoder = hasContent(jobDecoderResult);
    const targetCompanyReady = hasContent(cvData?.target_company);
    const targetJobReady = hasContent(cvData?.target_job);

    const generalBoost = mode === 'general';
    const applicationBoost = mode === 'application';

    const clarity = clamp(
      20 +
      (pitchText ? 24 : 0) +
      Math.min(18, pitchCoverage * 4) +
      Math.min(14, questionCount * 2) +
      (simulatorAverage > 0 ? simulatorAverage * 0.18 : 0) +
      (generalBoost ? 8 : 0)
    );

    const impact = clamp(
      18 +
      Math.min(32, quantifiedExperienceCount * 10) +
      gapScore * 0.32 +
      recruiterReassurance * 5 +
      (generalBoost ? 6 : 0)
    );

    const jobFit = clamp(
      15 +
      gapScore * 0.62 +
      (hasJobDescription ? 8 : 0) +
      (hasJobDecoder ? 10 : 0) +
      (targetJobReady ? 5 : 0) +
      (applicationBoost ? 10 : 0)
    );

    const companyKnowledge = clamp(
      12 +
      (targetCompanyReady ? 10 : 0) +
      (hasCompanyResearch ? 20 : 0) +
      Math.min(18, companySignalCount * 4) +
      Math.min(12, marketSignalCount * 2) +
      (applicationBoost ? 12 : 0)
    );

    const objections = clamp(
      18 +
      (flawCount > 0 ? 18 : 0) +
      (hasJobDecoder ? 18 : 0) +
      Math.min(16, scenarioCount * 8) +
      Math.min(12, questionCount * 2) +
      (recruiterRedFlags > 0 ? 8 : 0) +
      (applicationBoost ? 8 : 0)
    );

    const leadership = clamp(
      20 +
      Math.min(18, experiences.length * 4) +
      Math.min(20, quantifiedExperienceCount * 6) +
      recruiterProbability * 0.18 +
      recruiterReassurance * 4 +
      (simulatorAverage > 0 ? simulatorAverage * 0.16 : 0) -
      recruiterRedFlags * 4 +
      (generalBoost ? 6 : 0)
    );

    const salary = clamp(
      15 +
      (salaryRangeReady ? 24 : 0) +
      (salaryExpectationsReady ? 18 : 0) +
      (negotiationAverage > 0 ? negotiationAverage * 0.25 : 0) +
      Math.min(16, negotiationHistory.length * 4)
    );

    const axisDefinitions: AxisDefinition[] = [
      {
        id: 'clarity',
        label: 'Clarté du discours',
        shortLabel: 'Clarté',
        score: clarity,
        color: colorForScore(clarity),
        level: levelForScore(clarity),
        why: pitchText
          ? 'BTCV dispose déjà d\'une base de pitch et de plusieurs signaux de formulation.'
          : 'Le discours reste peu stabilisé tant qu\'un pitch clair n\'a pas été consolidé.',
        evidence: [
          pitchText ? 'Un pitch exploitable est déjà présent dans votre profil.' : 'Aucun pitch consolidé n\'est encore visible dans le profil.',
          questionCount > 0 ? `${questionCount} questions d\'entretien sont déjà générées.` : 'Le questionnaire n\'est pas encore exploitable.',
          simulatorAverage > 0 ? `La moyenne des simulations sauvegardées est de ${Math.round(simulatorAverage)}/100.` : 'Aucune simulation notée n\'alimente encore la clarté du discours.'
        ],
        recommendationTitle: 'Structurer davantage votre message central',
        recommendationAction: 'Travailler mon pitch',
        targetTab: 'interview',
        targetAnchor: 'pitch_section'
      },
      {
        id: 'impact',
        label: 'Impact et preuves',
        shortLabel: 'Impact',
        score: impact,
        color: colorForScore(impact),
        level: levelForScore(impact),
        why: quantifiedExperienceCount > 0
          ? 'Vos réalisations commencent à être appuyées par des preuves observables.'
          : 'Vos expériences existent, mais leurs résultats restent encore peu matérialisés.',
        evidence: [
          `${quantifiedExperienceCount} expérience(s) contiennent déjà des éléments chiffrés ou objectivables.`,
          gapScore > 0 ? `Le score d\'adéquation actuel est de ${gapScore}/100.` : 'Aucun score d\'adéquation n\'est encore disponible.',
          recruiterReassurance > 0 ? `${recruiterReassurance} point(s) rassurant(s) ont déjà été relevés côté recruteur.` : 'La vue recruteur n\'a pas encore relevé de preuves particulièrement rassurantes.'
        ],
        recommendationTitle: 'Mieux prouver votre valeur ajoutée',
        recommendationAction: 'Voir mon gap et mes preuves',
        targetTab: 'market',
        targetAnchor: 'gap_section'
      },
      {
        id: 'jobFit',
        label: 'Adéquation au poste',
        shortLabel: 'Adéquation',
        score: jobFit,
        color: colorForScore(jobFit),
        level: levelForScore(jobFit),
        why: gapScore > 0
          ? 'Le positionnement sur l\'offre est déjà objectivé par une analyse structurée.'
          : 'L\'adéquation reste encore déclarative tant que le poste n\'a pas été analysé.',
        evidence: [
          hasJobDescription ? 'Une description de poste est renseignée.' : 'La description de poste manque encore.',
          gapScore > 0 ? `Analyse d\'écarts disponible avec un score de ${gapScore}/100.` : 'Aucune gap analysis n\'est encore générée.',
          hasJobDecoder ? 'Le décodeur d\'annonce est disponible pour lire les attentes cachées.' : 'Le décodeur d\'annonce n\'a pas encore été activé.'
        ],
        recommendationTitle: 'Renforcer la lecture du poste cible',
        recommendationAction: 'Analyser mon offre',
        targetTab: 'market',
        targetAnchor: 'decoder_section'
      },
      {
        id: 'companyKnowledge',
        label: 'Connaissance de l\'entreprise',
        shortLabel: 'Entreprise',
        score: companyKnowledge,
        color: colorForScore(companyKnowledge),
        level: levelForScore(companyKnowledge),
        why: hasCompanyResearch
          ? 'BTCV a déjà de la matière pour adapter votre discours à l\'entreprise cible.'
          : 'Le dossier entreprise reste encore trop léger pour une personnalisation solide.',
        evidence: [
          targetCompanyReady ? `Entreprise cible renseignée : ${cvData?.target_company}.` : 'Aucune entreprise cible n\'est encore renseignée.',
          hasCompanyResearch ? `${companySignalCount} signal(s) entreprise sont disponibles.` : 'Aucun rapport entreprise n\'est encore généré.',
          hasMarketResearch ? `${marketSignalCount} signal(s) marché complètent le contexte.` : 'Le contexte marché n\'est pas encore consolidé.'
        ],
        recommendationTitle: 'Mieux contextualiser votre discours',
        recommendationAction: 'Ouvrir les rapports entreprise et marché',
        targetTab: 'market',
        targetAnchor: 'company_section'
      },
      {
        id: 'objections',
        label: 'Gestion des objections',
        shortLabel: 'Objections',
        score: objections,
        color: colorForScore(objections),
        level: levelForScore(objections),
        why: flawCount > 0
          ? 'Vous avez déjà une base de parades, mais leur variété dépend encore des simulations.'
          : 'Le traitement des objections reste fragile tant que les parades ne sont pas explicitées.',
        evidence: [
          flawCount > 0 ? `${flawCount} parade(s) aux défauts sont déjà disponibles.` : 'Aucune parade aux défauts n\'est encore générée.',
          hasJobDecoder ? 'Le décodeur d\'annonce peut nourrir les objections probables.' : 'Les objections probables ne sont pas encore enrichies par l\'offre.',
          scenarioCount > 0 ? `${scenarioCount} source(s) de mises en situation existent déjà.` : 'Aucune mise en situation n\'alimente encore ce domaine.'
        ],
        recommendationTitle: 'Répondre plus vite aux objections sensibles',
        recommendationAction: 'Préparer mes objections',
        targetTab: 'interview',
        targetAnchor: 'flaws_section'
      },
      {
        id: 'leadership',
        label: 'Posture et leadership',
        shortLabel: 'Leadership',
        score: leadership,
        color: colorForScore(leadership),
        level: levelForScore(leadership),
        why: recruiterProbability > 0
          ? 'Votre posture commence à être testée par des signaux recruteur et des simulations.'
          : 'Le leadership reste encore peu observable sans simulations et sans regard recruteur.',
        evidence: [
          `${experiences.length} expérience(s) alimentent actuellement le profil.`,
          recruiterProbability > 0 ? `Probabilité d\'entretien vue recruteur : ${recruiterProbability}%.` : 'La vue recruteur n\'a pas encore été calculée.',
          simulatorAverage > 0 ? `Moyenne actuelle des simulations : ${Math.round(simulatorAverage)}/100.` : 'Aucune simulation notée ne permet encore de consolider la posture.'
        ],
        recommendationTitle: 'Montrer davantage votre capacité à tenir le poste',
        recommendationAction: 'Lancer une simulation ciblée',
        targetTab: 'training',
        targetAnchor: 'training_mes_section'
      },
      {
        id: 'salary',
        label: 'Négociation salariale',
        shortLabel: 'Salaire',
        score: salary,
        color: colorForScore(salary),
        level: levelForScore(salary),
        why: salaryRangeReady
          ? 'Le positionnement marché existe déjà, il reste à mieux l\'argumenter si besoin.'
          : 'La négociation reste fragile sans repère de marché ni formulation claire de vos attentes.',
        evidence: [
          salaryRangeReady ? 'Une fourchette salariale issue du marché est disponible.' : 'Aucune fourchette salariale n\'est encore disponible.',
          salaryExpectationsReady ? `Prétentions renseignées : ${cvData?.salary_expectations}.` : 'Vos prétentions salariales ne sont pas encore renseignées.',
          negotiationAverage > 0 ? `Moyenne des négociations entraînées : ${Math.round(negotiationAverage)}/100.` : 'Aucune simulation de négociation n\'alimente encore cet axe.'
        ],
        recommendationTitle: 'Mieux défendre votre positionnement de valeur',
        recommendationAction: 'Préparer ma négo',
        targetTab: 'market',
        targetAnchor: 'market_section'
      }
    ];

    const averageScore = Math.round(average(axisDefinitions.map((axis) => axis.score)));
    const readinessLabel = averageScore >= 75 ? 'Solide' : averageScore >= 55 ? 'En progression' : 'À cadrer';

    return {
      axes: axisDefinitions,
      averageScore,
      readinessLabel,
      facts: [
        targetJobReady ? `Poste cible : ${cvData?.target_job}` : null,
        targetCompanyReady ? `Entreprise cible : ${cvData?.target_company}` : null,
        experiences.length > 0 ? `${experiences.length} expérience(s) structurée(s)` : null,
        salaryExpectationsReady ? `Prétentions : ${cvData?.salary_expectations}` : null,
        hasJobDescription ? 'Annonce renseignée' : null,
        recruiterProbability > 0 ? `Probabilité d'entretien recruteur : ${recruiterProbability}%` : null
      ].filter(Boolean) as string[]
    };
  }, [
    mode,
    cvData,
    gapResult,
    researchResult,
    salaryResult,
    pitchResult,
    questionsResult,
    recruiterResult,
    flawCoachingResult,
    jobDecoderResult,
    actionPlanResult,
    customScenariosResult
  ]);

  const priorities = useMemo(() => {
    return [...profile.axes].sort((a, b) => a.score - b.score).slice(0, 3);
  }, [profile.axes]);

  const strengths = useMemo(() => {
    const positive = [...profile.axes].sort((a, b) => b.score - a.score);
    return positive.filter((axis) => axis.score >= 70).slice(0, 3).length
      ? positive.filter((axis) => axis.score >= 70).slice(0, 3)
      : positive.slice(0, 3);
  }, [profile.axes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <DashboardCard
        title="Profil stratégique évolutif"
        icon={<Sparkles size={24} />}
        headerAction={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn-outline ${mode === 'general' ? 'active' : ''}`}
              onClick={() => setMode('general')}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              Profil général
            </button>
            <button
              className={`btn-outline ${mode === 'application' ? 'active' : ''}`}
              onClick={() => setMode('application')}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              Candidature active
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Niveau actuel</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>{profile.readinessLabel}</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.92rem' }}>Score synthétique : {profile.averageScore}/100</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Lecture du profil</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>Continue</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.92rem' }}>Le profil se précise au fil des simulations, des réponses et des analyses déjà réalisées dans BTCV.</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Mise à jour</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>Dynamique</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.92rem' }}>Les recommandations et les domaines évoluent selon vos nouveaux exercices et la qualité des signaux observés.</div>
          </div>
        </div>
      </DashboardCard>

      <div id="profile_graph_section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <DashboardCard title="Vue rapide des domaines" icon={<BarChart3 size={24} />}>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsRadarChart data={profile.axes} outerRadius="68%">
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="shortLabel" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="var(--primary)" fill="rgba(109, 190, 247, 0.35)" fillOpacity={1} />
              </RechartsRadarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Le radar donne la forme globale du profil. Les domaines les plus faibles doivent être lus avec les recommandations juste en dessous, pas comme une note définitive.
          </p>
        </DashboardCard>

        <DashboardCard title="Lecture plus précise" icon={<Activity size={24} />}>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profile.axes} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip formatter={(value: any) => [`${value}/100`, 'Score']} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]}>
                  {profile.axes.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <div id="profile_priorities_section">
        <DashboardCard title="Vos trois priorités" icon={<Target size={24} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {priorities.map((axis, index) => (
              <div key={axis.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: `4px solid ${axis.color}`, borderRadius: '1rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: axis.color, marginBottom: '0.35rem' }}>Priorité {index + 1}</div>
                  <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}>{axis.recommendationTitle}</h4>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.55 }}>{axis.why}</div>
                <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.92rem' }}>
                  Domaine concerné : {axis.label} · {axis.level} ({axis.score}/100)
                </div>
                <button className="btn-primary" onClick={() => onNavigate(axis.targetTab, axis.targetAnchor)} style={{ alignSelf: 'flex-start', padding: '0.65rem 1rem' }}>
                  {axis.recommendationAction}
                </button>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div id="profile_strengths_section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <DashboardCard title="Forces à exploiter" icon={<TrendingUp size={24} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {strengths.map((axis) => (
              <div key={axis.id} style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.18)', borderRadius: '1rem', padding: '1rem 1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    <CheckCircle2 size={18} color="#10b981" /> {axis.label}
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 800 }}>{axis.score}/100</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55 }}>{axis.why}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Référentiel factuel" icon={<Compass size={24} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {profile.facts.length > 0 ? profile.facts.map((fact) => (
              <div key={fact} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.85rem', padding: '0.9rem 1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                {fact}
              </div>
            )) : (
              <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.85rem', padding: '1rem', color: 'var(--text-muted)' }}>
                Complétez davantage votre profil et générez quelques modules BTCV pour enrichir ce référentiel.
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      <div id="profile_details_section">
        <DashboardCard title="Détail par domaine" icon={<Eye size={24} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {profile.axes.map((axis) => (
              <div key={axis.id} style={{ border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.15rem', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{axis.label}</div>
                    <div style={{ color: axis.color, fontWeight: 700, fontSize: '0.9rem' }}>{axis.level}</div>
                  </div>
                  <div style={{ minWidth: '62px', textAlign: 'right', fontWeight: 800, color: axis.color }}>{axis.score}/100</div>
                </div>

                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.9rem' }}>
                  <div style={{ width: `${axis.score}%`, height: '100%', background: axis.color }} />
                </div>

                <p style={{ margin: '0 0 0.9rem 0', color: 'var(--text-muted)', lineHeight: 1.55 }}>{axis.why}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1rem' }}>
                  {axis.evidence.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: axis.color, marginTop: '0.42rem', flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <button className="btn-outline" onClick={() => onNavigate(axis.targetTab, axis.targetAnchor)} style={{ padding: '0.55rem 0.9rem' }}>
                  {axis.recommendationAction}
                </button>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="Principe de fonctionnement" icon={<Lightbulb size={24} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}><Briefcase size={18} color="var(--primary)" /> Faits confirmés</div>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55 }}>Le référentiel reprend ce que vous avez renseigné ou ce que BTCV a déjà généré de manière stable.</p>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}><ShieldAlert size={18} color="#f59e0b" /> Observations BTCV</div>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55 }}>Les faiblesses affichées sont formulées comme des observations de coaching, pas comme des étiquettes figées.</p>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}><Zap size={18} color="#10b981" /> Recommandations actionnables</div>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.55 }}>Chaque priorité renvoie vers un module concret de BTCV pour transformer le diagnostic en entraînement utile.</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}