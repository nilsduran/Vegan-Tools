import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { tx } from "../i18n";

interface SearchTypeaheadProps {
  query: string;
  onQueryChange: (query: string) => void;
  loading: boolean;
  onSubmitSearch: (query: string) => void;
  onClear: () => void;
  canClear?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}

export function SearchTypeahead({
  query,
  onQueryChange,
  loading,
  onSubmitSearch,
  onClear,
  canClear = false,
  placeholder,
  onFocus,
}: SearchTypeaheadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      inputRef.current?.blur();
      onSubmitSearch(query);
    } else if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.blur();
      onClear();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    inputRef.current?.blur();
    onSubmitSearch(query);
  };

  const isClearable = query.trim().length > 0 || canClear;

  return (
    <div className="search-typeahead-container">
      <form onSubmit={handleSubmit} role="search" className="restaurant-search-form">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
            aria-label={placeholder || tx("Search for a restaurant")}
            placeholder={placeholder || tx("Search for a restaurant")}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            required
            minLength={2}
          />
          {isClearable && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                inputRef.current?.blur();
                onClear();
              }}
              title={tx("Clear")}
              aria-label={tx("Clear")}
            >
              <span className="search-clear-icon" aria-hidden="true" />
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
    </div>
  );
}
