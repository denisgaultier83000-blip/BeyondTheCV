import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

interface ContextType {
  renderStepContent: () => React.ReactNode;
  CAREER_EDGE_STEPS: { id: number; title: string }[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export function CandidateLayout() {
  const { renderStepContent, CAREER_EDGE_STEPS, currentStep, setCurrentStep } = useOutletContext<ContextType>();

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem', boxSizing: 'border-box' }}>
      <div className="stepper-container custom-stepper" style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '1.5rem 1rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', margin: '0 auto 2rem auto', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
        {CAREER_EDGE_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={`stepper-item ${currentStep === step.id ? 'current' : currentStep > step.id ? 'completed' : ''}`} 
              onClick={() => currentStep > step.id && setCurrentStep(step.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: currentStep > step.id ? 'pointer' : 'default', flex: 1, minWidth: '70px', flexShrink: 0, opacity: currentStep < step.id ? 0.5 : 1 }}
            >
              <div 
                className="stepper-circle" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: currentStep > step.id ? '#10b981' : currentStep === step.id ? 'var(--primary)' : 'var(--bg-secondary)', color: currentStep >= step.id ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', fontWeight: 'bold', boxShadow: currentStep === step.id ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none', transition: 'all 0.3s ease', flexShrink: 0 }}
              >
                {currentStep > step.id ? <CheckCircle2 size={18} /> : step.id}
              </div>
              <span className="stepper-title" style={{ fontSize: '0.7rem', textAlign: 'center', color: currentStep === step.id ? 'var(--primary)' : 'var(--text-main)', fontWeight: currentStep === step.id ? 700 : 500, whiteSpace: 'normal', maxWidth: '100px', lineHeight: 1.2 }}>{step.title}</span>
            </div>
            {index < CAREER_EDGE_STEPS.length - 1 && <div className={`stepper-line ${currentStep > step.id ? 'completed' : ''}`} style={{ flex: 1, height: '3px', background: currentStep > step.id ? '#10b981' : 'var(--border-color)', minWidth: '15px', borderRadius: '2px', transition: 'background 0.3s ease', marginTop: '16px' }}></div>}
          </React.Fragment>
        ))}
      </div>
      <div className="card-container">{renderStepContent()}</div>
    </div>
  );
}