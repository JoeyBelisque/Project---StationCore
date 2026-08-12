import React from 'react';
import { Check } from 'lucide-react';

export function StepsIndicator({ currentStep }) {
  const steps = ['Upload do arquivo', 'Validação', 'Confirmar importação'];

  return (
    <div className="steps-indicator">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const status = currentStep > stepNumber ? 'done' : currentStep === stepNumber ? 'active' : 'todo';
        
        return (
          <div key={step} className={`step ${status}`}>
            <div className="step-number">
              {status === 'done' ? <Check size={16} /> : stepNumber}
            </div>
            <span className="step-label">{step}</span>
            {index < steps.length - 1 && <div className="step-line" />}
          </div>
        );
      })}
      
      <style>{`
        .steps-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2rem 0;
          position: relative;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          position: relative;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          transition: var(--transition);
        }

        .step.todo .step-number { border: 2px solid var(--border); color: var(--text-muted); }
        .step.active .step-number { background: var(--accent); color: white; }
        .step.done .step-number { background: var(--success); color: white; }

        .step-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .step.active .step-label { color: var(--text); font-weight: 600; }
        .step.done .step-label { color: var(--text); }

        .step-line {
          flex: 1;
          height: 2px;
          background: var(--border);
          margin: 0 1rem;
        }

        @media (max-width: 640px) {
          .steps-indicator { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
          .step-line { display: none; }
        }
      `}</style>
    </div>
  );
}
