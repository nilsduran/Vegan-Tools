/**
 * @file ProductScannerPage.tsx
 * @description Packaged food product scanner supporting barcode scanning (camera/manual GTIN),
 * photo ingredient OCR, text ingredient classification, and Safe Space non-vegan image protection.
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  ClipboardCheck,
  ExternalLink,
  EyeOff,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  ScanBarcode,
  SearchCheck,
  UtensilsCrossed,
} from "lucide-react";
import {
  analyzeScanPhoto,
  analyzeScanUrl,
  classifyIngredientList,
  extractProductIngredientText,
  getProduct,
} from "../api";
import { BrandCrueltyFree, BrandVerdictPending, useCosmeticVerdict } from "../components/BrandCrueltyFree";
import { UniversalResult } from "../components/UniversalResult";
import { BarcodeCamera, readCodeFromPhoto } from "../components/BarcodeCamera";
import { IngredientFindings } from "../components/IngredientFindings";
import { VerdictBadge } from "../components/VerdictBadge";
import { t, tx, useLanguage } from "../i18n";
import { useDocumentHead } from "../utils/seo";
import {
  localizeGeneratedText,
  localizeIngredientName,
  localizeIngredientReason,
} from "../generated-i18n";
import { classifyScannedCode, type IngredientFinding, type ProductResult } from "@vegan-tools/domain";
import { EvidenceNote } from "../components/EvidenceNote";


function productCategory(product: ProductResult): "food" | "beauty" | "other" {
  return product.category ?? (product.isBeautyProduct ? "beauty" : "food");
}

function cleanBrand(brand: string | undefined, productName: string | undefined) {
  if (!brand) return "";
  const product = productName?.trim().toLowerCase();
  return [...new Set(
    brand
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value.toLowerCase() !== product),
  )].join(", ");
}

function FlaggedIngredientChips({
  findings,
  language,
}: {
  findings: IngredientFinding[];
  language: "en" | "ca";
}) {
  const [openId, setOpenId] = useState<string>();
  const flagged = findings.filter(
    (finding) =>
      finding.status === "vegetarian" || finding.status === "non_vegetarian",
  );
  if (flagged.length === 0) return null;

  return (
    <div className="flagged-ingredients" aria-label={tx("Ingredients")}>
      {flagged.map((finding) => {
        const open = openId === finding.id;
        return (
          <span
            key={finding.id}
            className="ingredient-chip-wrap"
            onMouseEnter={() => setOpenId(finding.id)}
            onMouseLeave={() => setOpenId(undefined)}
          >
            <button
              type="button"
              className={`ingredient-chip ingredient-chip-${finding.status}`}
              aria-expanded={open}
              onFocus={() => setOpenId(finding.id)}
              onBlur={() => setOpenId(undefined)}
              onClick={() => setOpenId(open ? undefined : finding.id)}
            >
              {localizeIngredientName(finding, language)}
            </button>
            {open && (
              <span className="ingredient-chip-explanation" role="tooltip">
                {localizeIngredientReason(finding, language)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

type RecentScanItem = {
  gtin: string;
  productName: string;
  brand?: string;
  verdict: string;
  imageUrl?: string;
  timestamp: number;
};

const RECENT_SCANS_STORAGE_KEY = "vegan-tools-recent-scans";

function getStoredRecentScans(): RecentScanItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SCANS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredRecentScan(item: RecentScanItem) {
  if (typeof localStorage === "undefined") return;
  try {
    const existing = getStoredRecentScans().filter((entry) => entry.gtin !== item.gtin);
    const updated = [item, ...existing].slice(0, 8);
    localStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage issues
  }
}

export function ProductScannerPage() {
  const language = useLanguage();
  const navigate = useNavigate();
  const { gtin: routeGtin } = useParams();
  const [code, setCode] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [ingredientPhoto, setIngredientPhoto] = useState<File>();
  const [photoUrl, setPhotoUrl] = useState("");
  const [remotePhotoUrl, setRemotePhotoUrl] = useState("");
  const [scannedUrl, setScannedUrl] = useState("");
  const [scannedIsMenu, setScannedIsMenu] = useState(false);
  const [scannedText, setScannedText] = useState("");
  const [codeError, setCodeError] = useState("");
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>(getStoredRecentScans);
  const [revealedImages, setRevealedImages] = useState<Record<string, boolean>>({});
  const lookup = useQuery({
    queryKey: ["product", routeGtin],
    queryFn: () => getProduct(routeGtin ?? ""),
    enabled: Boolean(routeGtin),
  });
  // Cosmetics: the verdict waits for the brand check, so it is given once.
  const cosmeticBrand = lookup.data && productCategory(lookup.data) === "beauty" ? lookup.data.brand : undefined;
  const productVerdict = useCosmeticVerdict(lookup.data?.verdict ?? "unknown", lookup.data?.reason ?? "", cosmeticBrand);

  useDocumentHead({
    title: routeGtin && lookup.data ? `${lookup.data.productName || routeGtin} · ${t("scanner")}` : t("scanner"),
    description: t("scannerSummary"),
    image: lookup.data?.imageUrl,
    path: routeGtin ? `/product/${routeGtin}` : "/scanner",
    type: "website",
  });
  const ingredientAnalysis = useMutation({ mutationFn: classifyIngredientList });
  // A product without ingredients in any database triggers a web search (up to ~30 s).
  const [slowLookup, setSlowLookup] = useState(false);
  useEffect(() => {
    setSlowLookup(false);
    if (!lookup.isPending || !routeGtin) return;
    const timer = window.setTimeout(() => setSlowLookup(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [lookup.isPending, routeGtin]);
  const photoScan = useMutation({ mutationFn: (file: File) => analyzeScanPhoto(file, language) });
  const linkScan = useMutation({ mutationFn: (url: string) => analyzeScanUrl(url, language) });
  const productPhotoExtraction = useMutation({
    mutationFn: extractProductIngredientText,
  });

  useEffect(() => {
    if (lookup.data) {
      const item: RecentScanItem = {
        gtin: lookup.data.gtin,
        productName: lookup.data.productName || `Product ${lookup.data.gtin}`,
        brand: cleanBrand(lookup.data.brand, lookup.data.productName),
        verdict: lookup.data.verdict,
        imageUrl: lookup.data.imageUrl,
        timestamp: Date.now(),
      };
      saveStoredRecentScan(item);
      setRecentScans(getStoredRecentScans());
    }
  }, [lookup.data]);

  useEffect(() => {
    if (!ingredientPhoto || typeof URL.createObjectURL !== "function") {
      setPhotoUrl("");
      return;
    }
    const url = URL.createObjectURL(ingredientPhoto);
    setPhotoUrl(url);
    return () => {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    };
  }, [ingredientPhoto]);

  // One reader for every code: products, restaurant menus, links and text.
  const runLookup = useCallback((value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) return;
    setScannedUrl("");
    setScannedIsMenu(false);
    setScannedText("");
    setCodeError("");

    const scanned = classifyScannedCode(cleanValue);
    switch (scanned.kind) {
      case "product":
        setCode(scanned.gtin);
        void navigate(`/product/${encodeURIComponent(scanned.gtin)}`);
        return;
      case "invalid_gtin":
        setCodeError(tx("This barcode number is not valid. Check the digits and try again."));
        return;
      case "menu_url":
        setScannedUrl(scanned.url);
        setScannedIsMenu(true);
        return;
      case "url":
        setScannedUrl(scanned.url);
        return;
      case "text":
        setScannedText(scanned.text);
        return;
    }
  }, [navigate]);

  // Universal camera: a label, a product, clothing, an activity... A readable
  // ingredient list is copied into the text box so it can be corrected.
  const scanPhoto = (file: File) => {
    setRemotePhotoUrl("");
    setIngredientPhoto(file);
    ingredientAnalysis.reset();
    photoScan.mutate(file, {
      onSuccess: (result) => {
        if (result.subject === "ingredient_label" && result.ingredientsText) {
          setIngredientsText(result.ingredientsText);
        }
      },
    });
  };

  // Every photo, taken or uploaded: a code in it wins (read on the device, free
  // and exact); otherwise the photo is recognised automatically.
  const handlePhoto = async (file: File) => {
    linkScan.reset();
    photoScan.reset();
    ingredientAnalysis.reset();
    setRemotePhotoUrl("");
    setIngredientPhoto(file);
    const found = await readCodeFromPhoto(file);
    if (found) {
      setIngredientPhoto(undefined);
      runLookup(found);
      return;
    }
    scanPhoto(file);
  };

  const clearPhoto = () => {
    setIngredientPhoto(undefined);
    setRemotePhotoUrl("");
    photoScan.reset();
    productPhotoExtraction.reset();
    ingredientAnalysis.reset();
  };

  const checkLink = (url: string) => {
    linkScan.mutate(url, {
      onSuccess: (result) => {
        if (result.menuUrl) void navigate(`/scan/menu?url=${encodeURIComponent(result.menuUrl)}`);
        else if (result.gtin) void navigate(`/product/${encodeURIComponent(result.gtin)}`);
      },
    });
  };

  return (
    <div className="page narrow-page">
      <header className="page-heading page-heading--compact">
        <h1>{t("scanner")}</h1>
        <p>{tx("Scan any product or paste any link, and we'll tell you whether it's vegan.")}</p>
      </header>

      <section className="checker-panel" aria-label={tx("Scanner")}>
        {!routeGtin && (photoUrl ? (
          <div className="ingredient-photo-preview">
            <img src={photoUrl} alt={tx("Your photo")} />
            <button type="button" className="secondary-button" onClick={clearPhoto}>
              <Camera />{tx("Retake photo")}
            </button>
          </div>
        ) : (
          <BarcodeCamera onDetected={runLookup} onPhoto={(file) => void handlePhoto(file)} />
        ))}

        {codeError && <div className="error-banner" role="alert">{codeError}</div>}

        {scannedText && (
          <div className="scanner-external-result" role="status">
            <strong>{tx("Code detected")}</strong>
            <p className="muted scanned-text">{scannedText}</p>
            <div className="not-found-actions">
              <button type="button" className="secondary-button" onClick={() => setScannedText("")}>
                <RotateCcw aria-hidden="true" />
                <span>{tx("Scan another")}</span>
              </button>
            </div>
          </div>
        )}

        {scannedUrl && (
          <div className="scanner-external-result" role="status">
            <strong>{scannedIsMenu ? tx("Restaurant menu detected") : tx("Code detected")}</strong>
            <p className="muted">{scannedUrl}</p>
            <div className="not-found-actions">
              {scannedIsMenu && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void navigate(`/scan/menu?url=${encodeURIComponent(scannedUrl)}`)}
                >
                  <UtensilsCrossed aria-hidden="true" />
                  <span>{tx("See what I can order")}</span>
                </button>
              )}
              {!scannedIsMenu && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => checkLink(scannedUrl)}
                  disabled={linkScan.isPending}
                >
                  {linkScan.isPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <SearchCheck aria-hidden="true" />}
                  <span>{tx("Check this link")}</span>
                </button>
              )}
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.open(scannedUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink aria-hidden="true" />
                <span>{tx("Open scanned link")}</span>
              </button>
              <button type="button" className="secondary-button" onClick={() => setScannedUrl("")}>
                <RotateCcw aria-hidden="true" />
                <span>{tx("Scan another")}</span>
              </button>
            </div>
          </div>
        )}

        {linkScan.error && <div className="error-banner" role="alert">{tx(linkScan.error.message)}</div>}
        {linkScan.data && !linkScan.data.menuUrl && !linkScan.data.gtin && <UniversalResult result={linkScan.data} />}

        {photoScan.isPending && (
          <div className="loading"><LoaderCircle className="spin" />{tx("Recognising the photo…")}</div>
        )}
        {productPhotoExtraction.isPending && (
          <div className="loading"><LoaderCircle className="spin" />{tx("Reading label…")}</div>
        )}
        {(photoScan.error || productPhotoExtraction.error) && (
          <div className="inline-note">
            {tx((photoScan.error || productPhotoExtraction.error)?.message ?? "")}
          </div>
        )}
        {photoScan.data && !ingredientAnalysis.data && (
          <>
            <UniversalResult result={photoScan.data} />
            {photoScan.data.gtin && (
              <button
                type="button"
                className="primary-button"
                onClick={() => void navigate(`/product/${encodeURIComponent(photoScan.data.gtin ?? "")}`)}
              >
                <ScanBarcode aria-hidden="true" />
                <span>{tx("See the product")}</span>
              </button>
            )}
          </>
        )}


        {!routeGtin && <form
          className="barcode-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = code.trim();
            if (!value) return;
            // A pasted link was chosen on purpose: check it straight away
            // instead of showing the "code detected" step a scan gets.
            const typed = classifyScannedCode(value);
            if (typed.kind === "menu_url") {
              void navigate(`/scan/menu?url=${encodeURIComponent(typed.url)}`);
            } else if (typed.kind === "url") {
              runLookup(value);
              checkLink(typed.url);
            } else {
              runLookup(value);
            }
          }}
        >
          <label htmlFor="barcode">{t("manualCode")}</label>
          <div>
            <input
              id="barcode"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={tx("3017620422003 or https://…")}
            />
            <button className="primary-button" disabled={!code.trim()}>{t("lookUp")}</button>
          </div>
        </form>}

        {!routeGtin && (
          <label className="secondary-button scan-upload-button">
            <ImagePlus aria-hidden="true" />
            <span>{tx("Upload an image")}</span>
            <input
              type="file"
              accept="image/*"
              data-testid="scan-photo-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handlePhoto(file);
              }}
            />
          </label>
        )}

        {routeGtin && lookup.isPending && (
          <div className="loading">
            <LoaderCircle className="spin" />
            {slowLookup ? tx("No database has this product's ingredients: searching the web…") : tx("Checking product…")}
          </div>
        )}
        
        {routeGtin && lookup.error && (
          <div className="product-not-found-card">
            <div className="error-banner">{lookup.error.message || tx("Product not found in Open Food Facts database.")}</div>
            <p className="muted">
              {language === "ca"
                ? "Pots fer una foto a l'etiqueta d'ingredients del paquet per comprovar-lo ara mateix:"
                : "You can take a photo of the ingredients list on the packaging to check it directly:"}
            </p>
            <div className="not-found-actions">
              <button
                type="button"
                className="primary-button fallback-ocr-btn"
                onClick={() => {
                  void navigate("/scanner");
                }}
              >
                <Camera aria-hidden="true" />
                <span>{tx("Take photo of ingredient label")}</span>
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void navigate("/scanner")}
              >
                <RotateCcw aria-hidden="true" />
                <span>{tx("Scan another")}</span>
              </button>
            </div>
          </div>
        )}

        {lookup.data && (
          <article className="product-result">
            {lookup.data.imageUrl && (
              <div
                className={`product-result-media ${
                  lookup.data.verdict === "non_vegetarian" && !revealedImages[lookup.data.gtin]
                    ? "is-sensitive-blurred"
                    : ""
                }`}
              >
                <img src={lookup.data.imageUrl} alt="" referrerPolicy="no-referrer" />
                {lookup.data.verdict === "non_vegetarian" && !revealedImages[lookup.data.gtin] && (
                  <button
                    type="button"
                    className="sensitive-overlay-btn"
                    onClick={() => {
                      if (lookup.data?.gtin) {
                        const gtin = lookup.data.gtin;
                        setRevealedImages((prev) => ({ ...prev, [gtin]: true }));
                      }
                    }}
                    title={tx("Sensitive content: tap to reveal")}
                  >
                    <EyeOff aria-hidden="true" size={15} />
                    <span>{tx("Sensitive content: tap to reveal")}</span>
                  </button>
                )}
              </div>
            )}
            <div className="product-result-body">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                {!productVerdict.waiting && (
                  <VerdictBadge verdict={productVerdict.verdict} context={productCategory(lookup.data) === "food" ? "diet" : "general"} />
                )}
                <span className="product-category-chip">
                  {{ food: tx("Food"), beauty: tx("Cosmetics & Care"), other: tx("Other product") }[productCategory(lookup.data)]}
                </span>
                {lookup.data.crueltyFree && (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      background: "#ecfdf5",
                      border: "1px solid #10b981",
                      color: "#065f46",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    🐰 {tx("Cruelty-Free")}
                  </span>
                )}
              </div>
              <h2>{lookup.data.productName ?? `Product ${lookup.data.gtin}`}</h2>
              {cleanBrand(lookup.data.brand, lookup.data.productName) && (
                <p className="muted">
                  {cleanBrand(lookup.data.brand, lookup.data.productName)}
                </p>
              )}
              {lookup.data.crueltyFreeCertifications && lookup.data.crueltyFreeCertifications.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", margin: "0.35rem 0" }}>
                  {lookup.data.crueltyFreeCertifications.map((cert) => (
                    <span
                      key={cert}
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "6px",
                        background: "var(--green-light)",
                        color: "var(--green-dark)",
                        border: "1px solid var(--green-border)",
                      }}
                    >
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              )}
              {productVerdict.waiting ? (
                <BrandVerdictPending />
              ) : (
                <p className="result-reason">
                  {productVerdict.testsOnAnimals ? productVerdict.reason : localizeGeneratedText(lookup.data.reason, language)}
                </p>
              )}
              <FlaggedIngredientChips findings={lookup.data.findings} language={language} />
              {cosmeticBrand && <BrandCrueltyFree brand={cosmeticBrand} />}
              <EvidenceNote
                assurance={lookup.data.assurance}
                evidence={lookup.data.evidence}
                automatic={lookup.data.evidence.some((item) => item.sourceType === "automated_extraction")}
              />
              {lookup.data.traces.length > 0 && (
                <p className="trace-note">
                  {tx("Allergen trace warning")}: {lookup.data.traces.join(", ")}
                </p>
              )}
              {lookup.data.evidence.filter((item) => item.sourceUrl).length > 0 && (
                <p className="source-links">
                  {tx("Sources")}:{" "}
                  {lookup.data.evidence.filter((item) => item.sourceUrl).slice(0, 3).map((item) => (
                    <a key={item.id} className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
                      {tx(item.sourceName)} <ExternalLink />
                    </a>
                  ))}
                </p>
              )}
              <div className="result-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    void navigate("/scanner");
                  }}
                >
                  <RotateCcw />{tx("Scan another")}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    const label = lookup.data.evidence.find(
                      (item) => item.ingredientsText,
                    )?.ingredientsText;
                    if (label) setIngredientsText(label);
                    if (lookup.data.ingredientsImageUrl) {
                      setRemotePhotoUrl(lookup.data.ingredientsImageUrl);
                      productPhotoExtraction.mutate(lookup.data.gtin, {
                        onSuccess: (text) => {
                          setIngredientsText(text);
                          if (text.trim()) {
                            ingredientAnalysis.mutate(text);
                          }
                        },
                      });
                    } else if (label?.trim()) {
                      ingredientAnalysis.mutate(label);
                    }
                  }}
                >
                  <ClipboardCheck />
                  {lookup.data.ingredientsImageUrl ? tx("Read ingredient label") : tx("Check label")}
                </button>
              </div>
            </div>
          </article>
        )}

        {remotePhotoUrl && (
          <div className="ingredient-photo-preview">
            <img src={remotePhotoUrl} alt={tx("Photograph the ingredient label")} referrerPolicy="no-referrer" />
          </div>
        )}

        <details className="typed-ingredients" open={Boolean(ingredientsText.trim()) || ingredientAnalysis.isSuccess}>
          <summary>{tx("Or type the ingredients")}</summary>
        <form
          className="text-analysis-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (ingredientsText.trim()) ingredientAnalysis.mutate(ingredientsText);
          }}
        >
          <label htmlFor="ingredients-text" className="sr-only">{tx("Or type the ingredients")}</label>
          <textarea
            id="ingredients-text"
            value={ingredientsText}
            onChange={(event) => setIngredientsText(event.target.value)}
            placeholder={tx("Ingredients: cocoa mass, sugar, cocoa butter… May contain milk.")}
            rows={9}
          />
          <button
            className="primary-button"
            disabled={!ingredientsText.trim() || ingredientAnalysis.isPending}
          >
            {ingredientAnalysis.isPending
              ? <LoaderCircle className="spin" />
              : <ClipboardCheck />}
            {tx("Check ingredients")}
          </button>
        </form>

        {ingredientAnalysis.error && (
          <div className="error-banner">{ingredientAnalysis.error.message}</div>
        )}
        {ingredientAnalysis.data && (
          <article className="ingredient-result">
            <VerdictBadge verdict={ingredientAnalysis.data.verdict} />
            <h3>{localizeGeneratedText(ingredientAnalysis.data.reason, language)}</h3>
            <IngredientFindings findings={ingredientAnalysis.data.findings} compact />
            <EvidenceNote assurance={ingredientAnalysis.data.assurance} />
            {ingredientAnalysis.data.traces.length > 0 && (
              <p className="trace-note">
                {tx("Allergen trace warning")}: {ingredientAnalysis.data.traces.join(", ")}
              </p>
            )}
          </article>
        )}
        </details>

        {/* Recent Scans History in Supermarket session */}
        {!routeGtin && recentScans.length > 0 && (
          <section className="recent-scans-section" aria-label={tx("Recent products")}>
            <div className="recent-scans-header">
              <h3>{tx("Recent products")}</h3>
              <button
                type="button"
                className="text-button clear-history-btn"
                onClick={() => {
                  localStorage.removeItem(RECENT_SCANS_STORAGE_KEY);
                  setRecentScans([]);
                }}
              >
                {tx("Clear history")}
              </button>
            </div>
            <div className="recent-scans-grid">
              {recentScans.map((item) => (
                <button
                  key={item.gtin}
                  type="button"
                  className="recent-scan-card"
                  onClick={() => {
                    void navigate(`/product/${item.gtin}`);
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="recent-scan-img" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="recent-scan-placeholder"><ScanBarcode aria-hidden="true" /></div>
                  )}
                  <div className="recent-scan-info">
                    <strong>{item.productName}</strong>
                    {item.brand && <small>{item.brand}</small>}
                  </div>
                  <VerdictBadge verdict={item.verdict as any} />
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
