import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Zap, Loader2, AlertTriangle, Target, MessageCircle, Shield, Star, CheckSquare, Clock, ChevronsRight, ChevronsLeft, UserCheck, LifeBuoy, History, Eye, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { BulletList } from './BulletList';
import { Button } from './common';

export interface RoadmapSelection {
  type: string;
  interlocutor: string;
  level: string;
  context: string;
}

export interface RoadmapHistoryItem {
  id: string;
  createdAt: string;
  selections: RoadmapSelection;
  result: any;
}

export function getTypeLabels(t: (key: string) => string): Record<string, string> {
  return {
    visio: t('interview_format_visio'),
    presentiel: t('interview_format_presentiel'),
    telephone: t('interview_format_telephone'),
  };
}

export function getInterlocutorLabels(t: (key: string) => string): Record<string, string> {
  return {
    rh: t('interview_type_rh'),
    manager: t('interview_type_manager'),
    dg: t('interview_type_dg'),
    cabinet: t('interview_type_cabinet'),
  };
}

export function getLevelLabels(t: (key: string) => string): Record<string, string> {
  return {
    junior: t('level_junior'),
    mid: t('level_mid'),
    senior: t('level_senior'),
    director: t('level_director'),
  };
}

export function getContextLabels(t: (key: string) => string): Record<string, string> {
  return {
    first_interview: t('context_first_interview'),
    final_interview: t('context_final_interview'),
    negotiation: t('context_negotiation'),
    reconversion: t('context_reconversion'),
  };
}

export function formatRoadmapLabel(selections: RoadmapSelection, t: (key: string) => string): string {
  const typeLabels = getTypeLabels(t);
  const interlocutorLabels = getInterlocutorLabels(t);
  const levelLabels = getLevelLabels(t);
  const contextLabels = getContextLabels(t);
  return [
    typeLabels[selections.type] || selections.type,
    interlocutorLabels[selections.interlocutor] || selections.interlocutor,
    levelLabels[selections.level] || selections.level,
    contextLabels[selections.context] || selections.context,
  ].join(' · ');
}

export async function generateRoadmap(cvData: any, selections: RoadmapSelection): Promise<any> {
  const response = await authenticatedFetch(`${API_BASE_URL}/cv/generate-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: selections,
      profile: cvData,
    }),
  });

  if (!response.ok) {
    throw new Error('La génération de la feuille de route a échoué. Veuillez réessayer.');
  }

  const data = await response.json();
  return data.roadmap;
}

interface RoadmapGeneratorProps {
  cvData: any;
  history?: RoadmapHistoryItem[];
  onHistoryChange?: (history: RoadmapHistoryItem[]) => void;
}

export const RoadmapGenerator: React.FC<RoadmapGeneratorProps> = ({ cvData, history = [], onHistoryChange }) => {
  const { t } = useTranslation();
  const typeLabels = getTypeLabels(t);
  const interlocutorLabels = getInterlocutorLabels(t);
  const levelLabels = getLevelLabels(t);
  const contextLabels = getContextLabels(t);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<any | null>(null);

  const [selections, setSelections] = useState<RoadmapSelection>({
    type: cvData?.interview_format || 'visio',
    interlocutor: cvData?.interview_type || 'manager',
    level: cvData?.seniority_level || 'mid',
    context: 'first_interview',
  });

  const handleChange = (field: keyof RoadmapSelection, value: string) => {
    setSelections(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setActiveResult(null);

    try {
      const result = await generateRoadmap(cvData, selections);
      const item: RoadmapHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        selections: { ...selections },
        result,
      };
      const nextHistory = [item, ...history];
      onHistoryChange?.(nextHistory);
      setActiveResult(result);
    } catch (err: any) {
      setError(t('roadmap_generate_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const nextHistory = history.filter(h => h.id !== id);
    onHistoryChange?.(nextHistory);
    if (activeResult && history.find(h => h.result === activeResult)?.id === id) {
      setActiveResult(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(t('date_locale'), { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      t('date_at') + d.toLocaleTimeString(t('date_locale'), { hour: '2-digit', minute: '2-digit' });
  };

  const SelectField = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: { value: string, label: string }[] }) => (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</label>
      <select value={value} onChange={onChange} className="select-input" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.375rem', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );

  const RoadmapSection = ({ title, icon, children, color = 'var(--text-main)' }: { title: string, icon: React.ReactNode, children: React.ReactNode, color?: string }) => (
    <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
      <h4 style={{ fontWeight: 'bold', color, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}>{icon} {title}</h4>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.25rem' }}>
        {children}
      </div>
    </div>
  );

  const renderResult = (result: any) => (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', color: 'var(--primary)' }}>{result.title}</h3>

      <RoadmapSection title={t('roadmap_recruiter_focus')} icon={<Target size={18} />} color="var(--primary)">
        <p style={{ fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>{t('roadmap_recruiter_focus_sub')}</p>
        <BulletList items={result.recruiter_focus || []} />
      </RoadmapSection>

      <RoadmapSection title={t('roadmap_key_messages')} icon={<MessageCircle size={18} />} color="var(--success)">
        <p style={{ fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '0.5rem' }}>{t('roadmap_key_messages_sub')}</p>
        <BulletList items={result.key_messages || []} />
      </RoadmapSection>

      <RoadmapSection title={t('roadmap_golden_rules')} icon={<Star size={18} />} color="var(--warning)">
        <BulletList items={result.golden_rules || []} />
      </RoadmapSection>

      <RoadmapSection title={t('roadmap_mistakes')} icon={<Shield size={18} />} color="var(--danger)">
        <BulletList items={result.mistakes_to_avoid || []} />
      </RoadmapSection>

      <RoadmapSection title={t('roadmap_checklist')} icon={<CheckSquare size={18} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> {t('roadmap_checklist_24h')}</h5><BulletList items={result.pre_interview_checklist?.h_minus_24 || []} /></div>
          <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> {t('roadmap_checklist_1h')}</h5><BulletList items={result.pre_interview_checklist?.h_minus_1 || []} /></div>
          <div><h5 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={16}/> {t('roadmap_checklist_5min')}</h5><BulletList items={result.pre_interview_checklist?.h_minus_5 || []} /></div>
        </div>
      </RoadmapSection>

      <RoadmapSection title={t('roadmap_opening')} icon={<ChevronsRight size={18} />}>
        <p style={{ fontStyle: 'italic' }}>"{result.opening_statement}"</p>
      </RoadmapSection>
      <RoadmapSection title={t('roadmap_closing')} icon={<ChevronsLeft size={18} />}>
        <p style={{ fontStyle: 'italic' }}>"{result.closing_statement}"</p>
      </RoadmapSection>
      <RoadmapSection title={t('roadmap_posture')} icon={<UserCheck size={18} />}>
        <p>{result.posture_advice}</p>
      </RoadmapSection>

      {result.contingency_plan && result.contingency_plan.length > 0 && (
        <RoadmapSection title={t('roadmap_contingency')} icon={<LifeBuoy size={18} />} color="var(--warning)">
          {result.contingency_plan.map((plan: any, index: number) => (
            <div key={index} style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '1rem', marginBottom: '1rem' }}><strong>{plan.situation}:</strong> {plan.action}<br/><em>{t('roadmap_ready_message')}: "{plan.ready_to_send_message}"</em></div>
          ))}
        </RoadmapSection>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <SelectField
          label={t('interview_type_label')}
          value={selections.type}
          onChange={(e) => handleChange('type', e.target.value)}
          options={[
            { value: 'visio', label: typeLabels.visio },
            { value: 'presentiel', label: typeLabels.presentiel },
            { value: 'telephone', label: typeLabels.telephone },
          ]}
        />
        <SelectField
          label={t('interview_interlocutor_label')}
          value={selections.interlocutor}
          onChange={(e) => handleChange('interlocutor', e.target.value)}
          options={[
            { value: 'rh', label: interlocutorLabels.rh },
            { value: 'manager', label: interlocutorLabels.manager },
            { value: 'dg', label: interlocutorLabels.dg },
            { value: 'cabinet', label: interlocutorLabels.cabinet },
          ]}
        />
        <SelectField
          label={t('level_label')}
          value={selections.level}
          onChange={(e) => handleChange('level', e.target.value)}
          options={[
            { value: 'junior', label: levelLabels.junior },
            { value: 'mid', label: levelLabels.mid },
            { value: 'senior', label: levelLabels.senior },
            { value: 'director', label: levelLabels.director },
          ]}
        />
        <SelectField
          label={t('context_label')}
          value={selections.context}
          onChange={(e) => handleChange('context', e.target.value)}
          options={[
            { value: 'first_interview', label: contextLabels.first_interview },
            { value: 'final_interview', label: contextLabels.final_interview },
            { value: 'negotiation', label: contextLabels.negotiation },
            { value: 'reconversion', label: contextLabels.reconversion },
          ]}
        />
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="primary"
          module="progress"
          onClick={handleGenerate}
          disabled={loading}
          isLoading={loading}
          icon={<Zap size={18} />}
        >
          {t('generate_plan')}
        </Button>
        {activeResult && (
          <button onClick={() => setActiveResult(null)} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
            {t('hide_result')}
          </button>
        )}
      </div>

      {activeResult && renderResult(activeResult)}

      {history.length > 0 && (
        <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontSize: '1rem' }}>
            <History size={18} /> {t('roadmap_history_title')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveResult(item.result)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <Eye size={16} color="var(--primary)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatRoadmapLabel(item.selections, t)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {t('generated_on')} {formatDate(item.createdAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem', borderRadius: '0.35rem' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  title={t('delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapGenerator;
