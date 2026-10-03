import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Timer as TimerIcon,
  X,
} from "lucide-react";
import type { RecipeItem } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";

interface KitchenModeModalProps {
  recipe: RecipeItem;
  initialStepIndex?: number;
  onClose: () => void;
}

export function KitchenModeModal({
  recipe,
  initialStepIndex = 0,
  onClose,
}: KitchenModeModalProps) {
  const language = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Timer state for steps with duration
  const currentStep = recipe.steps[currentStepIndex];
  const stepDurationSeconds = (currentStep?.durationMinutes ?? 0) * 60;
  const [timeLeft, setTimeLeft] = useState(stepDurationSeconds);
  const [timerRunning, setTimerRunning] = useState(false);

  // Reset timer when changing step
  useEffect(() => {
    setTimeLeft((recipe.steps[currentStepIndex]?.durationMinutes ?? 0) * 60);
    setTimerRunning(false);
  }, [currentStepIndex, recipe.steps]);

  // Timer countdown ticker
  useEffect(() => {
    if (!timerRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          // Play subtle vibration or sound if supported
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {
            // Ignore vibration error
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  // Request screen Wake Lock API to prevent phone screen from going dark while cooking
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && (navigator as any).wakeLock?.request) {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLockSentinel.addEventListener("release", () => {
            setWakeLockActive(false);
          });
        }
      } catch {
        setWakeLockActive(false);
      }
    };

    void requestWakeLock();

    return () => {
      try {
        wakeLockSentinel?.release?.();
      } catch {
        // Ignore release error
      }
    };
  }, []);

  const totalSteps = recipe.steps.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      className="kitchen-mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={tx("Cook Mode")}
    >
      <header className="kitchen-mode-header">
        <div className="kitchen-mode-title-wrap">
          <span className="kitchen-mode-badge">{tx("Cook Mode")}</span>
          <h2 className="kitchen-mode-recipe-title">
            {recipe.title[language] ?? recipe.title.ca}
          </h2>
        </div>

        <div className="kitchen-mode-controls">
          {wakeLockActive && (
            <span
              className="wake-lock-pill"
              title={tx("Screen will stay on while cooking")}
            >
              <Sun size={14} aria-hidden="true" />
              <span>{tx("Screen will stay on while cooking")}</span>
            </span>
          )}
          <button
            type="button"
            className="kitchen-mode-close-btn"
            onClick={onClose}
            aria-label={tx("Exit Cook Mode")}
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div
        className="kitchen-mode-progress-bar"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="kitchen-mode-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <main className="kitchen-mode-body">
        <div className="kitchen-step-meta">
          <span className="kitchen-step-count">
            {tx("Step")} {currentStepIndex + 1} / {totalSteps}
          </span>
          {currentStep?.durationMinutes && (
            <span className="kitchen-step-duration">
              <TimerIcon size={16} aria-hidden="true" />
              <span>~{currentStep.durationMinutes} {tx("min")}</span>
            </span>
          )}
        </div>

        <p className="kitchen-step-instruction">
          {currentStep?.instruction[language] ?? currentStep?.instruction.ca}
        </p>

        {/* Tip Box */}
        {currentStep?.tip && (
          <div className="kitchen-step-tip">
            <Lightbulb size={20} className="tip-icon" aria-hidden="true" />
            <div>
              <strong>{tx("Chef tip")}:</strong>{" "}
              <span>{currentStep.tip[language] ?? currentStep.tip.ca}</span>
            </div>
          </div>
        )}

        {/* Interactive Timer if step has duration */}
        {currentStep?.durationMinutes && (
          <div className="kitchen-timer-card">
            <div className="kitchen-timer-display">
              <span className="kitchen-timer-digits">
                {formatTimer(timeLeft)}
              </span>
              <span className="kitchen-timer-label">{tx("Timer")}</span>
            </div>

            <div className="kitchen-timer-actions">
              <button
                type="button"
                className="timer-btn timer-btn-toggle"
                onClick={() => setTimerRunning((prev) => !prev)}
                aria-label={timerRunning ? tx("Pause timer") : tx("Start timer")}
              >
                {timerRunning ? (
                  <>
                    <Pause size={18} aria-hidden="true" />
                    <span>{tx("Pause timer")}</span>
                  </>
                ) : (
                  <>
                    <Play size={18} aria-hidden="true" />
                    <span>{tx("Start timer")}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="timer-btn timer-btn-reset"
                onClick={() => {
                  setTimerRunning(false);
                  setTimeLeft(stepDurationSeconds);
                }}
                aria-label={tx("Reset")}
              >
                <RotateCcw size={18} aria-hidden="true" />
                <span>{tx("Reset")}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="kitchen-mode-footer">
        <button
          type="button"
          className="kitchen-nav-btn kitchen-nav-prev"
          disabled={currentStepIndex === 0}
          onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
          aria-label={tx("Previous step")}
        >
          <ArrowLeft size={20} aria-hidden="true" />
          <span>{tx("Previous step")}</span>
        </button>

        {currentStepIndex < totalSteps - 1 ? (
          <button
            type="button"
            className="kitchen-nav-btn kitchen-nav-next"
            onClick={() =>
              setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))
            }
            aria-label={tx("Next step")}
          >
            <span>{tx("Next step")}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="kitchen-nav-btn kitchen-nav-finish"
            onClick={onClose}
            aria-label={tx("Finish cooking")}
          >
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>{tx("Finish cooking")}</span>
          </button>
        )}
      </footer>
    </div>
  );
}
