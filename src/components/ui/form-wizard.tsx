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
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowNavigation && index <= currentStep;

          return (
            <li
              key={step.title}
              className={cn(
                "relative flex-1",
                index !== steps.length - 1 && "pr-8 sm:pr-20"
              )}
            >
              {/* Progress line */}
              {index !== steps.length - 1 && (
                <div
                  className="absolute top-4 left-0 -right-8 sm:-right-20 h-0.5 bg-gray-200"
                  aria-hidden="true"
                >
                  <div
                    className={cn(
                      "h-full bg-violet-600 transition-all duration-500",
                      isCompleted ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}

              {/* Step circle and content */}
              <div className="relative flex flex-col items-center group">
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
                    isCompleted &&
                      "bg-violet-600 text-white hover:bg-violet-700",
                    isCurrent &&
                      "border-2 border-violet-600 bg-white text-violet-600",
                    !isCompleted &&
                      !isCurrent &&
                      "border-2 border-gray-300 bg-white text-gray-400",
                    isClickable && "cursor-pointer",
                    !isClickable && "cursor-default"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="size-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-violet-600" : "text-gray-500"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
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
            "bg-violet-600 text-white hover:bg-violet-700",
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
            "bg-violet-600 text-white hover:bg-violet-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
