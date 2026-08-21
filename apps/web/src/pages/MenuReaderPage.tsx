import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type MenuDraft,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileImage,
  FileText,
  Globe,
  Images,
  LoaderCircle,
  MapPin,
  Navigation,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import {
  createRestaurantMenuAnalysis,
  discoverRestaurantMenu,
  getApproximateLocation,
  getCuratedRestaurants,
  getMenuDraft,
  resolveRestaurant,
  searchRestaurants,
} from "../api";
import { MenuEditor } from "../components/MenuEditor";
import { RestaurantDetailPane } from "../components/RestaurantDetailPane";
import { RestaurantMap } from "../components/RestaurantMap";
import { SearchTypeahead } from "../components/SearchTypeahead";
import { FilterPills, filterRestaurants } from "../components/FilterPills";
import { t, tx, useLanguage } from "../i18n";
import { getDirectionsUrl } from "../utils/navigation";
import { formatDistance } from "../utils/distance";

function newSearchSessionToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function sameRestaurant(left?: RestaurantCandidate, right?: RestaurantCandidate): boolean {
  if (!left || !right) return false;
  if (left.id === right.id) return true;
  return left.name.trim().toLocaleLowerCase() === right.name.trim().toLocaleLowerCase() &&
    left.address.trim().toLocaleLowerCase() === right.address.trim().toLocaleLowerCase();
}

export function MenuReaderPage() {
  const language = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<MenuDraft>();
  const [error, setError] = useState("");
  const uploadSectionRef = useRef<HTMLElement>(null);
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<RestaurantCandidate[]>([]);
  const [typeaheadSuggestions, setTypeaheadSuggestions] = useState<RestaurantCandidate[]>([]);
  const [searchingTypeahead, setSearchingTypeahead] = useState(false);
  const [curatedPins, setCuratedPins] = useState<RestaurantCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCandidate>();
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [restaurantError, setRestaurantError] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(() => {
    const filterParam = searchParams.get("filter");
    return filterParam ? filterParam.split(",").filter(Boolean) : [];
  });
  const [searchSessionToken, setSearchSessionToken] = useState(
    newSearchSessionToken,
  );
  const [approximateLocation, setApproximateLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  }>();
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const draftId = draft?.id;
  const editToken = draft?.editToken;
  const draftStatus = draft?.status;

  const handleSelectRestaurant = (restaurant?: RestaurantCandidate) => {
    setSelectedRestaurant(restaurant);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (restaurant) {
        next.set("place", restaurant.id);
      } else {
        next.delete("place");
      }
      return next;
    });
  };

  // Synchronize active filters with URL query parameter
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (activeFilters.length > 0) {
        next.set("filter", activeFilters.join(","));
      } else {
        next.delete("filter");
      }
      return next;
    });
  }, [activeFilters, setSearchParams]);

  // Fetch approximate location and preload curated nearby pins strictly for the map canvas
  useEffect(() => {
    let cancelled = false;
    void getApproximateLocation()
      .then(async (loc) => {
        if (cancelled || !loc) return;
        setApproximateLocation(loc);
        const curated = await getCuratedRestaurants(loc);
        if (!cancelled && curated.length > 0) {
          setCuratedPins(curated);
        }
      })
      .catch(() => {
        // Fallback silently
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle URL deep-linking and browser back/forward buttons
  useEffect(() => {
    const placeId = searchParams.get("place");
    if (!placeId) {
      if (selectedRestaurant) {
        setSelectedRestaurant(undefined);
      }
      return;
    }
    if (selectedRestaurant?.id === placeId) return;

    const match =
      restaurantResults.find((r) => r.id === placeId) ||
      curatedPins.find((r) => r.id === placeId);
    if (match) {
      setSelectedRestaurant(match);
    }
  }, [searchParams, restaurantResults, curatedPins, selectedRestaurant]);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && !restaurantQuery) {
      setRestaurantQuery(qParam);
    }
  }, [searchParams]);

  // Debounced typeahead search
  useEffect(() => {
    const query = restaurantQuery.trim();
    if (query.length < 2 || selectedRestaurant) {
      setTypeaheadSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingTypeahead(true);
      try {
        const results = await searchRestaurants(query, {
          latitude: userCoords?.lat ?? approximateLocation?.latitude,
          longitude: userCoords?.lng ?? approximateLocation?.longitude,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setTypeaheadSuggestions(Array.isArray(results) ? results : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setTypeaheadSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingTypeahead(false);
        }
      }
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    restaurantQuery,
    selectedRestaurant,
    userCoords,
    approximateLocation,
  ]);

  const executeSearch = async (queryToSearch: string) => {
    const trimmed = queryToSearch.trim();
    if (trimmed.length < 2) return;
    setRestaurantError("");
    handleSelectRestaurant(undefined);
    setSearchSubmitted(true);
    setSearchingRestaurants(true);
    try {
      const results = await searchRestaurants(trimmed, {
        latitude: userCoords?.lat ?? approximateLocation?.latitude,
        longitude: userCoords?.lng ?? approximateLocation?.longitude,
      });
      const safeResults = Array.isArray(results) ? results : [];
      setRestaurantResults(safeResults);
      if (safeResults.length === 0) {
        setRestaurantError(tx("No matching restaurant was found. Try adding a city or area."));
      }
    } catch (searchError) {
      setRestaurantError(
        searchError instanceof Error ? searchError.message : tx("Restaurant search failed."),
      );
      setRestaurantResults([]);
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const selectRestaurant = async (restaurant: RestaurantCandidate) => {
    setSearchingRestaurants(true);
    setRestaurantError("");
    try {
      const resolved = await resolveRestaurant(restaurant);
      handleSelectRestaurant(resolved);
      setSearchSessionToken(newSearchSessionToken());
      if (resolved.websiteUrl) {
        setLoadedFromCache(false);
        setDraft(await discoverRestaurantMenu(resolved, resolved.websiteUrl));
      } else {
        setRestaurantError(
          "We couldn’t verify an official website automatically. Add menu photos or a PDF below.",
        );
      }
    } catch (selectionError) {
      setRestaurantError(
        selectionError instanceof Error
          ? selectionError.message
          : "The selected restaurant could not be loaded.",
      );
    } finally {
      setSearchingRestaurants(false);
    }
  };

  useEffect(() => {
    if (!draftId || !editToken || draftStatus !== "processing") return;
    let cancelled = false;
    let timeout: number | undefined;
    const poll = async () => {
      try {
        const next = await getMenuDraft(draftId, editToken);
        if (cancelled) return;
        setDraft(next);
        if (next.status === "processing") {
          timeout = window.setTimeout(() => void poll(), 1200);
        }
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : "Analysis check failed.");
      }
    };
    timeout = window.setTimeout(() => void poll(), 400);
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [draftId, draftStatus, editToken]);

  if (draft?.status === "ready" || draft?.status === "published") {
    return (
      <div className="page">
        <header className="page-header">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setDraft(undefined);
              setSelectedRestaurant(undefined);
            }}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{language === "ca" ? "Torna al restaurant" : "Back to restaurant"}</span>
          </button>
          <div className="header-titles">
            <span className="eyebrow">{tx("Restaurant menu")}</span>
            <h1>{draft.restaurantName || (language === "ca" ? "Anàlisi de la carta" : "Menu analysis")}</h1>
          </div>
          {draft.sourceUrl && (
            <a
              href={draft.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="source-link"
            >
              <ExternalLink aria-hidden="true" />
              <span>{language === "ca" ? "Font original" : "Original source"}</span>
            </a>
          )}
        </header>

        <MenuEditor
          initialMenu={draft}
          sourceFiles={files}
          cached={loadedFromCache}
          onUpdateMenu={setDraft}
          onRefresh={() => {
            setDraft(undefined);
            setLoadedFromCache(false);
            setFiles([]);
            window.setTimeout(
              () => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
              0,
            );
          }}
        />
      </div>
    );
  }

  const handleSearchArea = async (center: { lat: number; lng: number }) => {
    setSearchingRestaurants(true);
    setRestaurantError("");
    setSelectedRestaurant(undefined);
    try {
      const results = await searchRestaurants("restaurants", {
        latitude: center.lat,
        longitude: center.lng,
        near: "",
      });
      const safeResults = Array.isArray(results) ? results : [];
      setRestaurantResults(safeResults);
      if (safeResults.length === 0) {
        setRestaurantError(tx("No matching restaurant was found in this area."));
      }
    } catch (err) {
      setRestaurantError(
        err instanceof Error ? err.message : tx("Restaurant search failed."),
      );
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const filteredResults = filterRestaurants(restaurantResults, activeFilters);
  const filteredCurated = filterRestaurants(curatedPins, activeFilters);
  const baseDisplayedRestaurants = restaurantResults.length > 0 ? filteredResults : filteredCurated;
  const displayedMapRestaurants =
    selectedRestaurant && !baseDisplayedRestaurants.some((r) => r.id === selectedRestaurant.id)
      ? [selectedRestaurant, ...baseDisplayedRestaurants]
      : baseDisplayedRestaurants;

  return (
    <div className="page fullscreen-map-page">
      <div className="map-view-hero">
        <aside className={`map-floating-sidebar ${!selectedRestaurant && filteredResults.length === 0 ? "compact-sidebar" : ""}`} aria-label={tx("Search restaurants")}>
          <div className="sidebar-search-header">
            <SearchTypeahead
              query={restaurantQuery}
              onQueryChange={(val) => {
                setRestaurantQuery(val);
                if (selectedRestaurant) {
                  handleSelectRestaurant(undefined);
                }
                setSearchSubmitted(false);
              }}
              suggestions={typeaheadSuggestions}
              loading={searchingTypeahead || searchingRestaurants}
              userCoords={userCoords || (approximateLocation ? { lat: approximateLocation.latitude, lng: approximateLocation.longitude } : undefined)}
              onSelectSuggestion={(restaurant) => {
                setRestaurantQuery(restaurant.name);
                setRestaurantResults((prev) =>
                  prev.some((r) => r.id === restaurant.id) ? prev : [restaurant, ...prev],
                );
                handleSelectRestaurant(restaurant);
              }}
              onSubmitSearch={(q) => void executeSearch(q)}
              onClear={() => {
                setRestaurantQuery("");
                setRestaurantResults([]);
                setTypeaheadSuggestions([]);
                handleSelectRestaurant(undefined);
                setSearchSubmitted(false);
                setRestaurantError("");
              }}
            />

            <FilterPills
              activeFilters={activeFilters}
              onToggleFilter={(filterId) => {
                setActiveFilters((current) =>
                  current.includes(filterId)
                    ? current.filter((id) => id !== filterId)
                    : [...current, filterId],
                );
              }}
              onClearFilters={() => setActiveFilters([])}
            />

            {restaurantError && <div className="sidebar-error error-banner">{restaurantError}</div>}
          </div>

          <div className="sidebar-content-area">
            {selectedRestaurant ? (
              <RestaurantDetailPane
                restaurant={selectedRestaurant}
                userCoords={userCoords}
                onClose={() => handleSelectRestaurant(undefined)}
                onOpenMenu={(r) => void selectRestaurant(r)}
                onUploadMenu={(r) => {
                  handleSelectRestaurant(r);
                  uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ) : (
              <div className="sidebar-results-list">
                {filteredResults.length > 0 ? (
                  <ul className="restaurant-results">
                    {filteredResults.map((restaurant) => {
                      const directionsUrl = getDirectionsUrl(restaurant);
                      const distanceStr = formatDistance(
                        userCoords || (approximateLocation ? { lat: approximateLocation.latitude, lng: approximateLocation.longitude } : undefined),
                        { lat: restaurant.latitude, lng: restaurant.longitude },
                      );

                      return (
                        <li
                          key={restaurant.id}
                          className={sameRestaurant(restaurant, selectedRestaurant ?? restaurant) ? "active clickable" : "clickable"}
                          onClick={() => handleSelectRestaurant(restaurant)}
                        >
                          <div>
                            <strong>{restaurant.name}</strong>
                            <span>{distanceStr ? `${distanceStr} · ${restaurant.address}` : restaurant.address}</span>
                            <div className="restaurant-links">
                              <button
                                type="button"
                                className="restaurant-link-btn"
                                disabled={searchingRestaurants}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void selectRestaurant(restaurant);
                                }}
                              >
                                <Utensils aria-hidden="true" />
                                <span>{tx("Menu")}</span>
                              </button>
                              {restaurant.websiteUrl && (
                                <a
                                  href={restaurant.websiteUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe aria-hidden="true" />
                                  <span>{tx("Website")}</span>
                                </a>
                              )}
                              <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Navigation aria-hidden="true" />
                                <span>{tx("Directions")}</span>
                              </a>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <div className="map-fullscreen-canvas">
          <RestaurantMap
            restaurants={displayedMapRestaurants}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={(restaurant) => {
              handleSelectRestaurant(restaurant);
            }}
            onOpenMenu={(restaurant) => {
              void selectRestaurant(restaurant);
            }}
            onSearchArea={handleSearchArea}
            onUserCoordsChange={setUserCoords}
          />
        </div>
      </div>

      {/* Upload menu section below the map */}
      <section className="menu-upload bottom-menu-upload" ref={uploadSectionRef}>
        <div className="menu-upload-heading">
          <h2>{tx("Add the menu")}</h2>
          <p>{tx("Upload a menu (photos or PDF) to analyze its dishes.")}</p>
        </div>
        <div className="upload-options">
          <label className="upload-option camera-option">
            <Camera aria-hidden="true" />
            <span>
              <strong>{tx("Take photos")}</strong>
              <small>{tx("Take one per page—you can add up to 8")}</small>
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const captured = [...(event.target.files ?? [])];
                setFiles((current) => [...current, ...captured].slice(0, 8));
                event.target.value = "";
              }}
            />
          </label>
          <label className="upload-option">
            <Images aria-hidden="true" />
            <span>
              <strong>{tx("Choose files")}</strong>
              <small>{tx("Photos or a PDF, up to 8 files")}</small>
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const chosen = [...(event.target.files ?? [])];
                setFiles((current) => [...current, ...chosen].slice(0, 8));
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {files.length > 0 && (
          <>
            <div className="file-list-heading">
              <span>
                {files.length}{" "}
                {language === "ca"
                  ? `${files.length === 1 ? "pàgina" : "pàgines"} a punt`
                  : `${files.length === 1 ? "page" : "pages"} ready`}
              </span>
              <small>{tx("Photos are read in this order.")}</small>
            </div>
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`}>
                  <span className="file-number">{index + 1}</span>
                  {file.type === "application/pdf" ? <FileText /> : <FileImage />}
                  <span>{file.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles(files.filter((_, candidate) => candidate !== index))}
                  >
                    <X />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <button
          className="primary-button large-button"
          disabled={files.length === 0 || draft?.status === "processing"}
          onClick={async () => {
            setError("");
            try {
              setLoadedFromCache(false);
              setDraft(await createRestaurantMenuAnalysis(files, selectedRestaurant));
            } catch (analysisError) {
              setError(analysisError instanceof Error ? analysisError.message : tx("Analysis failed."));
            }
          }}
        >
          {draft?.status === "processing" ? <LoaderCircle className="spin" /> : <Upload />}
          {draft?.status === "processing" ? tx("Extracting dishes…") : t("analyze")}
        </button>
      </section>

      {(error || draft?.error) && <div className="error-banner">{error || draft?.error}</div>}
    </div>
  );
}
