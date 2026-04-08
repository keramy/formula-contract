"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Context Types
// ============================================================================

interface WizardContextType {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canProceed: boolean;
  setCanProceed: (value: boolean) => void;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a FormWizard");
  }
  return context;
}

// ============================================================================
// FormWizard Component
// ============================================================================

interface FormWizardProps {
  children: ReactNode;
  totalSteps: number;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  className?: string;
}

export function FormWizard({
  children,
  totalSteps,
  initialStep = 0,
  onStepChange,
  className,
}: FormWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [canProceed, setCanProceed] = useState(true);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
        onStepChange?.(step);
      }
    },
    [totalSteps, onStepChange]
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1 && canProceed) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  }, [currentStep, totalSteps, canProceed, onStepChange]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep);
    }
  }, [currentStep, onStepChange]);

  const value: WizardContextType = {
    currentStep,
    totalSteps,
    goToStep,
    nextStep,
    prevStep,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
    canProceed,
    setCanProceed,
  };

  return (
    <WizardContext.Provider value={value}>
      <div className={cn("w-full", className)}>{children}</div>
    </WizardContext.Provider>
  );
}

// ============================================================================
// WizardStep Component
// ============================================================================

interface WizardStepProps {
  step: number;
  children: ReactNode;
  className?: string;
}

export function WizardStep({ step, children, className }: WizardStepProps) {
  const { currentStep } = useWizard();

  if (step !== currentStep) {
    return null;
  }

  return <div className={cn("animate-in fade-in-50 duration-300", className)}>{children}</div>;
}

// ============================================================================
// WizardStepIndicator Component
// ============================================================================

interface Step {
  title: string;
  description?: string;
}

interface WizardStepIndicatorProps {
  steps: Step[];
  className?: string;
  allowNavigation?: boolean;
}

export function WizardStepIndicator({
  steps,
  className,
  allowNavigation = false,
}: WizardStepIndicatorProps) {
  const { currentStep, goToStep } = useWizard();

  return (
    <nav aria-label="Progress" className={cn("mb-8", className)}>
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const isClickable = allowNavigation && index <= currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.title} className="flex-1 relative flex flex-col items-center">
              {/* Connector line — between circles, not full width */}
              {!isLast && (
                <div
                  className="absolute top-[14px] left-[calc(50%+14px)] right-[calc(-50%+14px)] h-[2px]"
                  aria-hidden="true"
                >
                  <div className="h-full w-full bg-border rounded-full" />
                  <div
                    className={cn(
                      "absolute inset-0 bg-primary rounded-full transition-all duration-500",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}

              {/* Circle */}
              <button
                type="button"
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 shrink-0",
                  isCompleted && "bg-primary text-primary-foreground shadow-sm",
                  isCurrent && "bg-primary/10 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                  isUpcoming && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:opacity-80",
                  !isClickable && "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </button>

              {/* Label */}
              <div className="mt-2.5 text-center px-1">
                <span
                  className={cn(
                    "text-xs font-medium leading-tight",
                    isCompleted && "text-primary",
                    isCurrent && "text-foreground",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// WizardNavigation Component
// ============================================================================

interface WizardNavigationProps {
  onNext?: () => void | Promise<void>;
  onPrev?: () => void;
  onSubmit?: () => void | Promise<void>;
  nextLabel?: string;
  prevLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  className?: string;
}

export function WizardNavigation({
  onNext,
  onPrev,
  onSubmit,
  nextLabel = "Continue",
  prevLabel = "Back",
  submitLabel = "Submit",
  isSubmitting = false,
  className,
}: WizardNavigationProps) {
  const { isFirstStep, isLastStep, nextStep, prevStep, canProceed } = useWizard();

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    }
    nextStep();
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    }
    prevStep();
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <div className={cn("flex justify-between pt-6 border-t mt-6", className)}>
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstStep}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-md transition-colors",
          isFirstStep
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        {prevLabel}
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canProceed || isSubmitting}
          className={cn(
            "px-6 py-2 text-sm font-medium rounded-md transition-colors",
            "bg-primary text-white hover:bg-primary-800",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? "Submitting..." : submitLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          className={cn(
            "px-6 py-2 text-sm font-medium rounded-md transition-colors",
            "bg-primary text-white hover:bg-primary-800",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
