import { useState, type ReactNode } from "react";
import { Filter, Leaf, RotateCcw } from "lucide-react";
import { tx, type CatalanPhraseKey } from "../i18n";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { GlutenFreeIcon } from "./GlutenFreeIcon";

export interface FilterDefinition {
  id: string;
  labelKey: CatalanPhraseKey;
  icon: ReactNode;
  match: (candidate: RestaurantCandidate) => boolean;
}

export const FLAG_FILTER_IDS = new Set(["leaves_4plus", "open_now", "vegan"]);

export const PRIMARY_FILTERS: FilterDefinition[] = [
  {
    id: "leaves_4plus",
    labelKey: "4+ leaves",
    icon: "🍃",
    match: (c) => Boolean(c.rating !== undefined && c.rating >= 4),
  },
  {
    id: "vegan",
    labelKey: "100% Vegan",
    icon: "🌱",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.isVegan ||
          c.tags?.includes("vegan") ||
          name.includes("vegan") ||
          name.includes("vegà") ||
          name.includes("vegano") ||
          name.includes("vegana") ||
          name.includes("plant based") ||
          name.includes("plant-based") ||
          name.includes("100% vegetal"),
      );
    },
  },
  {
    id: "vegan_options",
    labelKey: "Vegan options",
    icon: "🌿",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.isVegan ||
          c.isVegetarian ||
          c.tags?.includes("vegan") ||
          c.tags?.includes("vegetarian") ||
          c.cuisine?.toLowerCase().includes("vegan") ||
          c.cuisine?.toLowerCase().includes("vegetarian") ||
          name.includes("vegan") ||
          name.includes("vegà") ||
          name.includes("vegano") ||
          name.includes("vegetari") ||
          name.includes("healthy") ||
          name.includes("bio") ||
          name.includes("organic") ||
          // Any place that isn't strictly non-vegan-only with verified dishes
          (c.tags && c.tags.length > 0 && !c.tags.includes("carnivore_only")),
      );
    },
  },
];

export const CATEGORY_FILTERS: FilterDefinition[] = [
  {
    id: "restaurant",
    labelKey: "Restaurant",
    icon: "🍽️",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("restaurant") ||
          c.cuisine === "restaurant" ||
          !c.tags?.includes("ice_cream") ||
          name.includes("restaurant") ||
          name.includes("restaurante") ||
          name.includes("bistrot") ||
          name.includes("bar"),
      );
    },
  },
  {
    id: "cafe_bakery",
    labelKey: "Cafe & Bakery",
    icon: "☕",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("cafe_bakery") ||
          c.tags?.includes("cafe") ||
          c.tags?.includes("bakery") ||
          c.cuisine?.includes("cafe") ||
          c.cuisine?.includes("bakery") ||
          name.includes("cafe") ||
          name.includes("cafeteria") ||
          name.includes("bakery") ||
          name.includes("coffee") ||
          name.includes("pastisseria") ||
          name.includes("pasteleria") ||
          name.includes("forn") ||
          name.includes("donut"),
      );
    },
  },
  {
    id: "italian",
    labelKey: "Italian",
    icon: "🍕",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("italian") ||
          c.tags?.includes("pizza") ||
          c.cuisine?.toLowerCase().includes("italian") ||
          c.cuisine?.toLowerCase().includes("pizza") ||
          name.includes("pizza") ||
          name.includes("pizzeria") ||
          name.includes("pasta") ||
          name.includes("italian") ||
          name.includes("trattoria") ||
          name.includes("tagliatella"),
      );
    },
  },
  {
    id: "asian",
    labelKey: "Asian",
    icon: "🍜",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("asian") ||
          c.cuisine?.toLowerCase().includes("asian") ||
          c.cuisine?.toLowerCase().includes("japanese") ||
          c.cuisine?.toLowerCase().includes("chinese") ||
          name.includes("sushi") ||
          name.includes("ramen") ||
          name.includes("asian") ||
          name.includes("asiat") ||
          name.includes("thai") ||
          name.includes("chinese") ||
          name.includes("wok") ||
          name.includes("desoriente") ||
          name.includes("vietnam") ||
          name.includes("korean"),
      );
    },
  },
  {
    id: "mediterranean",
    labelKey: "Mediterranean",
    icon: "🫒",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("mediterranean") ||
          c.tags?.includes("tapas") ||
          c.cuisine?.toLowerCase().includes("mediterranean") ||
          name.includes("mediterran") ||
          name.includes("paella") ||
          name.includes("tapes") ||
          name.includes("tapas") ||
          name.includes("teresa carles") ||
          name.includes("arros") ||
          name.includes("platets"),
      );
    },
  },
  {
    id: "catalan",
    labelKey: "Catalan cuisine",
    icon: "🥘",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("catalan") ||
          c.cuisine?.toLowerCase().includes("catalan") ||
          name.includes("catalan") ||
          name.includes("masia") ||
          name.includes("calçot") ||
          name.includes("nyàmera") ||
          name.includes("hortet") ||
          name.includes("brasa") ||
          name.includes("can ") ||
          name.includes("cal "),
      );
    },
  },
  {
    id: "gluten_free",
    labelKey: "Gluten-free",
    icon: <GlutenFreeIcon size={16} />,
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("gluten_free") ||
          name.includes("gluten") ||
          name.includes("celiac") ||
          name.includes("celíac") ||
          name.includes("sense gluten") ||
          name.includes("sin gluten"),
      );
    },
  },
  {
    id: "tapas",
    labelKey: "Tapas",
    icon: "🍢",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("tapas") ||
          c.cuisine?.toLowerCase().includes("tapas") ||
          name.includes("tapes") ||
          name.includes("tapas") ||
          name.includes("platets") ||
          name.includes("pinchos") ||
          name.includes("pintxos"),
      );
    },
  },
  {
    id: "sushi",
    labelKey: "Sushi",
    icon: "🍣",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("japanese") ||
          c.tags?.includes("sushi") ||
          c.cuisine?.toLowerCase().includes("japanese") ||
          c.cuisine?.toLowerCase().includes("sushi") ||
          name.includes("sushi") ||
          name.includes("ramen") ||
          name.includes("japo") ||
          name.includes("japan"),
      );
    },
  },
  {
    id: "mexican",
    labelKey: "Mexican",
    icon: "🌮",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("mexican") ||
          c.cuisine?.toLowerCase().includes("mexican") ||
          name.includes("mexic") ||
          name.includes("taco") ||
          name.includes("burrito") ||
          name.includes("cantina"),
      );
    },
  },
  {
    id: "indian",
    labelKey: "Indian",
    icon: "🍛",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("indian") ||
          c.cuisine?.toLowerCase().includes("indian") ||
          name.includes("india") ||
          name.includes("curry") ||
          name.includes("tandoori") ||
          name.includes("masala"),
      );
    },
  },
  {
    id: "burger",
    labelKey: "Burger",
    icon: "🍔",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("burger") ||
          c.cuisine?.toLowerCase().includes("burger") ||
          name.includes("burger") ||
          name.includes("hamburgues") ||
          name.includes("junk food"),
      );
    },
  },
  {
    id: "vegetarian",
    labelKey: "Vegetarian",
    icon: "🥗",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.isVegetarian ||
          c.tags?.includes("vegetarian") ||
          c.cuisine?.toLowerCase().includes("vegetarian") ||
          name.includes("vegetari") ||
          name.includes("veggie") ||
          name.includes("vegetariano") ||
          name.includes("vegetariana"),
      );
    },
  },
  {
    id: "kebab",
    labelKey: "Kebab",
    icon: "🥙",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("kebab") ||
          c.cuisine?.toLowerCase().includes("kebab") ||
          c.cuisine?.toLowerCase().includes("turkish") ||
          name.includes("kebab") ||
          name.includes("doner") ||
          name.includes("döner") ||
          name.includes("shawarma") ||
          name.includes("falafel"),
      );
    },
  },
  {
    id: "ice_cream",
    labelKey: "Ice cream",
    icon: "🍦",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("ice_cream") ||
          c.cuisine?.toLowerCase().includes("ice_cream") ||
          name.includes("gelat") ||
          name.includes("helad") ||
          name.includes("ice cream") ||
          name.includes("gelater") ||
          name.includes("helader"),
      );
    },
  },
  {
    id: "halal",
    labelKey: "Halal",
    icon: "حلال",
    match: (c) => Boolean(c.tags?.includes("halal") || c.name.toLowerCase().includes("halal")),
  },
  {
    id: "fish_and_chips",
    labelKey: "Fish and chips",
    icon: "🍟",
    match: (c) => {
      const name = c.name.toLowerCase();
      return Boolean(
        c.tags?.includes("fish_and_chips") ||
          c.cuisine?.toLowerCase().includes("fish_and_chips") ||
          name.includes("fish and chips") ||
          name.includes("fish & chips") ||
          name.includes("chippy"),
      );
    },
  },
];

export const EXTRA_FILTERS = CATEGORY_FILTERS;
export const ALL_FILTERS = [...PRIMARY_FILTERS, ...CATEGORY_FILTERS];

/**
 * Filter restaurants according to user-selected filter pills.
 * Boolean constraints (100% vegan, open now, 4+ leaves rating) are evaluated with AND.
 * Category & cuisine types (restaurant, cafe, italian, etc.) are evaluated with OR.
 */
export function filterRestaurants(
  candidates: RestaurantCandidate[],
  activeFilterIds: string[],
): RestaurantCandidate[] {
  if (activeFilterIds.length === 0) return candidates;

  const activeDefs = ALL_FILTERS.filter((f) => activeFilterIds.includes(f.id));
  const activeFlags = activeDefs.filter((f) => FLAG_FILTER_IDS.has(f.id));
  const activeCategories = activeDefs.filter((f) => !FLAG_FILTER_IDS.has(f.id));

  return candidates.filter((restaurant) => {
    // 1. All active flag constraints must be satisfied (AND)
    const matchesAllFlags = activeFlags.every((flagDef) => flagDef.match(restaurant));
    if (!matchesAllFlags) return false;

    // 2. If any category filters are active, at least one must match (OR)
    if (activeCategories.length > 0) {
      const matchesAnyCategory = activeCategories.some((catDef) => catDef.match(restaurant));
      if (!matchesAnyCategory) return false;
    }

    return true;
  });
}

interface FilterPillsProps {
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  onClearFilters: () => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function FilterPills({
  activeFilters,
  onToggleFilter,
  onClearFilters,
  onExpandChange,
}: FilterPillsProps) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="filter-pills-container" aria-label={tx("Filter by cuisine or feature")}>
      <div className="filter-pills-scroll" role="toolbar">
        {PRIMARY_FILTERS.map((f) => {
          const isActive = activeFilters.includes(f.id);
          if (f.id === "leaves_4plus") {
            return (
              <button
                key={f.id}
                type="button"
                className={`filter-pill leaves-pill ${isActive ? "active" : ""}`}
                aria-pressed={isActive}
                aria-label={tx("4+ leaves")}
                title={tx("4+ leaves")}
                onClick={() => onToggleFilter(f.id)}
              >
                <span className="leaves-group" aria-hidden="true">
                  <Leaf className="rating-leaf-icon" />
                  <Leaf className="rating-leaf-icon" />
                  <Leaf className="rating-leaf-icon" />
                  <Leaf className="rating-leaf-icon" />
                  <span className="rating-plus">+</span>
                </span>
              </button>
            );
          }
          return (
            <button
              key={f.id}
              type="button"
              className={`filter-pill ${isActive ? "active" : ""}`}
              aria-pressed={isActive}
              onClick={() => onToggleFilter(f.id)}
            >
              <span className="pill-icon" aria-hidden="true">{f.icon}</span>
              <span className="pill-label">{tx(f.labelKey)}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`filter-pill expand-pill funnel-pill ${expanded ? "expanded" : ""} ${
            hasActiveFilters ? "has-active" : ""
          }`}
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            onExpandChange?.(next);
          }}
          aria-expanded={expanded}
          aria-label={tx("Filters")}
          title={tx("Filters")}
        >
          <Filter className="pill-funnel-icon" aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className="filter-pills-extra" role="region" aria-label={tx("Filters")}>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-pill reset-filter-btn"
              onClick={() => {
                onClearFilters();
              }}
              aria-label={tx("Reset filters")}
              title={tx("Reset filters")}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>{tx("Reset filters")}</span>
            </button>
          )}
          {CATEGORY_FILTERS.map((f) => {
            const isActive = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className={`filter-pill ${isActive ? "active" : ""}`}
                aria-pressed={isActive}
                onClick={() => onToggleFilter(f.id)}
              >
                <span className="pill-icon" aria-hidden="true">{f.icon}</span>
                <span className="pill-label">{tx(f.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
