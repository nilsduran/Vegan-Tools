import { useEffect, useRef, useState } from "react";
import {
  type MenuDraft,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import {
  Camera,
  Clock3,
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
  getRecentRestaurantMenus,
  resolveRestaurant,
  searchRestaurants,
  type CachedRestaurantMenu,
} from "../api";
import { MenuEditor } from "../components/MenuEditor";
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
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<MenuDraft>();
  const [error, setError] = useState("");
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<RestaurantCandidate[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantCandidate>();
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [restaurantError, setRestaurantError] = useState("");
  const [manualWebsiteUrl, setManualWebsiteUrl] = useState("");
  const [directWebsiteUrl, setDirectWebsiteUrl] = useState("");
  const [searchSessionToken, setSearchSessionToken] = useState(
    newSearchSessionToken,
  );
  const [approximateLocation, setApproximateLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [locationRequested, setLocationRequested] = useState(false);
  const [recentMenus, setRecentMenus] = useState<CachedRestaurantMenu[]>([]);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const uploadSectionRef = useRef<HTMLElement>(null);
  const draftId = draft?.id;
  const editToken = draft?.editToken;
  const draftStatus = draft?.status;

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
          autocomplete: true,
          sessionToken: searchSessionToken,
          location: approximateLocation,
          signal: controller.signal,
        }));
      } catch (searchError) {
        if (controller.signal.aborted) return;
        // Suggestions are best-effort. Enter or the Search button still runs
        // the full provider search if autocomplete is unavailable.
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
    approximateLocation,
    restaurantQuery,
    searchSessionToken,
    searchSubmitted,
    selectedRestaurant,
  ]);

  useEffect(() => {
    let cancelled = false;
    void getRecentRestaurantMenus()
      .then((menus) => {
        if (!cancelled) setRecentMenus(menus);
      })
      .catch(() => {
        if (!cancelled) setRecentMenus([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startWebsiteDiscovery = async (
    restaurant: RestaurantCandidate,
    websiteUrl: string,
  ) => {
    setError("");
    setRestaurantError("");
    try {
      setLoadedFromCache(false);
      setDraft(await discoverRestaurantMenu(restaurant, websiteUrl));
    } catch (discoveryError) {
      setRestaurantError(
        discoveryError instanceof Error
          ? discoveryError.message
          : "Could not search this restaurant website.",
      );
    }
  };

  const requestApproximateLocation = (force = false) => {
    if (!force && (locationRequested || approximateLocation)) return;
    setLocationRequested(true);
    if (!navigator.geolocation) {
      setRestaurantError("Approximate location is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setApproximateLocation({
          latitude: Math.round(coords.latitude * 100) / 100,
          longitude: Math.round(coords.longitude * 100) / 100,
        });
        setRestaurantError("");
      },
      () => setRestaurantError(
        "Location was not available. Include the city in the search and press Search.",
      ),
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 30 * 60_000 },
    );
  };

  const selectRestaurant = async (restaurant: RestaurantCandidate) => {
    setSearchingRestaurants(true);
    setRestaurantError("");
    try {
      const resolved = await resolveRestaurant(restaurant);
      setSelectedRestaurant(resolved);
      setRestaurantResults([]);
      setManualWebsiteUrl(resolved.websiteUrl ?? "");
      setSearchSessionToken(newSearchSessionToken());
      const saved = recentMenus.find((item) => sameRestaurant(item.restaurant, resolved));
      if (saved) {
        setDraft(saved.menu);
        setLoadedFromCache(true);
        return;
      }
      if (resolved.websiteUrl) {
        await startWebsiteDiscovery(resolved, resolved.websiteUrl);
      } else {
        setRestaurantError(
          "We couldn’t verify an official website automatically. Paste one below or add menu photos.",
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
    const deadline = Date.now() + 185_000;

    const poll = async () => {
      try {
        const next = await getMenuDraft(draftId, editToken);
        if (cancelled) return;
        setDraft(next);
        if (next.status === "processing") {
          if (Date.now() >= deadline) {
            setError("Menu analysis took too long. Please try again with a clear image.");
            setDraft(undefined);
            return;
          }
          timeout = window.setTimeout(() => void poll(), 1_000);
        }
      } catch (pollError) {
        if (cancelled) return;
        setError(pollError instanceof Error ? pollError.message : "Analysis failed.");
        setDraft(undefined);
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
      <MenuEditor
        initialMenu={draft}
        sourceFiles={files}
        cached={loadedFromCache}
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
    );
  }

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <h1>{t("menus")}</h1>
        <p>{t("menusSummary")}</p>
      </header>

      <section className="restaurant-search" aria-label={tx("Search restaurants")}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setRestaurantError("");
            setSelectedRestaurant(undefined);
            setSearchSubmitted(true);
            setSearchingRestaurants(true);
            try {
              const results = await searchRestaurants(restaurantQuery, {
                location: approximateLocation,
              });
              setRestaurantResults(results);
              if (results.length === 0) {
                setRestaurantError("No matching restaurant was found. Try adding a city or area.");
              }
            } catch (searchError) {
              setRestaurantError(
                searchError instanceof Error ? searchError.message : "Restaurant search failed.",
              );
              setRestaurantResults([]);
            } finally {
              setSearchingRestaurants(false);
            }
          }}
          className="restaurant-search-form"
        >
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
            minLength={3}
          />
          <button
            className="secondary-button"
            disabled={restaurantQuery.trim().length < 3}
            aria-label={tx("Search restaurants")}
          >
            {searchingRestaurants ? <LoaderCircle className="spin" /> : <Search />}
            {tx("Search")}
          </button>
        </form>
        <button
          type="button"
          className={`location-bias-button${approximateLocation ? " active" : ""}`}
          onClick={() => {
            if (approximateLocation) {
              setApproximateLocation(undefined);
              setLocationRequested(false);
              return;
            }
            setLocationRequested(false);
            requestApproximateLocation(true);
          }}
        >
          <MapPin />
          {approximateLocation ? tx("Using approximate location") : tx("Prioritize places near me")}
        </button>

        {restaurantResults.length > 0 && !selectedRestaurant && (
          <ul className="restaurant-results">
            {restaurantResults.map((restaurant) => (
              <li key={restaurant.id}>
                <div>
                  <strong>{restaurant.name}</strong>
                  <span>{restaurant.address}</span>
                  <div className="restaurant-links">
                    {restaurant.websiteUrl && (
                      <a href={restaurant.websiteUrl} target="_blank" rel="noreferrer">
                        {tx("Website")} <ExternalLink />
                      </a>
                    )}
                    <a href={restaurant.mapUrl} target="_blank" rel="noreferrer">
                      {tx("Map")} <ExternalLink />
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={searchingRestaurants}
                  onClick={() => void selectRestaurant(restaurant)}
                >
                  {tx("Use this restaurant")}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedRestaurant && (
          <div className="selected-restaurant">
            <div>
              <small>{tx("Selected restaurant")}</small>
              <strong>{selectedRestaurant.name}</strong>
              <span>{selectedRestaurant.address}</span>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setSelectedRestaurant(undefined)}
            >
              {tx("Change")}
            </button>
            <details className="website-discovery">
              <summary>{tx("Use a website or menu link")}</summary>
              <form
                className="website-discovery-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void startWebsiteDiscovery(selectedRestaurant, manualWebsiteUrl);
                }}
              >
                <label>
                  {tx("Official website")}
                  <input
                    type="url"
                    inputMode="url"
                    value={manualWebsiteUrl}
                    onChange={(event) => setManualWebsiteUrl(event.target.value)}
                    placeholder="https://restaurant.example/menu"
                    required
                  />
                </label>
                <button
                  className="secondary-button"
                  disabled={!manualWebsiteUrl.trim() || draft?.status === "processing"}
                >
                  {draft?.status === "processing"
                    ? <LoaderCircle className="spin" />
                    : <Search />}
                  {draft?.status === "processing" ? tx("Finding menu…") : tx("Find menu")}
                </button>
              </form>
              {!selectedRestaurant.websiteUrl && (
                <a
                  className="google-search-link"
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${selectedRestaurant.name} ${selectedRestaurant.address} official website`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tx("Check Google results")} <ExternalLink />
                </a>
              )}
            </details>
          </div>
        )}
        {!selectedRestaurant && (
          <details className="direct-website">
            <summary>{tx("Can’t find the restaurant?")}</summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const manualRestaurant: RestaurantCandidate = {
                  id: "manual",
                  name: restaurantQuery.trim(),
                  address: "",
                  latitude: 0,
                  longitude: 0,
                  websiteUrl: directWebsiteUrl,
                  mapUrl: directWebsiteUrl,
                  provider: "openstreetmap",
                };
                setSelectedRestaurant(manualRestaurant);
                setManualWebsiteUrl(directWebsiteUrl);
                void startWebsiteDiscovery(manualRestaurant, directWebsiteUrl);
              }}
            >
              <label>
                {tx("Restaurant name")}
                <input
                  value={restaurantQuery}
                  onChange={(event) => setRestaurantQuery(event.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                {tx("Official website")}
                <input
                  type="url"
                  inputMode="url"
                  value={directWebsiteUrl}
                  onChange={(event) => setDirectWebsiteUrl(event.target.value)}
                  placeholder="https://restaurant.example"
                  required
                />
              </label>
              <button
                className="secondary-button"
                disabled={
                  restaurantQuery.trim().length < 3 ||
                  !directWebsiteUrl.trim() ||
                  draft?.status === "processing"
                }
              >
                <Search />{tx("Find menu")}
              </button>
            </form>
          </details>
        )}
        {restaurantError && <div className="inline-error">{restaurantError}</div>}
        <small className="osm-credit">
          {language === "ca" ? "Dades de restaurants de " : "Restaurant data from "}
          {
            restaurantResults.length === 0
              ? language === "ca"
                ? "Foursquare, amb OpenStreetMap com a alternativa"
                : "Foursquare, with OpenStreetMap fallback"
              : restaurantResults.some((result) => result.provider === "foursquare")
              ? "Foursquare"
              : language === "ca"
                ? "les persones col·laboradores d'OpenStreetMap"
                : "OpenStreetMap contributors"
          }.
        </small>
      </section>

      {recentMenus.length > 0 && (
        <details className="recent-menus">
          <summary><Clock3 /> {tx("Recent menus")} <span>{recentMenus.length}</span></summary>
          <ul>
            {recentMenus.map((item) => (
              <li key={`${item.restaurant.id}-${item.savedAt}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRestaurant(item.restaurant);
                    setRestaurantQuery(item.restaurant.name);
                    setDraft(item.menu);
                    setLoadedFromCache(true);
                  }}
                >
                  <span>
                    <strong>{item.restaurant.name}</strong>
                    <small>{item.restaurant.address || tx("Saved menu")}</small>
                  </span>
                  {tx("Open")}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="menu-upload" ref={uploadSectionRef}>
        <div className="upload-divider"><span>{tx("Add the menu")}</span></div>
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
            setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
          }
        }}
      >
        {draft?.status === "processing" ? <LoaderCircle className="spin" /> : <Upload />}
        {draft?.status === "processing" ? tx("Extracting dishes…") : t("analyze")}
      </button>
      {draft?.status === "processing" && (
        <>
          <p className="privacy-note">
            {language === "ca"
              ? "Una foto o un menú curt pot trigar pocs segons. Els menús llargs de diverses pàgines poden trigar un parell de minuts."
              : "A photo or short menu may finish in a few seconds. Large, multi-page menus can take a couple of minutes."}
          </p>
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
        </>
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
