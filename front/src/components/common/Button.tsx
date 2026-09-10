import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { useModuleContext, ModuleType } from '../../context/ModuleContext';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  module?: ModuleType;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  module: propModule,
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const { module: contextModule } = useModuleContext();
  const activeModule = propModule || contextModule || 'overview';

  const classes = [
    'btcv-btn',
    `btcv-btn--${variant}`,
    `btcv-btn--${size}`,
    `btcv-mod--${activeModule}`,
    fullWidth ? 'btcv-btn--full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="btcv-btn-icon spin" style={{ display: 'inline-block' }}>
          ⌛
        </span>
      ) : icon ? (
        <span className="btcv-btn-icon">{icon}</span>
      ) : null}
      <span>{children}</span>
      {iconRight && !isLoading && <span className="btcv-btn-icon">{iconRight}</span>}
    </button>
  );
};

export default Button;
