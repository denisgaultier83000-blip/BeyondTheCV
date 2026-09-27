import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Video, Phone, Users, Coffee, Award, UserCog, Map as MapIcon,
  X, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, ChevronsRight, ChevronsLeft, UserCheck, Clock, Check, LifeBuoy,
  HelpCircle, Eye, WifiOff, PhoneMissed, VolumeX, BrainCircuit, DollarSign, Send, CheckSquare,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { DashboardCard } from './DashboardCard';
import RoadmapGeneratorModal from './RoadmapGeneratorModal';
export { RoadmapGeneratorModal };

type PostureTrainingEntry = {
  id: string;
  mode: 'manual' | 'voice' | 'video';
  title: string;
  summary: string;
  date: string;
  fileName?: string;
};

function getPostureTrainingEntries(): PostureTrainingEntry[] {
  try {
    const raw = localStorage.getItem('btcv_posture_sessions');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function PostureDataCard() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<PostureTrainingEntry[]>(() => getPostureTrainingEntries());

  useEffect(() => {
    const sync = () => setSessions(getPostureTrainingEntries());
    sync();
    window.addEventListener('btcv-posture-updated', sync);
    return () => window.removeEventListener('btcv-posture-updated', sync);
  }, []);

  const goToTraining = () => {
    window.dispatchEvent(new CustomEvent('btcv-go-training'));
  };

  return (
    <DashboardCard
      title={t('posture_data_title')}
      icon={<Award size={24} />}
      id="posture_data_section"
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('posture_data_desc')}
      </p>

      {sessions.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('posture_no_data')}</p>
          <button onClick={goToTraining} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
            {t('train')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {sessions.map((session) => (
            <div key={session.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.9rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{session.title}</span>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.08)', padding: '0.3rem 0.5rem', borderRadius: '999px' }}>
                  {session.mode === 'video' ? t('mode_video') : session.mode === 'voice' ? t('mode_voice') : t('mode_manual')}
                </span>
              </div>
              <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{session.summary}</p>
              {session.fileName && (
                <p style={{ margin: '0 0 0.8rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t('file_colon')} {session.fileName}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(session.date).toLocaleDateString(t('date_locale'))}</span>
                <button onClick={goToTraining} className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}>
                  {t('train')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

export function LastHourChecklistCard() {
  const { t } = useTranslation();
  const items = t('last_hour_checklist_items', { returnObjects: true }) as string[];
  return (
    <DashboardCard
      title={t('last_hour_title')}
      icon={<Clock size={24} />}
      id="last_hour_section"
      featureId="last_hour_checklist"
      feedbackQuestion={t('last_hour_feedback')}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('last_hour_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {(Array.isArray(items) ? items : []).map((item, index) => (
          <div key={index} style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Check size={18} color="var(--primary)" />
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item}</span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function StrategicQuestionsCard() {
  const { t } = useTranslation();
  const questions = t('strategic_questions_groups', { returnObjects: true }) as Array<{ icon: string; title: string; items: string[] }>;
  const iconMap: Record<string, React.ReactNode> = {
    rh: <Users size={20} />,
    manager: <UserCog size={20} />,
    director: <Award size={20} />,
  };
  return (
    <DashboardCard
      title={t('strategic_questions_title')}
      icon={<HelpCircle size={24} />}
      id="strategic_questions_section"
      featureId="strategic_questions"
      feedbackQuestion={t('strategic_questions_feedback')}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('strategic_questions_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {(Array.isArray(questions) ? questions : []).map((group, index) => (
          <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>{iconMap[group.icon] || null} {group.title}</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
              {(group.items || []).map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function SignalsToObserveCard() {
  const { t } = useTranslation();
  const signals = t('signals_to_observe_items', { returnObjects: true }) as string[];
  return (
    <DashboardCard
      title={t('signals_to_observe_title')}
      icon={<Eye size={24} />}
      id="signals_section"
      featureId="signals_to_observe"
      feedbackQuestion={t('signals_to_observe_feedback')}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('signals_to_observe_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {(Array.isArray(signals) ? signals : []).map((item, index) => (
          <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 500 }}>
            {item}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function PostureGuidesCard() {
  const { t } = useTranslation();
  const guides = t('posture_guides', { returnObjects: true }) as Array<{ icon: string; title: string; desc: string }>;
  const iconMap: Record<string, React.ReactNode> = {
    video: <Video />,
    manager: <Users />,
    rh: <UserCheck />,
    coffee: <Coffee />,
    phone: <Phone />,
    salary: <Award />,
  };
  return (
    <DashboardCard
      title={t('posture_guides_title')}
      icon={<UserCog size={24} />}
      id="posture_guides_section"
      featureId="posture_guides"
      feedbackQuestion={t('posture_guides_feedback')}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {(Array.isArray(guides) ? guides : []).map((item, index) => (
          <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--primary)', marginTop: '4px', flexShrink: 0 }}>{iconMap[item.icon] ? React.cloneElement(iconMap[item.icon] as React.ReactElement, { size: 22 }) : null}</div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem' }}>{item.title}</h4>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function ContingencyPlanCard() {
  const { t } = useTranslation();
  const plans = t('contingency_plans', { returnObjects: true }) as Array<{ icon: string; title: string; content: string }>;
  const iconMap: Record<string, React.ReactNode> = {
    wifi: <WifiOff />,
    clock: <Clock />,
    phoneMissed: <PhoneMissed />,
    volume: <VolumeX />,
    brain: <BrainCircuit />,
    shield: <Shield />,
    dollar: <DollarSign />,
    help: <HelpCircle />,
    send: <Send />,
  };
  return (
    <DashboardCard
      title={t('contingency_plan_title')}
      icon={<LifeBuoy size={24} />}
      id="contingency_plan_section"
      featureId="contingency_plan"
      feedbackQuestion={t('contingency_plan_feedback')}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
        {t('contingency_plan_desc')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {(Array.isArray(plans) ? plans : []).map((item, index) => (
          <div key={index} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: 'var(--primary)', flexShrink: 0 }}>{iconMap[item.icon] ? React.cloneElement(iconMap[item.icon] as React.ReactElement, { size: 20 }) : null}</div>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1rem' }}>{item.title}</h4>
            </div>
            <div style={{ 
              background: 'var(--bg-card)', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              border: '1px dashed var(--border-color)', 
              whiteSpace: 'pre-wrap', 
              fontSize: '0.9rem', 
              color: 'var(--text-muted)',
              flexGrow: 1
            }}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export default function PostureTab() {
  const { t } = useTranslation();
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      <PostureDataCard />

      <DashboardCard
        title={t('posture_generator_title')}
        icon={<MapIcon size={24} />}
        id="roadmap_section"
        featureId="roadmap_generator"
        feedbackQuestion={t('roadmap_feedback_question')}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          {t('roadmap_generator_desc')}
        </p>
        <button onClick={() => setIsRoadmapModalOpen(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapIcon size={20} />
          {t('open_roadmap_generator')}
        </button>
      </DashboardCard>

      <StrategicQuestionsCard />
      <SignalsToObserveCard />
      <PostureGuidesCard />
      <LastHourChecklistCard />
      <ContingencyPlanCard />

      {isRoadmapModalOpen && <RoadmapGeneratorModal onClose={() => setIsRoadmapModalOpen(false)} />}
    </div>
  );
}
