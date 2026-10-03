/**
 * @file DietIcons.tsx
 * @description Dietary classification SVG icons matching the Vegan Tools brand identity.
 * - 100% Vegà: Interconnected double leaf with fine stem (emerald green #16a34a).
 * - Vegetarià: Distinct twin-cotyledon sprout / seedling (warm amber #d97706) - distinct silhouette for colorblind safety.
 * - Veg-friendly: Standard fork & knife in silver / metallic slate (#94a3b8), no plate, no blue.
 */

import { Utensils } from "lucide-react";

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * Double leaf brand icon for 100% Vegan venues.
 * Features a primary blade and an interconnected secondary sprout with an elegant fine stem.
 */
export function VeganBadgeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`diet-icon-svg diet-icon-vegan ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {/* Primary large leaf */}
      <path
        d="M12 21A6.5 6.5 0 0 1 10.8 7.5C16 6.5 17.5 5.9 19.5 3.5c1 2 2 4 2 7.5 0 5.5-4.3 10-9.5 10Z"
        fill="#16a34a"
        stroke="#15803d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Secondary smaller sprout */}
      <path
        d="M10.5 14a4 4 0 0 1-3.8-3.6c0-2 1.3-3 2.7-3.6.5 1.3.8 2.2.8 3.5 0 1.2.1 2.2.3 3.7Z"
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Slender botanical stem */}
      <path
        d="M2.5 21.5c0-3 1.8-5.3 5-6 2.3-.5 4.7-2 5.7-3"
        fill="none"
        stroke="#15803d"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Twin-cotyledon sprout / seedling icon for Vegetarian venues.
 * Distinct symmetrical silhouette from the single rating leaf and the vegan double-blade,
 * ensuring immediate clarity for colorblind users.
 */
export function VegetarianBadgeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`diet-icon-svg diet-icon-vegetarian ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {/* Central sturdy stem */}
      <path
        d="M12 22V13"
        stroke="#b45309"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Left full cotyledon leaf */}
      <path
        d="M12 16C5 16.5 1.5 11 2 5.5C8 5 11.5 9.5 12 16Z"
        fill="#f59e0b"
        stroke="#b45309"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Right full cotyledon leaf */}
      <path
        d="M12 16C19 16.5 22.5 11 22 5.5C16 5 12.5 9.5 12 16Z"
        fill="#fbbf24"
        stroke="#b45309"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Stylized carrot icon for Veg-friendly venues (orange body, green leafy fronds).
 * Distinct silhouette symbolizing vegetables / produce in mixed venues.
 */
export function VegFriendlyBadgeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`diet-icon-svg diet-icon-veg-friendly ${className}`}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      {/* Carrot orange root body */}
      <path
        d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7z"
        fill="#f97316"
        stroke="#c2410c"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Root texture ridges */}
      <path
        d="M8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"
        stroke="#ea580c"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Top right leafy frond */}
      <path
        d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Top left leafy frond */}
      <path
        d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"
        fill="#4ade80"
        stroke="#15803d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Backwards-compatible alias for VegFriendlyBadgeIcon */
export const VeganOptionsBadgeIcon = VegFriendlyBadgeIcon;

/**
 * Standard fork & knife icon for Restaurant category in clean metallic slate (#64748b).
 * Strictly no plate.
 */
export function RestaurantBadgeIcon({ size = 16, className = "" }: IconProps) {
  return (
    <span
      className={`diet-icon-restaurant-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        flexShrink: 0,
      }}
    >
      <Utensils size={size} aria-hidden="true" strokeWidth={2.2} />
    </span>
  );
}


