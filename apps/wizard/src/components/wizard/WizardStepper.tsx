import { clsx } from "clsx";
import { Check } from "lucide-react";

interface WizardStepperProps {
  steps: Array<{ label: string }>;
  currentStep: number;
  onStepClick: (index: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <nav aria-label="Wizard steps" className="mb-8">
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <li key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  {
                    "bg-primary text-white": isCurrent,
                    "bg-success/10 text-success": isCompleted,
                    "bg-muted text-muted-foreground hover:bg-border": !isCurrent && !isCompleted,
                  },
                )}
                aria-current={isCurrent ? "step" : undefined}
                data-testid={`step-${idx}`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full border border-current text-xs">
                    {idx + 1}
                  </span>
                )}
                {step.label}
              </button>
              {idx < steps.length - 1 && (
                <div className="w-4 h-px bg-border shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
