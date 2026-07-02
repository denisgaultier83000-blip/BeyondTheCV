import React from 'react';
import { CheckCircle2, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

interface BulletListProps {
  items: (string | React.ReactNode)[];
  type?: 'success' | 'danger' | 'neutral' | 'action';
  className?: string;
}

const iconMap = {
  success: { icon: CheckCircle2, color: 'var(--success)' },
  danger: { icon: AlertTriangle, color: 'var(--danger-text)' },
  neutral: { icon: ChevronRight, color: 'var(--primary)' },
  action: { icon: Zap, color: 'var(--warning)' },
};

export const BulletList: React.FC<BulletListProps> = ({ items, type = 'neutral', className = '' }) => {
  if (!items || items.length === 0) {
    return null;
  }

  const { icon: Icon, color } = iconMap[type];

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className={className}>
      {items.map((item, index) => (
        <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', lineHeight: 1.5 }}>
          <Icon 
            size={18} 
            color={color} 
            style={{ flexShrink: 0, marginTop: '3px' }} 
          />
          <span style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
};