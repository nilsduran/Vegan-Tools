import { useCallback, useRef, useState, type PointerEvent, type ReactNode, type TouchEvent } from "react";
import { tx } from "../i18n";

export type SnapPoint = "collapsed" | "half" | "expanded";

interface BottomSheetProps {
  snapPoint: SnapPoint;
  onSnapChange: (snap: SnapPoint) => void;
  header: ReactNode;
  children: ReactNode;
  isCompact?: boolean;
  allowDrag?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function BottomSheet({
  snapPoint,
  onSnapChange,
  header,
  children,
  isCompact = false,
  allowDrag = true,
  className = "",
  ariaLabel,
}: BottomSheetProps) {
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const cycleSnapPoint = useCallback(() => {
    if (!allowDrag && snapPoint === "collapsed") return;
    if (snapPoint === "collapsed") {
      onSnapChange("half");
    } else if (snapPoint === "half") {
      onSnapChange("expanded");
    } else {
      onSnapChange("half");
    }
  }, [snapPoint, onSnapChange, allowDrag]);

  const onDragStart = (clientY: number) => {
    if (!allowDrag && snapPoint === "collapsed") return;
    dragStartY.current = clientY;
    dragStartTime.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
  };

  const onDragMove = (clientY: number) => {
    if (dragStartY.current === null) return;
    const deltaY = clientY - dragStartY.current;

    // Resistance at extremes
    if (snapPoint === "expanded" && deltaY < 0) {
      setDragOffset(deltaY * 0.2);
    } else if (snapPoint === "collapsed" && deltaY > 0) {
      setDragOffset(deltaY * 0.2);
    } else {
      setDragOffset(deltaY);
    }
  };

  const onDragEnd = (clientY: number) => {
    if (dragStartY.current === null) return;
    const deltaY = clientY - dragStartY.current;
    const deltaTime = Date.now() - dragStartTime.current;
    const velocity = deltaY / Math.max(deltaTime, 1);

    dragStartY.current = null;
    setIsDragging(false);
    setDragOffset(0);

    // Click/tap
    if (Math.abs(deltaY) < 6 && deltaTime < 220) {
      cycleSnapPoint();
      return;
    }

    // Swipe up
    if (deltaY < -25 || velocity < -0.25) {
      if (snapPoint === "collapsed") {
        if (velocity < -1.2 || deltaY < -220) {
          onSnapChange("expanded");
        } else {
          onSnapChange("half");
        }
      } else if (snapPoint === "half") {
        onSnapChange("expanded");
      }
      return;
    }

    // Swipe down
    if (deltaY > 25 || velocity > 0.25) {
      if (snapPoint === "expanded") {
        if (velocity > 1.2 || deltaY > 220) {
          onSnapChange("collapsed");
        } else {
          onSnapChange("half");
        }
      } else if (snapPoint === "half") {
        onSnapChange("collapsed");
      }
      return;
    }
  };

  // Pointer event handlers
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    onDragStart(e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    onDragMove(e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    onDragEnd(e.clientY);
  };

  // Native touch event fallback for environments/devices that rely on TouchEvent
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;
    const touch = e.touches[0];
    if (touch) onDragStart(touch.clientY);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch) onDragMove(touch.clientY);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0] || e.touches[0];
    if (touch) onDragEnd(touch.clientY);
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
        style={!allowDrag && snapPoint === "collapsed" ? { display: "none" } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
