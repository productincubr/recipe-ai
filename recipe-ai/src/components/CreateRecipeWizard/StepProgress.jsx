import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

export default function StepProgress({ steps, currentStep }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-start">
      {steps.map((step, i) => {
        const number = i + 1;
        const isDone = number < currentStep;
        const isActive = number === currentStep;

        return (
          <Fragment key={step.key}>
            <div className="flex w-16 shrink-0 flex-col items-center gap-2 sm:w-20">
              <div
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors",
                  (isDone || isActive) && "bg-olive-dark text-white",
                  !isDone && !isActive && "border border-cream-300 bg-white text-ink-muted"
                )}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : number}
              </div>
              <span
                className={clsx(
                  "text-center text-[11px] leading-tight",
                  isActive ? "font-semibold text-ink" : "text-ink-muted"
                )}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={clsx(
                  "mt-[18px] h-[2px] flex-1",
                  number < currentStep ? "bg-olive-dark" : "bg-cream-300"
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
