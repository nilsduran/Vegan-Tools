/**
 * @file CityPickerModal.tsx
 * @description Modal dialog allowing users to switch the active city hub or search any global city.
 * Displays curated city hubs organically, supports searching real cities via open geocoding,
 * and normalizes display names to eliminate country suffixes (e.g., never ", Espanya").
 */

import { useState, useEffect, useRef } from "react";
import { Check, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { FEATURED_CITY_HUBS, type FeaturedCityHub } from "@vegan-tools/domain";
import { tx } from "../i18n";

export interface SelectedCity {
  name: string;
  latitude: number;
  longitude: number;
  hubId?: string;
}

interface CityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSelectCity: (city: SelectedCity) => void;
}

interface GeocodedCity {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Normalizes city display names:
 * - Omits ", Spain" / ", Espanya" entirely.
 * - If in Catalonia / Catalunya, resolves ambiguity with ", Catalunya".
 * - For international cities, uses "City, Country".
 */
function formatCleanCityName(name: string, state?: string, country?: string): string {
  const cleanName = name.trim();
  const stateStr = (state || "").toLowerCase();
  const countryStr = (country || "").toLowerCase();

  const isCatalunya =
    stateStr.includes("catalun") ||
    stateStr.includes("catalon") ||
    cleanName.toLowerCase() === "barcelona" ||
    cleanName.toLowerCase() === "girona" ||
    cleanName.toLowerCase() === "tarragona" ||
    cleanName.toLowerCase() === "lleida" ||
    cleanName.toLowerCase() === "vic" ||
    cleanName.toLowerCase() === "manresa";

  if (isCatalunya) {
    // If it's Barcelona or Girona, it's globally unambiguous
    if (cleanName === "Barcelona" || cleanName === "Girona") {
      return cleanName;
    }
    return `${cleanName}, Catalunya`;
  }

  // If in Spain but outside Catalunya, don't append "Espanya"
  if (countryStr === "spain" || countryStr === "españa" || countryStr === "espanya") {
    return cleanName;
  }

  // International city with country
  if (country?.trim()) {
    return `${cleanName}, ${country.trim()}`;
  }

  return cleanName;
}

export function CityPickerModal({
  isOpen,
  onClose,
  currentCity,
  onSelectCity,
}: CityPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteCities, setRemoteCities] = useState<GeocodedCity[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setRemoteCities([]);
      setSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setRemoteCities([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          q,
        )}&osm_tag=place:city&osm_tag=place:town&limit=6`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network error");
        const data = (await res.json()) as {
          features?: Array<{
            geometry: { coordinates: [number, number] };
            properties: {
              name?: string;
              city?: string;
              state?: string;
              country?: string;
              type?: string;
              osm_value?: string;
            };
          }>;
        };

        const parsed: GeocodedCity[] = (data.features || [])
          .filter((f) => {
            const cityName = f.properties.city || f.properties.name;
            const placeType = f.properties.type || f.properties.osm_value;
            return (
              Boolean(cityName) &&
              (placeType === "city" ||
                placeType === "town" ||
                placeType === "administrative" ||
                placeType === "municipality")
            );
          })
          .map((f) => {
            const cityName = f.properties.city || f.properties.name || "";
            const [lng, lat] = f.geometry.coordinates;
            const displayName = formatCleanCityName(
              cityName,
              f.properties.state,
              f.properties.country,
            );
            return {
              name: cityName,
              displayName,
              latitude: lat,
              longitude: lng,
            };
          });

        // Deduplicate by displayName
        const seen = new Set<string>();
        const unique = parsed.filter((c) => {
          if (seen.has(c.displayName.toLowerCase())) return false;
          seen.add(c.displayName.toLowerCase());
          return true;
        });

        setRemoteCities(unique);
      } catch {
        setRemoteCities([]);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const normalizedCurrent = currentCity.trim().toLowerCase();

  // Curated hubs matching the current search query
  const matchingHubs = FEATURED_CITY_HUBS.filter((hub) =>
    hub.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const handleSelectHub = (hub: FeaturedCityHub) => {
    onSelectCity({
      name: hub.name,
      latitude: hub.latitude,
      longitude: hub.longitude,
      hubId: hub.id,
    });
    onClose();
  };

  const handleSelectGeocoded = (city: GeocodedCity) => {
    // If it matches an existing featured hub, use the hub ID
    const matchedHub = FEATURED_CITY_HUBS.find(
      (h) => h.name.toLowerCase() === city.name.toLowerCase(),
    );
    onSelectCity({
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      hubId: matchedHub?.id,
    });
    onClose();
  };

  return (
    <div
      className="auth-dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-picker-title"
    >
      <div
        className="auth-dialog-modal city-picker-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-dialog-close-btn"
          onClick={onClose}
          aria-label={tx("Close")}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <header className="auth-dialog-header" style={{ marginBottom: "1.2rem" }}>
          <div className="auth-dialog-leaf-badge">📍</div>
          <h2 id="city-picker-title" style={{ fontSize: "1.35rem", margin: "0.4rem 0 0.2rem" }}>
            {tx("Select city")}
          </h2>
          <p className="auth-dialog-subtitle" style={{ fontSize: "0.88rem", margin: 0 }}>
            {tx("Explore 100% vegan dining spots in your chosen city")}
          </p>
        </header>

        {/* Search input for cities */}
        <div className="city-picker-search-wrap" style={{ position: "relative", marginBottom: "1rem" }}>
          <Search
            size={17}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="city-picker-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tx("Search city")}
            autoFocus
            style={{
              width: "100%",
              padding: "0.75rem 2.4rem 0.75rem 2.6rem",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              fontSize: "0.95rem",
              outline: "none",
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
            }}
          />
          {searching && (
            <LoaderCircle
              size={16}
              className="spin"
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--green)",
              }}
            />
          )}
        </div>

        {/* List of Hubs with Featured Spots */}
        <div className="city-picker-content" style={{ maxHeight: "340px", overflowY: "auto" }}>
          {matchingHubs.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                {tx("Cities with featured vegan spots")}
              </span>
              <div
                className="city-picker-hubs-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {matchingHubs.map((hub) => {
                  const isSelected = hub.name.toLowerCase() === normalizedCurrent;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      className={`city-hub-chip ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectHub(hub)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.8rem",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid var(--green)" : "1px solid var(--line)",
                        background: isSelected ? "var(--green-light)" : "var(--bg-card)",
                        color: isSelected ? "var(--green-dark)" : "var(--text-primary)",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{tx(hub.name)}</span>
                      {isSelected ? (
                        <Check size={14} style={{ color: "var(--green)" }} />
                      ) : (
                        <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                          {hub.restaurants.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remote Geocoded Real City Results */}
          {searchQuery.trim().length >= 2 && (
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                {tx("Other cities")}
              </span>
              {remoteCities.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {remoteCities.map((city) => (
                    <button
                      key={`${city.displayName}-${city.latitude}`}
                      type="button"
                      className="city-remote-item"
                      onClick={() => handleSelectGeocoded(city)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "10px",
                        border: "1px solid var(--line)",
                        background: "var(--bg-card)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        color: "var(--text-primary)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <MapPin size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                      <span>{city.displayName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                !searching && (
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0.5rem 0" }}>
                    {tx("No cities found")}
                  </p>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
