import React, { useState, useEffect } from 'react';
import { CheckSquare, Circle, CheckCircle2, ChevronRight } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface ActionItem {
  task: string;
  advice: string;
}

export function ToDoListCard({ data, loading, error }: { data: any, loading?: boolean, error?: boolean }) {
  const [checkedItems, setCheckedItems] = useState<number[]>(() => {
    const saved = localStorage.getItem("checkedActionPlan");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("checkedActionPlan", JSON.stringify(checkedItems));
  }, [checkedItems]);

  if (error) return null;
  
  const payload = data?.action_plan_result || data;
  const actions: ActionItem[] = payload?.action_plan || [];

  if (!loading && actions.length === 0) return null;

  const progress = actions.length > 0 ? Math.round((checkedItems.length / actions.length) * 100) : 0;

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <DashboardCard
      title="Plan d'Action (To-Do List)"
      icon={<CheckSquare size={24} />}
      loading={loading}
      loadingText="Génération de votre plan d'action personnalisé..."
      featureId="action_plan"
      className="col-span-3"
    >
      {actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress Bar */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: progress === 100 ? 'var(--success)' : 'var(--primary)', width: '60px', textAlign: 'right' }}>
              {progress}%
            </div>
            <div style={{ flex: 1, height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.5s ease-out, background 0.5s' }}></div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Préparation</div>
          </div>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {actions.map((item, idx) => {
              const isChecked = checkedItems.includes(idx);
              return (
                <div key={idx} onClick={() => toggleCheck(idx)} style={{ background: isChecked ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-card)', border: `1px solid ${isChecked ? 'var(--success)' : 'var(--border-color)'}`, padding: '1.25rem', borderRadius: '0.75rem', display: 'flex', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isChecked ? 'none' : '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ marginTop: '2px', color: isChecked ? 'var(--success)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                    {isChecked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: isChecked ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isChecked ? 'line-through' : 'none', marginBottom: '0.5rem', transition: 'all 0.2s' }}>{item.task}</div>
                    <div style={{ fontSize: '0.85rem', color: isChecked ? 'var(--text-muted)' : 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', opacity: isChecked ? 0.6 : 1 }}>
                      <ChevronRight size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: '1.5' }}>{item.advice}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}