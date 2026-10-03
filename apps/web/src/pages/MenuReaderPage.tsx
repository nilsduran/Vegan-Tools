/**
 * @file MenuReaderPage.tsx
 * @description Interactive menu reader and restaurant exploration view.
 * Combines map browsing, restaurant details pane, manual and automated menu scanning (PDFs/photos),
 * menu caching, and dish classification rendering.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  findCuratedMenu,
  FEATURED_RESTAURANTS,
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
  getRestaurantById,
  getRestaurantMenu,
  resolveRestaurant,
  searchRestaurants,
} from "../api";
import { MenuEditor } from "../components/MenuEditor";
import { RestaurantDetailPane } from "../components/RestaurantDetailPane";
import { RestaurantMap, getCuisineIcon } from "../components/RestaurantMap";
import { SearchTypeahead } from "../components/SearchTypeahead";
import { FilterPills, filterRestaurants } from "../components/FilterPills";
import { BottomSheet, type SnapPoint } from "../components/BottomSheet";
import { t, tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";
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
  useDocumentHead({
    title: t("map"),
    description: t("mapSummary"),
    path: "/map",
    type: "website",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<MenuDraft>();
  const [error, setError] = useState("");
  const uploadSectionRef = useRef<HTMLElement>(null);
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<RestaurantCandidate[]>([]);
  const [curatedPins, setCuratedPins] = useState<RestaurantCandidate[]>(FEATURED_RESTAURANTS);
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
  const [hasRealGps, setHasRealGps] = useState(false);
  const [mapCenterTarget, setMapCenterTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
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
      // Geographic navigation: fly immediately to the city and search restaurants there
      setSelectedRestaurant(undefined);
      setMapCenterTarget({ lat: restaurant.latitude, lng: restaurant.longitude, zoom: 13 });
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
      if (restaurant.websiteUrl) {
        setWebsiteUrlInput(restaurant.websiteUrl);
      }
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
    const loadCuratedPins = async () => {
      try {
        const loc = await getApproximateLocation().catch(() => null);
        if (cancelled) return;
        if (loc) {
          setApproximateLocation(loc);
        }
        const curated = await getCuratedRestaurants(
          loc ? { latitude: loc.latitude, longitude: loc.longitude } : undefined,
        );
        if (!cancelled && curated.length > 0) {
          const existingIds = new Set(curated.map((c) => c.id));
          const merged = [
            ...curated,
            ...FEATURED_RESTAURANTS.filter((f) => !existingIds.has(f.id)),
          ];
          setCuratedPins(merged);
        }
      } catch {
        // Fallback silently and retain bundled FEATURED_RESTAURANTS
      }
    };
    void loadCuratedPins();
    return () => {
      cancelled = true;
    };
  }, []);

  const [openingMenuRestaurantId, setOpeningMenuRestaurantId] = useState<string>();

  const selectRestaurant = async (restaurant: RestaurantCandidate) => {
    setOpeningMenuRestaurantId(restaurant.id);
    setError("");

    try {
      // 1. Check curated verified menu first (instant 0ms, offline-first & reliable)
      const curated = findCuratedMenu(restaurant.id, restaurant.name);
      if (curated && curated.sections && curated.sections.length > 0) {
        setLoadedFromCache(true);
        setDraft(curated);
        return;
      }

      // 2. Check cached menu from API
      const menu = await getRestaurantMenu(restaurant.id);
      if (menu && menu.sections && menu.sections.length > 0) {
        setLoadedFromCache(true);
        setDraft(menu);
        return;
      }

      // 3. Try online discovery via official website
      const resolved = await resolveRestaurant(restaurant);
      if (resolved.websiteUrl) {
        setWebsiteUrlInput(resolved.websiteUrl);
        const cachedOrDiscovered = await discoverRestaurantMenu(resolved, resolved.websiteUrl);
        if (cachedOrDiscovered) {
          if (cachedOrDiscovered.status === "ready" && (cachedOrDiscovered.sections?.length ?? 0) > 0) {
            setLoadedFromCache(true);
            setDraft(cachedOrDiscovered);
            return;
          }
          if (cachedOrDiscovered.status === "processing") {
            setLoadedFromCache(false);
            setDraft(cachedOrDiscovered);
            return;
          }
        }
      }
    } catch {
      // Allow manual file upload if menu discovery is unavailable
    } finally {
      setOpeningMenuRestaurantId(undefined);
    }

    handleSelectRestaurant(restaurant);
    uploadSectionRef.current?.scrollIntoView?.({ behavior: "smooth" });
  };

  // Handle URL deep-linking and browser back/forward buttons
  useEffect(() => {
    const rawPlaceId = searchParams.get("place");
    const autoScan = searchParams.get("scan") === "true";
    if (!rawPlaceId) {
      if (selectedRestaurant) {
        setSelectedRestaurant(undefined);
      }
      previousPlaceIdRef.current = null;
      return;
    }

    // Auto-normalize legacy or manual featured- prefix in the browser URL
    const cleanId = rawPlaceId.replace(/^featured-/, "");
    if (rawPlaceId !== cleanId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("place", cleanId);
        return next;
      }, { replace: true });
    }

    if (previousPlaceIdRef.current === cleanId) return;
    previousPlaceIdRef.current = cleanId;

    if (selectedRestaurant?.id === cleanId) {
      if (autoScan && !draft) {
        void selectRestaurant(selectedRestaurant);
      }
      return;
    }

    const match =
      restaurantResults.find((r) => r.id === cleanId) ||
      curatedPins.find((r) => r.id === cleanId);
    if (match) {
      setSelectedRestaurant(match);
      setSheetSnapPoint("half");
      if (autoScan) {
        void selectRestaurant(match);
      }
    } else {
      // If not yet loaded in local pins, fetch candidate directly from API
      void getRestaurantById(cleanId).then((candidate) => {
        if (candidate) {
          setSelectedRestaurant(candidate);
          setSheetSnapPoint("half");
          if (autoScan) {
            void selectRestaurant(candidate);
          }
        }
      });
    }
  }, [searchParams, restaurantResults, curatedPins, selectedRestaurant, setSearchParams]);

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

  const handleSearchArea = async (
    center: { lat: number; lng: number },
    radius: number,
    bbox?: [number, number, number, number],
  ) => {
    setSearchingRestaurants(true);
    setSearchSubmitted(true);
    try {
      const results = await searchRestaurants("restaurant", {
        latitude: center.lat,
        longitude: center.lng,
        radius,
        bbox,
      });
      const safe = Array.isArray(results) ? results : [];
      setRestaurantResults(safe);
      setSheetSnapPoint("half");
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
    let pollCount = 0;
    const maxPolls = 20; // Max 40 seconds before transitioning to manual upload fallback

    const interval = window.setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        window.clearInterval(interval);
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: "failed",
                error: tx(
                  "Website analysis took too long. You can upload the menu directly as a photo or PDF.",
                ),
              }
            : undefined,
        );
        return;
      }

      try {
        const next = await getMenuDraft(draftId, editToken);
        setDraft(next);
        if (next.status !== "processing") {
          window.clearInterval(interval);
        }
      } catch {
        if (pollCount > 3) {
          window.clearInterval(interval);
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  error: tx(
                    "Could not obtain official menu automatically. You can upload photos or PDF directly.",
                  ),
                }
              : undefined,
          );
        }
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
        <div style={{ maxWidth: "480px", width: "100%", background: "white", padding: "2.5rem 2rem", borderRadius: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid var(--line, #e2e8f0)" }}>
          <LoaderCircle className="spin" size={48} style={{ color: "var(--green, #047857)", margin: "0 auto 1.5rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>{draft.restaurantName || selectedRestaurant?.name || tx("Discovering menu...")}</h2>
          <p style={{ color: "var(--muted, #64748b)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
            {tx("Reading official menu and analyzing dishes with artificial intelligence...")}
          </p>
          <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{ width: "60%", height: "100%", background: "var(--green, #047857)", borderRadius: "999px", animation: "pulse 1.5s infinite" }} />
          </div>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: "0.88rem", padding: "0.6rem 1.25rem", margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            onClick={() => {
              const currentRestaurant = selectedRestaurant;
              setDraft(undefined);
              setFiles([]);
              setLoadedFromCache(false);
              if (currentRestaurant) {
                handleSelectRestaurant(currentRestaurant);
              }
              window.setTimeout(() => {
                uploadSectionRef.current?.scrollIntoView?.({ behavior: "smooth" });
              }, 100);
            }}
          >
            <Upload size={15} />
            <span>{tx("Cancel and upload menu manually")}</span>
          </button>
        </div>
      </div>
    );
  }

  if (draft && draft.status === "failed") {
    return (
      <div className="page menu-view-page menu-failed-view" style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", textAlign: "center" }}>
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
        <div style={{ maxWidth: "500px", width: "100%", background: "white", padding: "2.5rem 2rem", borderRadius: "18px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", border: "1px solid var(--line, #e2e8f0)" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            {draft.restaurantName || selectedRestaurant?.name || tx("Menu not available automatically")}
          </h2>
          <p style={{ color: "var(--muted, #64748b)", fontSize: "0.92rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
            {draft.error
              ? tx(draft.error)
              : tx("No readable menu page or PDF was found on the restaurant website. Upload the menu instead.")}
          </p>

          <div style={{ border: "2px dashed var(--line, #cbd5e1)", borderRadius: "14px", padding: "1.5rem 1rem", background: "var(--bg-subtle)", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: "0.5rem", color: "var(--green, #047857)" }}>
                <Camera size={24} />
                <FileText size={24} />
              </div>
              <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>{tx("Choose menu photos or a PDF")}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>{tx("JPG, PNG or PDF (max. 8 pages)")}</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(event) => {
                  const chosen = [...(event.target.files ?? [])];
                  handleAddFiles(chosen);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Direct website or menu URL input fallback */}
          <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              {tx("Or enter website or direct link to menu (PDF/web):")}
            </label>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const url = websiteUrlInput.trim();
                if (!url) return;
                setSubmittingUrl(true);
                setError("");
                try {
                  const res = await discoverMenuByUrl(url, selectedRestaurant?.name);
                  if (res && res.sections && res.sections.length > 0) {
                    setLoadedFromCache(false);
                    setDraft(res);
                  } else {
                    setError(
                      tx(
                        "The website menu was found, but no dishes could be extracted. Upload the PDF or menu photos instead.",
                      ),
                    );
                  }
                } catch (urlErr) {
                  setError(
                    urlErr instanceof Error
                      ? urlErr.message
                      : tx("The restaurant website did not return an HTML page or PDF menu."),
                  );
                } finally {
                  setSubmittingUrl(false);
                }
              }}
              style={{ display: "flex", gap: "0.5rem" }}
            >
              <input
                type="url"
                value={websiteUrlInput}
                onChange={(e) => setWebsiteUrlInput(e.target.value)}
                placeholder="https://..."
                required
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #cbd5e1)",
                  background: "var(--bg-subtle, #f8fafc)",
                  fontSize: "0.88rem",
                }}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={submittingUrl || !websiteUrlInput.trim()}
                style={{ padding: "0.55rem 0.9rem", fontSize: "0.88rem", whiteSpace: "nowrap" }}
              >
                {submittingUrl ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Search size={15} />
                )}
                <span>{tx("Find menu")}</span>
              </button>
            </form>
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem", color: "var(--text)" }}>
                {files.length} {files.length === 1 ? (language === "ca" ? "pàgina a punt" : "page ready") : (language === "ca" ? "pàgines a punt" : "pages ready")}
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={async () => {
                  setError("");
                  try {
                    setDraft(await createRestaurantMenuAnalysis(files, selectedRestaurant));
                  } catch (analysisError) {
                    setError(analysisError instanceof Error ? analysisError.message : tx("Analysis failed."));
                  }
                }}
              >
                <Upload size={16} />
                <span>{t("analyze")}</span>
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setDraft(undefined);
                setFiles([]);
                setLoadedFromCache(false);
              }}
            >
              <ArrowLeft size={16} />
              <span>{tx("Back to map")}</span>
            </button>
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
  const baseDisplayedRestaurants =
    restaurantResults.length > 0
      ? [
          ...filteredResults,
          ...filteredCurated.filter(
            (c) => c.isFeatured && !filteredResults.some((r) => r.id === c.id),
          ),
        ]
      : filteredCurated;
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
          className={selectedRestaurant && filteredResults.length > 0 ? "has-split-pane" : ""}
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
                  if (selectedRestaurant) {
                    handleSelectRestaurant(undefined);
                  } else {
                    setRestaurantQuery("");
                    setRestaurantResults([]);
                    setSearchSubmitted(false);
                    setRestaurantError("");
                    setSheetSnapPoint("collapsed");
                  }
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
          {(() => {
            const resultsListSource = filteredResults;
            if (!selectedRestaurant && resultsListSource.length === 0) {
              return null;
            }

            const resultsListView = (
              <div className="sidebar-results-list">
                {resultsListSource.length > 0 ? (
                  <ul className="restaurant-results">
                    {resultsListSource.map((restaurant) => {
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
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <span aria-hidden="true" style={{ fontSize: "1.05rem" }}>{getCuisineIcon(restaurant)}</span>
                                <strong>{restaurant.name}</strong>
                              </div>
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
                                    <span>
                                      {/instagram\.com/i.test(restaurant.websiteUrl)
                                        ? tx("Instagram")
                                        : /facebook\.com/i.test(restaurant.websiteUrl)
                                          ? tx("Facebook")
                                          : tx("Website")}
                                    </span>
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
            );

            if (selectedRestaurant && resultsListSource.length > 0) {
              return (
                <div className="desktop-split-pane-layout">
                  <div className="desktop-split-results">
                    {resultsListView}
                  </div>
                  <div className="desktop-split-detail">
                    <RestaurantDetailPane
                      restaurant={selectedRestaurant}
                      userCoords={userCoords}
                      hasRealGps={hasRealGps}
                      onClose={() => handleSelectRestaurant(undefined)}
                      onOpenMenu={(r) => void selectRestaurant(r)}
                      onUploadMenu={(r) => {
                        handleSelectRestaurant(r);
                        uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                      }}
                    />
                  </div>
                </div>
              );
            }

            if (selectedRestaurant) {
              return (
                <RestaurantDetailPane
                  restaurant={selectedRestaurant}
                  userCoords={userCoords}
                  hasRealGps={hasRealGps}
                  onClose={() => handleSelectRestaurant(undefined)}
                  onOpenMenu={(r) => void selectRestaurant(r)}
                  onUploadMenu={(r) => {
                    handleSelectRestaurant(r);
                    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              );
            }

            return resultsListView;
          })()}
        </BottomSheet>

        <div className="map-fullscreen-canvas">
          <RestaurantMap
            restaurants={displayedMapRestaurants}
            selectedRestaurant={selectedRestaurant}
            hoveredRestaurantId={hoveredRestaurantId}
            mapCenterTarget={mapCenterTarget}
            onSelectRestaurant={(restaurant) => {
              handleSelectRestaurant(restaurant);
            }}
            onOpenMenu={(restaurant) => {
              void selectRestaurant(restaurant);
            }}
            onSearchArea={handleSearchArea}
            onUserCoordsChange={(coords, isReal) => {
              setUserCoords(coords);
              if (isReal) setHasRealGps(true);
            }}
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

        {/* 1. Direct Website or Menu Link input */}
        <div className="menu-url-section-card" style={{ marginBottom: "1.25rem" }}>
          <div className="menu-url-header">
            <Globe aria-hidden="true" />
            <h3>{tx("Website or menu link")}</h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0.2rem 0 0.75rem" }}>
            {tx("Enter the restaurant's website or direct link to their menu (PDF or web):")}
          </p>
          <form onSubmit={(e) => void handleUrlSubmit(e)} className="menu-url-form">
            <input
              type="url"
              value={websiteUrlInput}
              onChange={(e) => setWebsiteUrlInput(e.target.value)}
              placeholder={selectedRestaurant?.websiteUrl || "https://..."}
              aria-label={tx("Website or menu link")}
              required
            />
            <button
              type="submit"
              className="primary-button submit-url-btn"
              disabled={submittingUrl || !websiteUrlInput.trim()}
              aria-label={tx("Find menu")}
            >
              {submittingUrl ? <LoaderCircle className="spin" /> : <Search size={18} aria-hidden="true" />}
              <span>{tx("Find menu")}</span>
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", margin: "1rem 0", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 500 }}>
          <span>— {tx("or upload photos / PDF")} —</span>
        </div>

        {/* 2. Camera and File Options */}
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
      </section>

      {(error || draft?.error) && <div className="error-banner">{error || draft?.error}</div>}
    </div>
  );
}
