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
  Images,
  LoaderCircle,
  MapPin,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  createRestaurantMenuAnalysis,
  discoverRestaurantMenu,
  getMenuDraft,
  resolveRestaurant,
  searchRestaurants,
} from "../api";
import { MenuEditor } from "../components/MenuEditor";
import { RestaurantDetailPane } from "../components/RestaurantDetailPane";
import { RestaurantMap } from "../components/RestaurantMap";
import { t, tx, useLanguage } from "../i18n";

function newSearchSessionToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function sameRestaurant(left: RestaurantCandidate, right: RestaurantCandidate) {
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
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<RestaurantCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCandidate>();
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [restaurantError, setRestaurantError] = useState("");
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
  const uploadSectionRef = useRef<HTMLElement>(null);
  const draftId = draft?.id;
  const editToken = draft?.editToken;
  const draftStatus = draft?.status;

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && !restaurantQuery) {
      setRestaurantQuery(qParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const query = restaurantQuery.trim();
    if (query.length < 3 || selectedRestaurant || searchSubmitted) {
      if (query.length < 3) setRestaurantResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingRestaurants(true);
      setRestaurantError("");
      try {
        setRestaurantResults(await searchRestaurants(query, {
          signal: controller.signal,
        }));
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setRestaurantResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingRestaurants(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    restaurantQuery,
    searchSubmitted,
    selectedRestaurant,
  ]);

  const selectRestaurant = async (restaurant: RestaurantCandidate) => {
    setSearchingRestaurants(true);
    setRestaurantError("");
    try {
      const resolved = await resolveRestaurant(restaurant);
      setSelectedRestaurant(resolved);
      setRestaurantResults([]);
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
      <div className="page menu-view-page">
        <div className="menu-view-nav-bar">
          <button
            type="button"
            className="secondary-button back-to-map-btn"
            onClick={() => {
              setDraft(undefined);
            }}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{tx("Back to map")}</span>
          </button>
        </div>
        <MenuEditor
          initialMenu={draft}
          sourceFiles={files}
          cached={loadedFromCache}
          onUpdateMenu={setDraft}
          onEditSources={() => {
            setDraft(undefined);
            window.setTimeout(
              () => uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
              50,
            );
          }}
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
    try {
      const results = await searchRestaurants(restaurantQuery.trim() || "vegan", {
        location: { latitude: center.lat, longitude: center.lng },
      });
      setRestaurantResults(results);
      if (results.length === 0) {
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

  return (
    <div className="page fullscreen-map-page">
      <div className="map-view-hero">
        <aside className={`map-floating-sidebar ${!selectedRestaurant && restaurantResults.length === 0 ? "compact-sidebar" : ""}`} aria-label={tx("Search restaurants")}>
          <div className="sidebar-search-header">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setRestaurantError("");
                setSelectedRestaurant(undefined);
                setSearchSubmitted(true);
                setSearchingRestaurants(true);
                try {
                  const results = await searchRestaurants(restaurantQuery);
                  setRestaurantResults(results);
                  if (results.length === 0) {
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
              }}
              className="restaurant-search-form"
            >
              <div className="search-input-wrapper">
                <input
                  value={restaurantQuery}
                  onChange={(event) => {
                    setRestaurantQuery(event.target.value);
                    setSelectedRestaurant(undefined);
                    setSearchSubmitted(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }}
                  aria-label={tx("Search for a restaurant")}
                  placeholder={tx("Search for a restaurant")}
                  autoComplete="off"
                  required
                  minLength={2}
                />
                {restaurantQuery.length > 0 && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setRestaurantQuery("");
                      setSelectedRestaurant(undefined);
                      setSearchSubmitted(false);
                    }}
                    title={t("remove")}
                    aria-label={t("remove")}
                  >
                    <X />
                  </button>
                )}
              </div>
              <button
                className="secondary-button"
                disabled={restaurantQuery.trim().length < 2}
                aria-label={tx("Search restaurants")}
              >
                {searchingRestaurants ? <LoaderCircle className="spin" /> : <Search />}
              </button>
            </form>
          </div>

          {restaurantError && <p className="form-error sidebar-error">{restaurantError}</p>}

          <div className="sidebar-content-area">
            {selectedRestaurant ? (
              <RestaurantDetailPane
                restaurant={selectedRestaurant}
                userCoords={userCoords}
                onClose={() => setSelectedRestaurant(undefined)}
                onOpenMenu={(r) => void selectRestaurant(r)}
                onUploadMenu={(r) => {
                  setSelectedRestaurant(r);
                  uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ) : (
              <div className="sidebar-results-list">
                {restaurantResults.length > 0 ? (
                  <ul className="restaurant-results">
                    {restaurantResults.map((restaurant) => (
                      <li
                        key={restaurant.id}
                        className={sameRestaurant(restaurant, selectedRestaurant ?? restaurant) ? "active clickable" : "clickable"}
                        onClick={() => setSelectedRestaurant(restaurant)}
                      >
                        <div>
                          <strong>{restaurant.name}</strong>
                          <span>{restaurant.address}</span>
                          <div className="restaurant-links">
                            {restaurant.websiteUrl && (
                              <a
                                href={restaurant.websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {tx("Website")} <ExternalLink />
                              </a>
                            )}
                            <a
                              href={restaurant.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {tx("Map")} <ExternalLink />
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="primary-button compact-btn"
                          disabled={searchingRestaurants}
                          onClick={(e) => {
                            e.stopPropagation();
                            void selectRestaurant(restaurant);
                          }}
                        >
                          {tx("Menu")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <div className="map-fullscreen-canvas">
          <RestaurantMap
            restaurants={restaurantResults}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={(restaurant) => {
              setSelectedRestaurant(restaurant);
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
                const captured = [...event.target.files ?? []];
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
                const chosen = [...event.target.files ?? []];
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
                  ><X /></button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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
      {draft?.status === "processing" && (
        <button
          type="button"
          className="text-button cancel-analysis"
          onClick={() => {
            setDraft(undefined);
            setError("");
          }}
        >
          {tx("Cancel analysis")}
        </button>
      )}

      <p className="privacy-note">
        {language === "ca"
          ? "Els fitxers originals es desen amb el menú analitzat perquè es pugui comparar el resultat amb la font. Els menús acabats es comparteixen mitjançant la memòria cau de l'aplicació."
          : "Original files are saved with the analyzed menu so anyone using the result can compare it with the source. Finished restaurant menus are shared through the app’s small cache."}
      </p>
      {(error || draft?.error) && <div className="error-banner">{error || draft?.error}</div>}
    </div>
  );
}
