import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Step } from './Header';

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (id: number) => void;
  orientation: 'horizontal' | 'vertical';
  navigationMode?: boolean;
  completedStepIds?: number[];
}

const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep, onStepClick, orientation, navigationMode = false, completedStepIds = [] }) => {
  const isVertical = orientation === 'vertical';

  return (
    <nav
      aria-label="Étapes"
      className={isVertical ? 'wizard-stepper wizard-stepper--vertical' : 'wizard-stepper wizard-stepper--horizontal'}
    >
      {steps.map((step, index) => {
        const isCompleted = completedStepIds.length > 0 ? completedStepIds.includes(step.id) : currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isClickable = navigationMode ? true : isCompleted;

        return (
          <React.Fragment key={step.id}>
            {/* Item */}
            <div
              className={`wz-item${isCurrent ? ' wz-item--current' : ''}${isCompleted ? ' wz-item--done' : ''}${!isClickable && !isCurrent ? ' wz-item--pending' : ''}`}
              onClick={() => isClickable && onStepClick(step.id)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) onStepClick(step.id); }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="wz-circle">
                {isCompleted ? <CheckCircle2 size={isVertical ? 18 : 16} /> : step.id}
              </div>
              <span className="wz-label">{step.title}</span>
            </div>

            {/* Connector (not after last item) */}
            {index < steps.length - 1 && (
              <div className={`wz-connector${isCompleted ? ' wz-connector--done' : ''}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default WizardStepper;
