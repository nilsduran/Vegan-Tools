import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { LoaderCircle, MapPin, Search, Sparkles, X } from "lucide-react";
import { t, tx } from "../i18n";
import { formatDistance } from "../utils/distance";
import type { RestaurantCandidate } from "@vegan-tools/domain";

interface SearchTypeaheadProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: RestaurantCandidate[];
  loading: boolean;
  userCoords?: { lat: number; lng: number };
  onSelectSuggestion: (restaurant: RestaurantCandidate) => void;
  onSubmitSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchTypeahead({
  query,
  onQueryChange,
  suggestions,
  loading,
  userCoords,
  onSelectSuggestion,
  onSubmitSearch,
  onClear,
  placeholder,
}: SearchTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown only when query has at least 2 chars and there are suggestions or active loading
  useEffect(() => {
    if (query.trim().length >= 2 && (suggestions.length > 0 || loading)) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    } else {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [query, suggestions.length, loading]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        setIsOpen(false);
        onSubmitSearch(query);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const selected = suggestions[highlightedIndex];
        if (selected) {
          setIsOpen(false);
          setHighlightedIndex(-1);
          onSelectSuggestion(selected);
        }
      } else {
        setIsOpen(false);
        onSubmitSearch(query);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSubmitSearch(query);
  };

  return (
    <div className="search-typeahead-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="restaurant-search-form">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2 && suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            aria-label={placeholder || tx("Search for a restaurant")}
            placeholder={placeholder || tx("Search for a restaurant")}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            required
            minLength={2}
          />
          {query.length > 0 && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                onClear();
                setIsOpen(false);
                setHighlightedIndex(-1);
                inputRef.current?.focus();
              }}
              title={t("remove")}
              aria-label={t("remove")}
            >
              <X size={14} strokeWidth={2.6} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="secondary-button search-submit-btn"
          disabled={query.trim().length < 2}
          aria-label={tx("Search restaurants")}
        >
          {loading ? <LoaderCircle className="spin" /> : <Search size={18} />}
        </button>
      </form>

      {isOpen && suggestions.length > 0 && (
        <div className="typeahead-dropdown" role="listbox">
          <ul className="typeahead-list">
              {suggestions.slice(0, 6).map((restaurant, index) => {
                const isHighlighted = index === highlightedIndex;
                const distanceStr = formatDistance(
                  userCoords,
                  { lat: restaurant.latitude, lng: restaurant.longitude },
                );

                return (
                  <li
                    key={restaurant.id}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`typeahead-item ${isHighlighted ? "highlighted" : ""}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      setIsOpen(false);
                      setHighlightedIndex(-1);
                      onSelectSuggestion(restaurant);
                    }}
                  >
                    <span className="typeahead-item-icon">
                      {restaurant.isVegan ? (
                        <span className="vegan-icon" title="100% Vegan">🌱</span>
                      ) : restaurant.provider === "curated" ? (
                        <Sparkles className="curated-icon" aria-hidden="true" />
                      ) : (
                        <MapPin aria-hidden="true" />
                      )}
                    </span>
                    <div className="typeahead-item-info">
                      <div className="typeahead-item-header">
                        <strong className="typeahead-name">{restaurant.name}</strong>
                        {restaurant.isVegan && (
                          <span className="typeahead-vegan-badge">{tx("100% Vegan")}</span>
                        )}
                      </div>
                      <span className="typeahead-address">
                        {distanceStr ? `${distanceStr} · ${restaurant.address}` : restaurant.address}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="typeahead-footer">
              <span>{tx("Press Enter to search all results")}</span>
            </div>
          </div>
        )}
    </div>
  );
}
