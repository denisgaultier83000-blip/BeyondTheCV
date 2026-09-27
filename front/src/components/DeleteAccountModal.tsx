import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Trash2, History, FileText, Dumbbell, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string>('job_found');
  const [comments, setComments] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, comments }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || t('delete_account_error'));
      }

      // Purge du stockage local
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('btcv_user');

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || t('delete_account_generic_error'));
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle} aria-label={t('close')}>
          <X size={20} />
        </button>

        <div style={headerIconStyle}>
          <AlertTriangle size={32} color="#ef4444" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', textAlign: 'center' }}>
          {t('delete_account_title')}
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', textAlign: 'center', lineHeight: '1.4' }}>
          {t('delete_account_warning')}
        </p>

        <div style={lossContainerStyle}>
          <div style={lossItemStyle}>
            <History size={16} color="#ef4444" />
            <span dangerouslySetInnerHTML={{ __html: t('delete_account_loss_history') }} />
          </div>
          <div style={lossItemStyle}>
            <FileText size={16} color="#ef4444" />
            <span dangerouslySetInnerHTML={{ __html: t('delete_account_loss_applications') }} />
          </div>
          <div style={lossItemStyle}>
            <Dumbbell size={16} color="#ef4444" />
            <span dangerouslySetInnerHTML={{ __html: t('delete_account_loss_subscription') }} />
          </div>
          <div style={lossItemStyle}>
            <Trash2 size={16} color="#ef4444" />
            <span dangerouslySetInnerHTML={{ __html: t('delete_account_loss_documents') }} />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {t('delete_account_reason_label')}
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={selectStyle}
          >
            <option value="job_found">{t('delete_reason_job_found')}</option>
            <option value="too_expensive">{t('delete_reason_too_expensive')}</option>
            <option value="not_relevant">{t('delete_reason_not_relevant')}</option>
            <option value="other">{t('delete_reason_other')}</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            {t('delete_account_comments_label')}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={t('delete_account_comments_placeholder')}
            rows={3}
            style={textareaStyle}
          />
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={cancelBtnStyle}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={confirmBtnStyle}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" style={{ marginRight: '0.4rem' }} />
                {t('delete_account_deleting')}
              </>
            ) : (
              t('delete_account_confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.8)',
  backdropFilter: 'blur(6px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card, #ffffff)',
  padding: '2rem',
  borderRadius: '1rem',
  width: '100%',
  maxWidth: '540px',
  border: '1px solid var(--border-color, #e2e8f0)',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
  position: 'relative',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1.25rem',
  right: '1.25rem',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted, #64748b)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerIconStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1rem auto',
};

const lossContainerStyle: React.CSSProperties = {
  background: 'var(--bg-secondary, #f8fafc)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderRadius: '0.75rem',
  padding: '1rem',
  marginBottom: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

const lossItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.83rem',
  color: 'var(--text-main, #1e293b)',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border-color, #cbd5e1)',
  background: 'var(--bg-card, #ffffff)',
  color: 'var(--text-main, #1e293b)',
  fontSize: '0.9rem',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border-color, #cbd5e1)',
  background: 'var(--bg-card, #ffffff)',
  color: 'var(--text-main, #1e293b)',
  fontSize: '0.85rem',
  resize: 'vertical',
  outline: 'none',
};

const errorStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#ef4444',
  padding: '0.6rem 0.8rem',
  borderRadius: '0.5rem',
  fontSize: '0.85rem',
  marginBottom: '1rem',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border-color, #cbd5e1)',
  background: 'transparent',
  color: 'var(--text-main, #475569)',
  fontWeight: 600,
  cursor: 'pointer',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: '#ef4444',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

export default DeleteAccountModal;