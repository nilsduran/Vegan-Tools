/**
 * @file LeafRating.tsx
 * @description Letterboxd-style 5-leaf rating component (0.5 to 5.0 with 0.5 increments).
 * Features a single static leaf icon (modeled after the Vegan Tools logo with an elegant, thinner stem),
 * left-half / right-half interaction, all left leaves fully painted green, and empty outlines when unrated.
 */

import { useState, useId, type MouseEvent, type KeyboardEvent } from "react";

interface LeafRatingProps {
  /** Numeric rating between 0 and 5 (supports 0.5 increments) */
  value?: number;
  /** Max leaves (defaults to 5) */
  max?: number;
  /** Whether user can interact, hover, and click */
  interactive?: boolean;
  /** Callback on rating selection */
  onChange?: (value: number) => void;
  /** Icon size in pixels (defaults to 26 for interactive, 16 for compact) */
  size?: number;
  /** Color when leaf is active (defaults to #16a34a) */
  activeColor?: string;
  /** Color of empty leaf interior (defaults to #ffffff) */
  emptyFill?: string;
  /** Color of stem and contours (defaults to #15803d) */
  stemColor?: string;
  /** Optional accessible label */
  ariaLabel?: string;
  /** Show numeric score badge beside leaves */
  showScore?: boolean;
}

/**
 * Single static leaf SVG with high-contrast botanical stem and crisp white-filled unrated state.
 */
function StaticLeafIcon({
  fillType,
  size,
  activeColor,
  emptyFill,
  stemColor,
  gradientId,
}: {
  fillType: "full" | "half" | "empty";
  size: number;
  activeColor: string;
  emptyFill: string;
  stemColor: string;
  gradientId: string;
}) {
  const isFilled = fillType === "full";
  const isHalf = fillType === "half";
  const bladeFill = isFilled ? activeColor : isHalf ? `url(#${gradientId})` : emptyFill;
  const strokeColor = stemColor;

  return (
    <svg
      className="leaf-rating-svg"
      data-static-leaf="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        display: "block",
        transition: "transform 0.12s ease, filter 0.12s ease",
        filter: fillType === "empty"
          ? "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.06))"
          : "drop-shadow(0 2px 5px rgba(22, 163, 74, 0.28))",
      }}
    >
      <defs>
        {/* Crisp split half-gradient for 0.5 increments */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor={activeColor} />
          <stop offset="50%" stopColor={emptyFill} />
        </linearGradient>
      </defs>

      {/* Leaf Body (blade) */}
      <path
        d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
        fill={bladeFill}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* High-contrast botanical stem */}
      <path
        d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LeafRating({
  value = 0,
  max = 5,
  interactive = false,
  onChange,
  size,
  activeColor = "#16a34a",
  emptyFill = "#ffffff",
  stemColor = "#15803d",
  ariaLabel,
  showScore = false,
}: LeafRatingProps) {
  const compId = useId().replace(/:/g, "");
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayScore = hoverValue ?? value;
  const leafSize = size ?? (interactive ? 26 : 16);

  const handleMouseMove = (index: number, e: MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const ratingValue = isLeftHalf ? index + 0.5 : index + 1.0;
    setHoverValue(ratingValue);
  };

  const handleClick = (index: number, e: MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const newRating = isLeftHalf ? index + 0.5 : index + 1.0;
    onChange(newRating);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(max, (value || 0) + 0.5));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(0.5, (value || 0) - 0.5));
    }
  };

  const leaves = Array.from({ length: max }, (_, index) => {
    let fillType: "full" | "half" | "empty" = "empty";
    if (displayScore >= index + 1) {
      fillType = "full";
    } else if (displayScore >= index + 0.5) {
      fillType = "half";
    }

    const gradId = `leaf-grad-${compId}-${index}`;

    return (
      <div
        key={index}
        className={`leaf-slot ${interactive ? "interactive-leaf" : ""}`}
        data-testid={`leaf-slot-${index}`}
        onMouseMove={(e) => handleMouseMove(index, e)}
        onClick={(e) => handleClick(index, e)}
        style={{
          display: "inline-flex",
          cursor: interactive ? "pointer" : "default",
          padding: interactive ? "3px" : "1px",
          userSelect: "none",
        }}
      >
        <StaticLeafIcon
          fillType={fillType}
          size={leafSize}
          activeColor={activeColor}
          emptyFill={emptyFill}
          stemColor={stemColor}
          gradientId={gradId}
        />
      </div>
    );
  });

  return (
    <div
      className={`leaf-rating-container ${interactive ? "is-interactive" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: interactive ? "4px" : "2px",
      }}
      role={interactive ? "slider" : "img"}
      aria-label={ariaLabel ?? `${displayScore} / ${max}`}
      aria-valuemin={interactive ? 0.5 : undefined}
      aria-valuemax={interactive ? max : undefined}
      aria-valuenow={interactive ? displayScore : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => interactive && setHoverValue(null)}
    >
      <div className="leaf-rating-track" style={{ display: "inline-flex", alignItems: "center" }}>
        {leaves}
      </div>

      {showScore && (
        <span
          className="leaf-rating-score-text"
          style={{
            marginLeft: "6px",
            fontSize: interactive ? "0.95rem" : "0.85rem",
            fontWeight: 700,
            color: displayScore > 0 ? activeColor : "var(--color-muted, #64748b)",
          }}
        >
          {displayScore > 0 ? displayScore.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}
