/**
 * @file RestaurantMenuPage.tsx
 * @description Dedicated standalone view for exploring a restaurant's complete menu (/restaurant/:id/menu).
 * Provides full dietary filtering (vegan, vegetarian, adaptable dishes), price details,
 * ingredient rationale, and allergen indicators based on the user's dietary preferences.
 */

import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Compass,
  FileText,
  Globe,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";
import {
  findCuratedMenu,
  type MenuDraft,
  type RestaurantCandidate,
} from "@vegan-tools/domain";
import {
  createRestaurantMenuAnalysis,
  discoverMenuByUrl,
  discoverRestaurantMenu,
  getMenuDraft,
  getRestaurantById,
  getRestaurantMenu,
  resolveRestaurant,
} from "../api";
import { MenuView } from "../components/MenuView";
import { tx, useLanguage } from "../i18n";
import { getCachedRestaurant, saveCachedRestaurant } from "../utils/restaurantCache";

function isSocialMediaUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const blocked = [
      "facebook.com",
      "instagram.com",
      "tiktok.com",
      "twitter.com",
      "x.com",
      "tripadvisor.com",
      "yelp.com",
      "thefork.com",
      "glovoapp.com",
      "ubereats.com",
    ];
    return blocked.some((b) => hostname === b || hostname.endsWith(`.${b}`));
  } catch {
    return false;
  }
}

async function waitForMenuProcessing(
  initialDraft: MenuDraft,
  isCancelled: () => boolean,
): Promise<MenuDraft> {
  if (initialDraft.status !== "processing" || !initialDraft.editToken) {
    return initialDraft;
  }
  let current = initialDraft;
  for (let poll = 0; poll < 45; poll++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (isCancelled()) return current;
    try {
      current = await getMenuDraft(current.id, current.editToken);
      if (current.status !== "processing") break;
    } catch {
      // Keep polling
    }
  }
  return current;
}

export function RestaurantMenuPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const language = useLanguage();

  const [restaurant, setRestaurant] = useState<RestaurantCandidate | null>(() => {
    return id ? getCachedRestaurant(id) ?? null : null;
  });
  const [loadingRestaurant, setLoadingRestaurant] = useState(!restaurant);

  const [menuDraft, setMenuDraft] = useState<MenuDraft | null>(() => {
    return id ? findCuratedMenu(id) ?? null : null;
  });
  const [loadingMenu, setLoadingMenu] = useState(!menuDraft);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Manual URL & file fallback state
  const [customMenuUrl, setCustomMenuUrl] = useState("");
  const [isAnalyzingCustomUrl, setIsAnalyzingCustomUrl] = useState(false);
  const [isUploadingMenuFiles, setIsUploadingMenuFiles] = useState(false);

  // 1. Fetch restaurant candidate if not in memory
  useEffect(() => {
    if (!id) return;
    if (!restaurant) {
      setLoadingRestaurant(true);
      void getRestaurantById(id)
        .then((cand) => {
          if (cand) {
            setRestaurant(cand);
            saveCachedRestaurant(cand);
            if (cand.websiteUrl && !customMenuUrl) {
              setCustomMenuUrl(cand.websiteUrl);
            }
          }
        })
        .finally(() => setLoadingRestaurant(false));
    } else if (restaurant.websiteUrl && !customMenuUrl) {
      setCustomMenuUrl(restaurant.websiteUrl);
    }
  }, [id, restaurant, customMenuUrl]);

  // 2. Load menu (curated, API, or automated discovery via website)
  useEffect(() => {
    if (!id) return;

    let isCancelled = false;

    async function loadMenuFlow() {
      // 1. Check curated menu first (instant 0ms, offline-first)
      const curated = findCuratedMenu(id, restaurant?.name);
      if (curated) {
        if (!isCancelled) {
          setMenuDraft(curated);
          setLoadingMenu(false);
        }
        return;
      }

      setLoadingMenu(true);
      setMenuError(null);

      // 2. Check backend API for menu
      try {
        const savedDraft = await getRestaurantMenu(id);
        if (isCancelled) return;
        if (savedDraft && savedDraft.sections && savedDraft.sections.length > 0) {
          setMenuDraft(savedDraft);
          setLoadingMenu(false);
          return;
        }
      } catch {
        // Proceed to auto-discovery
      }

      // 3. Ensure we have candidate data
      let candidate = restaurant;
      if (!candidate) {
        try {
          candidate = await getRestaurantById(id);
          if (candidate && !isCancelled) {
            setRestaurant(candidate);
            saveCachedRestaurant(candidate);
            if (candidate.websiteUrl && !customMenuUrl) {
              setCustomMenuUrl(candidate.websiteUrl);
            }
          }
        } catch {
          // Fall through
        }
      }

      if (isCancelled) return;

      if (!candidate) {
        setLoadingMenu(false);
        setMenuError(tx("Could not obtain official menu automatically."));
        return;
      }

      // 4. Resolve website URL if missing or if it's currently a social link
      let candidateWithWebsite = candidate;
      if (!candidateWithWebsite.websiteUrl || isSocialMediaUrl(candidateWithWebsite.websiteUrl)) {
        try {
          const resolved = await resolveRestaurant(candidate);
          if (!isCancelled && resolved) {
            candidateWithWebsite = resolved;
            setRestaurant(resolved);
            saveCachedRestaurant(resolved);
            if (resolved.websiteUrl && !isSocialMediaUrl(resolved.websiteUrl)) {
              setCustomMenuUrl(resolved.websiteUrl);
            }
          }
        } catch {
          // Resolution failed, will fall through to manual prompt
        }
      }

      if (isCancelled) return;

      // 5. Run auto-discovery if website is known and not purely a social media wall
      if (candidateWithWebsite.websiteUrl && !isSocialMediaUrl(candidateWithWebsite.websiteUrl)) {
        try {
          const discDraft = await discoverRestaurantMenu(
            candidateWithWebsite,
            candidateWithWebsite.websiteUrl,
          );
          if (!isCancelled) {
            const finalDraft = await waitForMenuProcessing(discDraft, () => isCancelled);
            if (!isCancelled && finalDraft.sections && finalDraft.sections.length > 0) {
              setMenuDraft(finalDraft);
              setLoadingMenu(false);
              return;
            }
          }
        } catch {
          // Discovery failed
        }
      }

      if (!isCancelled) {
        setLoadingMenu(false);
        if (candidateWithWebsite.websiteUrl && isSocialMediaUrl(candidateWithWebsite.websiteUrl)) {
          setMenuError(tx("This restaurant only lists a social media profile. Enter their direct menu link or upload photos/PDF."));
        } else {
          setMenuError(tx("Could not obtain official menu automatically."));
        }
      }
    }

    void loadMenuFlow();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleCustomUrlSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = customMenuUrl.trim();
    if (!raw) return;
    const url = !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
    setIsAnalyzingCustomUrl(true);
    setMenuError(null);
    let cancelled = false;
    try {
      const res = await discoverMenuByUrl(url, restaurant?.name);
      const finalDraft = await waitForMenuProcessing(res, () => cancelled);
      if (finalDraft.sections && finalDraft.sections.length > 0) {
        setMenuDraft(finalDraft);
      } else {
        setMenuError(
          finalDraft.error
            ? tx(finalDraft.error)
            : tx("Finding menu on website failed."),
        );
      }
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : tx("Finding menu on website failed."));
    } finally {
      setIsAnalyzingCustomUrl(false);
    }
  };

  const handleCustomFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingMenuFiles(true);
    setMenuError(null);
    let cancelled = false;
    try {
      const draft = await createRestaurantMenuAnalysis(files, restaurant ?? undefined);
      const finalDraft = await waitForMenuProcessing(draft, () => cancelled);
      if (finalDraft.sections && finalDraft.sections.length > 0) {
        setMenuDraft(finalDraft);
      } else {
        setMenuError(
          finalDraft.error
            ? tx(finalDraft.error)
            : tx("Menu analysis could not extract dishes from the uploaded files."),
        );
      }
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : tx("Menu analysis failed"));
    } finally {
      setIsUploadingMenuFiles(false);
    }
  };

  return (
    <div className="page menu-view-page" style={{ maxWidth: "860px", margin: "0 auto", padding: "1.25rem 1rem" }}>
      {/* Top back navigation */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <Link
          to={`/restaurant/${id}`}
          className="detail-back-link"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{restaurant?.name ? restaurant.name : tx("Back")}</span>
        </Link>
        {restaurant && (
          <Link
            to={`/map?q=${encodeURIComponent(restaurant.name)}`}
            className="detail-back-link"
            style={{ fontSize: "0.85rem" }}
          >
            <MapPin size={15} aria-hidden="true" />
            <span>{tx("View on map")}</span>
          </Link>
        )}
      </nav>

      {/* Restaurant Title Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BookOpen size={22} style={{ color: "var(--green, #047857)" }} aria-hidden="true" />
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
            {restaurant?.name || tx("Menu")}
          </h1>
        </div>
        {restaurant?.address && (
          <p style={{ margin: "0.3rem 0 0 0", color: "var(--text-muted, #64748b)", fontSize: "0.9rem" }}>
            {restaurant.address}
          </p>
        )}
      </div>

      {/* Loading state */}
      {(loadingMenu || loadingRestaurant) && !menuDraft && (
        <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <LoaderCircle className="spin" size={32} style={{ margin: "0 auto 1rem", color: "var(--green)" }} />
          <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.95rem" }}>
            {tx("Loading menu...")}
          </p>
        </div>
      )}

      {/* Active interactive menu with full dietary filtering */}
      {menuDraft && menuDraft.sections && menuDraft.sections.length > 0 && (
        <MenuView
          menu={menuDraft}
          onUpdateMenu={(updated) => setMenuDraft(updated)}
        />
      )}

      {/* Fallback when no menu could be found */}
      {!loadingMenu && (!menuDraft || !menuDraft.sections || menuDraft.sections.length === 0) && (
        <div
          style={{
            background: "var(--bg-subtle, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: "12px",
            padding: "1.75rem",
            maxWidth: "540px",
            margin: "1rem auto",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
            {tx("Menu not available yet")}
          </h3>
          <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>
            {tx("Could not obtain official menu automatically. You can enter a direct link to the menu or upload photos/PDF.")}
          </p>

          {menuError && menuError !== tx("Could not obtain official menu automatically.") && (
            <div
              style={{
                marginTop: "0.85rem",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: "0.85rem",
              }}
            >
              {menuError}
            </div>
          )}

          {/* Direct website/menu link */}
          <div style={{ marginTop: "1.2rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              {tx("Website or menu link")}
            </label>
            <form onSubmit={(e) => void handleCustomUrlSubmit(e)} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={customMenuUrl}
                onChange={(e) => setCustomMenuUrl(e.target.value)}
                placeholder="restaurant.com / https://..."
                required
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--line, #cbd5e1)",
                  fontSize: "0.88rem",
                  background: "var(--card-bg, #fff)",
                }}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={isAnalyzingCustomUrl || !customMenuUrl.trim()}
                style={{ padding: "0.55rem 0.9rem", fontSize: "0.88rem", whiteSpace: "nowrap" }}
              >
                {isAnalyzingCustomUrl ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}
                <span>{tx("Find menu")}</span>
              </button>
            </form>
          </div>

          {/* File upload */}
          <div style={{ marginTop: "1rem" }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.4rem",
                padding: "1rem",
                border: "2px dashed var(--line, #cbd5e1)",
                borderRadius: "10px",
                background: "var(--card-bg, #fff)",
                cursor: isUploadingMenuFiles ? "wait" : "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", gap: "0.4rem", color: "var(--green, #047857)" }}>
                <Camera size={18} />
                <FileText size={18} />
              </div>
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {isUploadingMenuFiles ? tx("Extracting dishes…") : tx("Upload menu photo or PDF")}
              </span>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted, #64748b)" }}>
                {tx("JPG, PNG or PDF (max. 8 pages)")}
              </span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                disabled={isUploadingMenuFiles}
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])];
                  if (files.length > 0) void handleCustomFileUpload(files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {restaurant?.websiteUrl && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <a
                href={restaurant.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Globe size={15} />
                <span>
                  {/instagram\.com/i.test(restaurant.websiteUrl)
                    ? tx("Visit Instagram profile")
                    : isSocialMediaUrl(restaurant.websiteUrl)
                      ? tx("Visit social profile")
                      : tx("Visit restaurant website")}
                </span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
