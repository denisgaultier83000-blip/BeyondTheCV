import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, AlertCircle, HelpCircle } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';

export interface MessageDeliveryState {
  key_message_id?: string;
  headline: string;
  supporting_fact?: string;
  delivered: boolean;
  reason_if_not_delivered?: string;
  candidate_comment?: string;
}

interface DebriefKeyMessagesChecklistProps {
  applicationId?: string;
  debriefId?: string;
  initialDeliveries?: MessageDeliveryState[];
  onChange: (deliveries: MessageDeliveryState[]) => void;
}

const UNPLACED_REASONS = [
  { value: 'pas_occasion', label: "Pas eu d'occasion naturelle" },
  { value: 'oublie', label: "Oublié pendant l'échange" },
  { value: 'volontairement_ecarte', label: "Volontairement écarté" },
  { value: 'conversation_trop_courte', label: "Conversation trop courte" },
  { value: 'pas_pertinent', label: "Pas pertinent au vu du sujet" },
  { value: 'autre', label: "Autre raison" },
];

export const DebriefKeyMessagesChecklist: React.FC<DebriefKeyMessagesChecklistProps> = ({
  applicationId,
  debriefId,
  initialDeliveries = [],
  onChange
}) => {
  const [deliveries, setDeliveries] = useState<MessageDeliveryState[]>(initialDeliveries);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialDeliveries && initialDeliveries.length > 0) {
      setDeliveries(initialDeliveries);
    } else if (applicationId) {
      fetchApplicationMessages();
    }
  }, [applicationId, initialDeliveries]);

  const fetchApplicationMessages = async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/differentiators/applications/${applicationId}/key-messages`);
      if (res.ok) {
        const data = await res.json();
        const keyMessages = data.key_messages || [];
        const mapped: MessageDeliveryState[] = keyMessages.map((km: any) => ({
          key_message_id: km.id,
          headline: km.headline,
          supporting_fact: km.supporting_fact,
          delivered: true,
          reason_if_not_delivered: '',
          candidate_comment: ''
        }));
        setDeliveries(mapped);
        onChange(mapped);
      }
    } catch (e) {
      console.error("Error fetching key messages for debrief:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDelivery = (index: number) => {
    const updated = [...deliveries];
    updated[index].delivered = !updated[index].delivered;
    if (updated[index].delivered) {
      updated[index].reason_if_not_delivered = '';
    } else if (!updated[index].reason_if_not_delivered) {
      updated[index].reason_if_not_delivered = 'pas_occasion';
    }
    setDeliveries(updated);
    onChange(updated);
  };

  const handleReasonChange = (index: number, reason: string) => {
    const updated = [...deliveries];
    updated[index].reason_if_not_delivered = reason;
    setDeliveries(updated);
    onChange(updated);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updated = [...deliveries];
    updated[index].candidate_comment = comment;
    setDeliveries(updated);
    onChange(updated);
  };

  if (loading) {
    return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chargement des marqueurs clés à vérifier...</div>;
  }

  if (deliveries.length === 0) {
    return (
      <div style={{ padding: '0.85rem', background: 'var(--bg-input)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Aucun marqueur différenciant sélectionné pour cette candidature.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem', background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Target size={18} color="#10b981" /> Marqueurs que vous vouliez faire passer
      </h4>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Cochez les éléments que vous avez réussi à placer et indiquez pourquoi les autres n'ont pas pu l'être.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {deliveries.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => handleToggleDelivery(idx)}>
              <input
                type="checkbox"
                checked={item.delivered}
                onChange={() => {}} // Handled by div click
                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.92rem', color: item.delivered ? 'var(--text-main)' : 'var(--text-muted)', textDecoration: item.delivered ? 'none' : 'none' }}>
                {item.headline} {item.supporting_fact ? `— (${item.supporting_fact})` : ''}
              </span>
            </div>

            {!item.delivered && (
              <div style={{ marginTop: '0.75rem', paddingLeft: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '0.25rem' }}>
                  Pourquoi n'avez-vous pas placé cet élément ?
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '0.375rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '0.4rem' }}
                  value={item.reason_if_not_delivered || 'pas_occasion'}
                  onChange={(e) => handleReasonChange(idx, e.target.value)}
                >
                  {UNPLACED_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Commentaire ou ressenti libre (facultatif)..."
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.82rem', borderRadius: '0.375rem', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                  value={item.candidate_comment || ''}
                  onChange={(e) => handleCommentChange(idx, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
