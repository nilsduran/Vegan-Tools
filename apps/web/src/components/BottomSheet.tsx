import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { tx } from "../i18n";

export type SnapPoint = "collapsed" | "half" | "expanded";

interface BottomSheetProps {
  snapPoint: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  header: ReactNode;
  children: ReactNode;
  isCompact?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function BottomSheet({
  snapPoint,
  onSnapChange,
  header,
  children,
  isCompact = false,
  className = "",
  ariaLabel,
}: BottomSheetProps) {
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const cycleSnapPoint = useCallback(() => {
    if (snapPoint === "collapsed") {
      onSnapChange("half");
    } else if (snapPoint === "half") {
      onSnapChange("expanded");
    } else {
      onSnapChange("half");
    }
  }, [snapPoint, onSnapChange]);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartY.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY.current;

    // Resistance at extremes
    if (snapPoint === "expanded" && deltaY < 0) {
      setDragOffset(deltaY * 0.2);
    } else if (snapPoint === "collapsed" && deltaY > 0) {
      setDragOffset(deltaY * 0.2);
    } else {
      setDragOffset(deltaY);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartY.current === null) return;
    const touch = e.changedTouches[0] || e.touches[0];
    if (!touch) {
      touchStartY.current = null;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    const endY = touch.clientY;
    const deltaY = endY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = deltaY / Math.max(deltaTime, 1); // px per ms

    touchStartY.current = null;
    setIsDragging(false);
    setDragOffset(0);

    // If it was a quick tap (< 200ms and < 8px movement)
    if (Math.abs(deltaY) < 8 && deltaTime < 200) {
      cycleSnapPoint();
      return;
    }

    // Significant swipe up
    if (deltaY < -45 || velocity < -0.35) {
      if (snapPoint === "collapsed") {
        if (velocity < -0.8 || deltaY < -160) {
          onSnapChange("expanded");
        } else {
          onSnapChange("half");
        }
      } else if (snapPoint === "half") {
        onSnapChange("expanded");
      }
      return;
    }

    // Significant swipe down
    if (deltaY > 45 || velocity > 0.35) {
      if (snapPoint === "expanded") {
        onSnapChange("half");
      } else if (snapPoint === "half") {
        onSnapChange("collapsed");
      }
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (snapPoint === "collapsed") onSnapChange("half");
      else if (snapPoint === "half") onSnapChange("expanded");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (snapPoint === "expanded") onSnapChange("half");
      else if (snapPoint === "half") onSnapChange("collapsed");
    }
  };

  const dynamicTransform = isDragging && dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined;

  return (
    <aside
      className={`map-floating-sidebar bottom-sheet-container snap-${snapPoint} ${
        isCompact ? "compact-sidebar" : ""
      } ${className}`}
      aria-label={ariaLabel || tx("Search restaurants")}
      style={dynamicTransform ? { transform: dynamicTransform, transition: "none" } : undefined}
    >
      {/* Mobile drag handle bar */}
      <div
        className="bottom-sheet-handle-bar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={cycleSnapPoint}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={
          snapPoint === "expanded"
            ? tx("Collapse panel")
            : snapPoint === "half"
            ? tx("Expand panel")
            : tx("Open panel")
        }
        aria-expanded={snapPoint !== "collapsed"}
      >
        <div className="bottom-sheet-handle" />
      </div>

      <div
        className="bottom-sheet-header-area"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {header}
      </div>

      <div className="bottom-sheet-content-area sidebar-content-area" ref={contentRef}>
        {children}
      </div>
    </aside>
  );
}
