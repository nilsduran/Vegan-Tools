/**
 * @file RatingHistogram.tsx
 * @description Letterboxd-style vertical bar histogram for restaurant visit ratings.
 * Groups ratings into 10 half-star bins (0.5 to 5.0) and visualizes the distribution with hover tooltips.
 */

import { useMemo } from "react";
import { getRatingHistogram, type RestaurantVisitLog } from "../utils/diary";
import { tx } from "../i18n";
import { LeafRating } from "./LeafRating";

interface RatingHistogramProps {
  logs: RestaurantVisitLog[];
}

export function RatingHistogram({ logs }: RatingHistogramProps) {
  const histogram = useMemo(() => getRatingHistogram(logs), [logs]);

  const totalCount = logs.length;
  const averageRating = useMemo(() => {
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, l) => acc + l.rating, 0);
    return Math.round((sum / logs.length) * 10) / 10;
  }, [logs]);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="diary-histogram-card" aria-label={tx("Rating distribution")}>
      <div className="diary-histogram-header">
        <div className="diary-histogram-title-wrap">
          <span className="diary-histogram-icon" aria-hidden="true">★</span>
          <h3 className="diary-histogram-title">{tx("Rating distribution")}</h3>
        </div>
        <div className="diary-histogram-stats">
          <span className="diary-histogram-avg">
            <LeafRating value={averageRating} size={14} ariaLabel={tx("Average rating")} />
            <strong>{averageRating.toFixed(1)}</strong>
          </span>
          <span className="diary-histogram-count">
            {totalCount} {totalCount === 1 ? tx("log") : tx("logs")}
          </span>
        </div>
      </div>

      <div className="diary-histogram-chart-wrap" role="figure" aria-label={`${totalCount} ratings with average ${averageRating}`}>
        <div className="diary-histogram-bars">
          {histogram.map((bin) => {
            const heightPercent = bin.count > 0 ? Math.max(bin.percentage, 10) : 0;
            const tooltipText = `${bin.score} ${tx("leaves")}: ${bin.count} ${bin.count === 1 ? tx("visit") : tx("visits")}`;

            return (
              <div
                key={bin.score}
                className="diary-histogram-bar-col"
                title={tooltipText}
                data-score={bin.score}
              >
                <div className="diary-histogram-bar-track">
                  <div
                    className={`diary-histogram-bar-fill ${bin.count > 0 ? "has-data" : ""}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="diary-histogram-bar-label">
                  {bin.score % 1 === 0 ? bin.score : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="diary-histogram-axis-labels">
          <span><LeafRating value={0.5} size={13} ariaLabel={tx("One half leaf")} /></span>
          <span><LeafRating value={5} size={13} ariaLabel={tx("Five leaves")} /></span>
        </div>
      </div>
    </div>
  );
}
