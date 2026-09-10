import React, { ReactNode } from 'react';
import { useModuleContext, ModuleType } from '../../context/ModuleContext';
import './Button.css';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  module?: ModuleType;
  label?: string;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  module: propModule,
  label,
  className = ''
}: SegmentedControlProps<T>) {
  const { module: contextModule } = useModuleContext();
  const activeModule = propModule || contextModule || 'overview';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }} className={className}>
      {label && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </span>
      )}
      <div className="btcv-segmented-control">
        {options.map((opt) => {
          const isActive = opt.value === value;
          const chipClasses = [
            'btcv-chip',
            isActive ? `btcv-chip--active btcv-mod--${activeModule}` : ''
          ].filter(Boolean).join(' ');

          return (
            <button
              key={opt.value}
              type="button"
              className={chipClasses}
              onClick={() => onChange(opt.value)}
            >
              {opt.icon && <span className="btcv-btn-icon">{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentedControl;
