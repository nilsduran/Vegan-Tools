import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type MenuDraft,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Clock,
  ExternalLink,
  FileImage,
  FileText,
  Globe,
  Images,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import {
  createRestaurantMenuAnalysis,
  discoverMenuByUrl,
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
import { BottomSheet, type SnapPoint } from "../components/BottomSheet";
import { t, tx, useLanguage } from "../i18n";
import { getDirectionsUrl } from "../utils/navigation";
import { formatDistance } from "../utils/distance";
import { generateSafeUUID } from "../utils/uuid";

function newSearchSessionToken() {
  return generateSafeUUID().replaceAll("-", "");
}

function sameRestaurant(left?: RestaurantCandidate, right?: RestaurantCandidate): boolean {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  const leftName = (left.name || "").trim().toLowerCase();
  const rightName = (right.name || "").trim().toLowerCase();
  const leftAddr = (left.address || "").trim().toLowerCase();
  const rightAddr = (right.address || "").trim().toLowerCase();
  return leftName === rightName && leftAddr === rightAddr;
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
  const [curatedPins, setCuratedPins] = useState<RestaurantCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCandidate>();
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string>();
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [restaurantError, setRestaurantError] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(() => {
    const filterParam = searchParams.get("filter");
    return filterParam ? filterParam.split(",").filter(Boolean) : [];
  });
  const [, setSearchSessionToken] = useState(newSearchSessionToken);
  const [approximateLocation, setApproximateLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  }>();
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [websiteUrlInput, setWebsiteUrlInput] = useState("");
  const [submittingUrl, setSubmittingUrl] = useState(false);
  const [fileLimitWarning, setFileLimitWarning] = useState(false);

  const draftId = draft?.id;
  const editToken = draft?.editToken;
  const draftStatus = draft?.status;
  const [sheetSnapPoint, setSheetSnapPoint] = useState<SnapPoint>(() =>
    searchParams.get("place") ? "half" : "collapsed",
  );
  const previousPlaceIdRef = useRef<string | null>(searchParams.get("place"));

  const handleSelectRestaurant = (restaurant?: RestaurantCandidate) => {
    if (restaurant?.placeType === "city") {
      // Geographic navigation: fly to the city and search restaurants there without opening a menu
      setSelectedRestaurant(undefined);
      setUserCoords({ lat: restaurant.latitude, lng: restaurant.longitude });
      setSheetSnapPoint("half");
      void handleSearchArea({ lat: restaurant.latitude, lng: restaurant.longitude }, 5000);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("place");
        return next;
      });
      return;
    }

    setSelectedRestaurant(restaurant);
    if (restaurant) {
      setSheetSnapPoint("half");
    }
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
        const curated = await getCuratedRestaurants(
          loc ? { latitude: loc.latitude, longitude: loc.longitude } : undefined,
        );
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
    if (previousPlaceIdRef.current === placeId) return;
    previousPlaceIdRef.current = placeId;

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

  // Debounced unified real-time search
  useEffect(() => {
    const query = restaurantQuery.trim();
    if (query.length < 2 || selectedRestaurant || searchSubmitted) {
      if (query.length === 0 && !searchSubmitted) {
        setRestaurantResults([]);
        setRestaurantError("");
      }
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingRestaurants(true);
      try {
        const results = await searchRestaurants(query, {
          latitude: userCoords?.lat ?? approximateLocation?.latitude,
          longitude: userCoords?.lng ?? approximateLocation?.longitude,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          const safe = Array.isArray(results) ? results : [];
          setRestaurantResults(safe);
          if (safe.length === 0) {
            setRestaurantError(tx("No matching restaurant was found. Try adding a city or area."));
            setSheetSnapPoint("collapsed");
          } else {
            setRestaurantError("");
            setSheetSnapPoint("half");
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setRestaurantResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingRestaurants(false);
        }
      }
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    restaurantQuery,
    selectedRestaurant,
    userCoords,
    approximateLocation,
    searchSubmitted,
  ]);

  const executeSearch = async (forcedQuery?: string) => {
    const query = (forcedQuery ?? restaurantQuery).trim();
    if (query.length < 2) return;
    setSearchingRestaurants(true);
    setSearchSubmitted(true);
    try {
      const results = await searchRestaurants(query, {
        latitude: userCoords?.lat ?? approximateLocation?.latitude,
        longitude: userCoords?.lng ?? approximateLocation?.longitude,
      });
      const safe = Array.isArray(results) ? results : [];
      setRestaurantResults(safe);
      if (safe.length === 0) {
        setRestaurantError(tx("No matching restaurant was found. Try adding a city or area."));
        setSheetSnapPoint("collapsed");
      } else {
        setRestaurantError("");
        setSheetSnapPoint("half");
      }
    } catch {
      setRestaurantResults([]);
      setRestaurantError(tx("Restaurant search failed."));
      setSheetSnapPoint("collapsed");
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const [openingMenuRestaurantId, setOpeningMenuRestaurantId] = useState<string>();

  const selectRestaurant = async (restaurant: RestaurantCandidate) => {
    setOpeningMenuRestaurantId(restaurant.id);
    setError("");

    try {
      const resolved = await resolveRestaurant(restaurant);
      if (resolved.websiteUrl) {
        const cachedOrDiscovered = await discoverRestaurantMenu(resolved, resolved.websiteUrl);
        if (cachedOrDiscovered) {
          setLoadedFromCache(cachedOrDiscovered.status === "ready" && (cachedOrDiscovered.sections?.length ?? 0) > 0);
          setDraft(cachedOrDiscovered);
          return;
        }
      }
    } catch {
      // Allow manual file upload if menu discovery is unavailable
    } finally {
      setOpeningMenuRestaurantId(undefined);
    }

    handleSelectRestaurant(restaurant);
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearchArea = async (center: { lat: number; lng: number }, radius: number) => {
    setSearchingRestaurants(true);
    try {
      const results = await searchRestaurants("restaurant", {
        latitude: center.lat,
        longitude: center.lng,
        radius,
      });
      const safe = Array.isArray(results) ? results : [];
      setRestaurantResults(safe);
      if (safe.length === 0) {
        setRestaurantError(tx("No matching restaurant was found in this area."));
      } else {
        setRestaurantError("");
      }
    } catch {
      setRestaurantResults([]);
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const handleAddFiles = (incoming: File[]) => {
    const total = files.length + incoming.length;
    if (total > 8) {
      setFileLimitWarning(true);
      const allowed = incoming.slice(0, Math.max(0, 8 - files.length));
      setFiles((prev) => [...prev, ...allowed]);
    } else {
      setFileLimitWarning(false);
      setFiles((prev) => [...prev, ...incoming]);
    }
  };

  useEffect(() => {
    if (!draftId || !editToken || !draftStatus || draftStatus !== "processing") return;
    const interval = window.setInterval(async () => {
      try {
        const next = await getMenuDraft(draftId, editToken);
        setDraft(next);
        if (next.status !== "processing") {
          window.clearInterval(interval);
        }
      } catch {
        window.clearInterval(interval);
      }
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [draftId, draftStatus, editToken]);

  if (draft && draft.status === "processing") {
    return (
      <div className="page menu-view-page menu-loading-view" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", textAlign: "center" }}>
        <button
          type="button"
          className="back-to-search-btn"
          style={{ position: "absolute", top: "1.5rem", left: "1.5rem" }}
          onClick={() => {
            setDraft(undefined);
            setFiles([]);
            setLoadedFromCache(false);
          }}
        >
          <ArrowLeft size={16} />
          <span>{tx("Back to map")}</span>
        </button>
        <div style={{ maxWidth: "460px", background: "white", padding: "2.5rem 2rem", borderRadius: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid var(--line, #e2e8f0)" }}>
          <LoaderCircle className="spin" size={48} style={{ color: "var(--green, #047857)", margin: "0 auto 1.5rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>{draft.restaurantName || selectedRestaurant?.name || tx("Descobrint la carta...")}</h2>
          <p style={{ color: "var(--muted, #64748b)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
            {tx("Llegint la carta oficial i analitzant els plats amb intel·ligència artificial...")}
          </p>
          <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: "60%", height: "100%", background: "var(--green, #047857)", borderRadius: "999px", animation: "pulse 1.5s infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  if (draft && draft.sections && draft.sections.length > 0) {
    return (
      <div className="page menu-view-page">
        <button
          type="button"
          className="back-to-search-btn"
          onClick={() => {
            setDraft(undefined);
            setFiles([]);
            setLoadedFromCache(false);
          }}
        >
          <ArrowLeft size={16} />
          <span>{tx("Back to map")}</span>
        </button>
        <MenuEditor
          initialMenu={draft}
          onUpdateMenu={(updated) => setDraft(updated)}
          cached={loadedFromCache}
          onEditSources={() => {
            setDraft(undefined);
            setLoadedFromCache(false);
            uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  const handleUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const urlToFetch = websiteUrlInput.trim();
    if (!urlToFetch) return;

    setError("");
    setSubmittingUrl(true);
    try {
      const discoveredDraft = await discoverMenuByUrl(urlToFetch, selectedRestaurant?.name);
      if (discoveredDraft && discoveredDraft.sections && discoveredDraft.sections.length > 0) {
        setLoadedFromCache(false);
        setDraft(discoveredDraft);
      } else {
        setError(
          tx(
            "The website menu was found, but no dishes could be extracted. Upload the PDF or menu photos instead.",
          ),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tx("The restaurant website did not return an HTML page or PDF menu."),
      );
    } finally {
      setSubmittingUrl(false);
    }
  };

  const filteredResults = filterRestaurants(restaurantResults, activeFilters);
  const filteredCurated = filterRestaurants(curatedPins, activeFilters);
  const baseDisplayedRestaurants = restaurantResults.length > 0 ? filteredResults : filteredCurated;
  const displayedMapRestaurants =
    selectedRestaurant && !baseDisplayedRestaurants.some((r) => r.id === selectedRestaurant.id)
      ? [selectedRestaurant, ...baseDisplayedRestaurants]
      : baseDisplayedRestaurants;

  const canClearSearch = Boolean(
    restaurantQuery.length > 0 ||
      restaurantResults.length > 0 ||
      selectedRestaurant !== undefined ||
      activeFilters.length > 0,
  );

  return (
    <div className="page fullscreen-map-page">
      <div className="map-view-hero">
        <BottomSheet
          snapPoint={sheetSnapPoint}
          onSnapChange={setSheetSnapPoint}
          isCompact={!selectedRestaurant && filteredResults.length === 0}
          allowDrag={Boolean(selectedRestaurant || filteredResults.length > 0 || searchingRestaurants || searchSubmitted)}
          ariaLabel={tx("Search restaurants")}
          header={
            <div className="sidebar-search-header">
              <SearchTypeahead
                query={restaurantQuery}
                onQueryChange={(val) => {
                  setRestaurantQuery(val);
                  if (val.trim().length === 0) {
                    setRestaurantResults([]);
                    setSheetSnapPoint("collapsed");
                  }
                  if (selectedRestaurant) {
                    handleSelectRestaurant(undefined);
                  }
                  setSearchSubmitted(false);
                }}
                loading={searchingRestaurants}
                canClear={canClearSearch}
                onSubmitSearch={(q) => {
                  void executeSearch(q);
                }}
                onClear={() => {
                  setRestaurantQuery("");
                  setRestaurantResults([]);
                  handleSelectRestaurant(undefined);
                  setSearchSubmitted(false);
                  setRestaurantError("");
                  setSheetSnapPoint("collapsed");
                }}
              />

              <FilterPills
                activeFilters={activeFilters}
                onToggleFilter={(filterId) => {
                  if (filteredResults.length > 0) {
                    setSheetSnapPoint((prev) => (prev === "collapsed" ? "half" : prev));
                  }
                  setActiveFilters((current) =>
                    current.includes(filterId)
                      ? current.filter((id) => id !== filterId)
                      : [...current, filterId],
                  );
                }}
                onClearFilters={() => setActiveFilters([])}
                onExpandChange={(isExpanded) => {
                  if (isExpanded) {
                    setSheetSnapPoint("half");
                  }
                }}
              />

              {restaurantError && <div className="sidebar-error error-banner">{tx(restaurantError)}</div>}
            </div>
          }
        >
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

                    const isCity = restaurant.placeType === "city";

                    return (
                      <li
                        key={restaurant.id}
                        className={selectedRestaurant && sameRestaurant(restaurant, selectedRestaurant) ? "active clickable" : "clickable"}
                        onClick={() => handleSelectRestaurant(restaurant)}
                        onMouseEnter={() => setHoveredRestaurantId(restaurant.id)}
                        onMouseLeave={() => setHoveredRestaurantId(undefined)}
                      >
                        {isCity ? (
                          <div className="city-navigation-item" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <MapPin size={20} className="city-item-icon" style={{ color: "var(--green)", flexShrink: 0 }} aria-hidden="true" />
                            <div>
                              <strong>{restaurant.name}</strong>
                              <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block" }}>{restaurant.address || tx("Explore area")}</span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <strong>{restaurant.name}</strong>
                            <span>{distanceStr && restaurant.address ? `${distanceStr} · ${restaurant.address}` : (distanceStr || restaurant.address || "")}</span>
                            <div className="restaurant-links">
                              <button
                                type="button"
                                className="restaurant-link-btn"
                                disabled={searchingRestaurants || openingMenuRestaurantId === restaurant.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void selectRestaurant(restaurant);
                                }}
                              >
                                {openingMenuRestaurantId === restaurant.id ? (
                                  <LoaderCircle className="spin" size={14} aria-hidden="true" />
                                ) : (
                                  <Utensils aria-hidden="true" />
                                )}
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
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          )}
        </BottomSheet>

        <div className="map-fullscreen-canvas">
          <RestaurantMap
            restaurants={displayedMapRestaurants}
            selectedRestaurant={selectedRestaurant}
            hoveredRestaurantId={hoveredRestaurantId}
            onSelectRestaurant={(restaurant) => {
              handleSelectRestaurant(restaurant);
            }}
            onOpenMenu={(restaurant) => {
              void selectRestaurant(restaurant);
            }}
            onSearchArea={handleSearchArea}
            onUserCoordsChange={setUserCoords}
            onMapClick={() => {
              setSheetSnapPoint("collapsed");
            }}
          />
        </div>
      </div>

      {/* Upload menu section below the map */}
      <section className="menu-upload bottom-menu-upload" ref={uploadSectionRef}>
        <div className="menu-upload-heading">
          <h2>{tx("Add the menu")}</h2>
          <p>{tx("Upload a menu (photos or PDF) to analyze its dishes.")}</p>
        </div>

        {/* 1. Camera and File Options */}
        <div className="upload-options">
          <label className="upload-option camera-option">
            <Camera aria-hidden="true" />
            <span>
              <strong>{tx("Take photos")}</strong>
              <small>{tx("Take one per page")}</small>
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const captured = [...(event.target.files ?? [])];
                handleAddFiles(captured);
                event.target.value = "";
              }}
            />
          </label>
          <label className="upload-option">
            <Images aria-hidden="true" />
            <span>
              <strong>{tx("Choose files")}</strong>
              <small>{tx("Photos or a PDF")}</small>
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                const chosen = [...(event.target.files ?? [])];
                handleAddFiles(chosen);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {/* File limit alert if user attempts more than 8 */}
        {fileLimitWarning && (
          <div className="file-limit-warning" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{tx("Maximum limit of 8 files reached.")}</span>
          </div>
        )}

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

        {files.length > 0 && (
          <button
            type="button"
            className="primary-button large-button"
            disabled={draft?.status === "processing"}
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
        )}

        {/* 2. Direct Website or Menu Link input */}
        <div className="menu-url-section-card">
          <div className="menu-url-header">
            <Globe aria-hidden="true" />
            <h3>{tx("Website or menu link")}</h3>
          </div>
          <form onSubmit={(e) => void handleUrlSubmit(e)} className="menu-url-form">
            <input
              type="url"
              value={websiteUrlInput}
              onChange={(e) => setWebsiteUrlInput(e.target.value)}
              placeholder="https://www.restaurantgreta.com/..."
              aria-label={tx("Website or menu link")}
              required
            />
            <button
              type="submit"
              className="secondary-button submit-url-btn"
              disabled={submittingUrl || !websiteUrlInput.trim()}
              aria-label={tx("Find menu")}
            >
              {submittingUrl ? <LoaderCircle className="spin" /> : <Search size={18} aria-hidden="true" />}
            </button>
          </form>
        </div>
      </section>

      {(error || draft?.error) && <div className="error-banner">{error || draft?.error}</div>}
    </div>
  );
}
