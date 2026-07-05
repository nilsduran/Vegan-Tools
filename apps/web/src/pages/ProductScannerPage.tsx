import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  ClipboardCheck,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  ScanBarcode,
  Type,
} from "lucide-react";
import {
  classifyIngredientList,
  extractIngredientText,
  extractProductIngredientText,
  getProduct,
} from "../api";
import { BarcodeCamera } from "../components/BarcodeCamera";
import { IngredientFindings } from "../components/IngredientFindings";
import { IngredientCamera } from "../components/IngredientCamera";
import { VerdictBadge } from "../components/VerdictBadge";
import { t, tx, useLanguage } from "../i18n";
import {
  localizeGeneratedText,
  localizeIngredientName,
  localizeIngredientReason,
} from "../generated-i18n";
import type { IngredientFinding } from "@vegan-tools/domain";

type CheckerMode = "barcode" | "ingredients";

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

export function ProductScannerPage() {
  const language = useLanguage();
  const navigate = useNavigate();
  const { gtin: routeGtin } = useParams();
  const [mode, setMode] = useState<CheckerMode>("barcode");
  const [code, setCode] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [ingredientPhoto, setIngredientPhoto] = useState<File>();
  const [photoUrl, setPhotoUrl] = useState("");
  const [remotePhotoUrl, setRemotePhotoUrl] = useState("");
  const lookup = useQuery({
    queryKey: ["product", routeGtin],
    queryFn: () => getProduct(routeGtin ?? ""),
    enabled: Boolean(routeGtin),
  });
  const ingredientAnalysis = useMutation({ mutationFn: classifyIngredientList });
  const photoExtraction = useMutation({ mutationFn: extractIngredientText });
  const productPhotoExtraction = useMutation({
    mutationFn: extractProductIngredientText,
  });

  useEffect(() => {
    if (!ingredientPhoto) {
      setPhotoUrl("");
      return;
    }
    const url = URL.createObjectURL(ingredientPhoto);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [ingredientPhoto]);

  const runLookup = useCallback((value: string) => {
    setCode(value);
    void navigate(`/product/${encodeURIComponent(value)}`);
  }, [navigate]);

  const readIngredientPhoto = (file: File) => {
    setRemotePhotoUrl("");
    setIngredientPhoto(file);
    photoExtraction.mutate(file, {
      onSuccess: (text) => setIngredientsText(text),
    });
  };

  const selectMode = (nextMode: CheckerMode) => {
    setMode(nextMode);
    ingredientAnalysis.reset();
    photoExtraction.reset();
    productPhotoExtraction.reset();
  };

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <h1>{t("scanner")}</h1>
        <p>{tx("Scan a barcode or check the ingredient label directly.")}</p>
        <p className="checker-disclaimer">
          {tx("Product recipes can change. Check the current package when the result matters.")}
        </p>
      </header>

      {!routeGtin && <div className="mode-tabs" role="tablist" aria-label="Product check method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "barcode"}
          className={mode === "barcode" ? "active" : ""}
          onClick={() => selectMode("barcode")}
        >
          <ScanBarcode /> {tx("Barcode")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ingredients"}
          className={mode === "ingredients" ? "active" : ""}
          onClick={() => selectMode("ingredients")}
        >
          <Type /> {tx("Ingredients")}
        </button>
      </div>}

      {mode === "barcode" && (
        <section className="checker-panel" aria-label="Barcode checker">
          {!routeGtin && !lookup.data && <BarcodeCamera onDetected={runLookup} />}

          {!routeGtin && <form
            className="barcode-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim()) runLookup(code.trim());
            }}
          >
            <label htmlFor="barcode">{t("manualCode")}</label>
            <div>
              <input
                id="barcode"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="3017620422003"
              />
              <button className="primary-button" disabled={!code.trim()}>{t("lookUp")}</button>
            </div>
          </form>}

          {routeGtin && lookup.isPending && <div className="loading"><LoaderCircle />{tx("Checking product…")}</div>}
          {routeGtin && lookup.error && <div className="error-banner">{lookup.error.message}</div>}

          {lookup.data && (
            <article className="product-result">
              {lookup.data.imageUrl && (
                <img src={lookup.data.imageUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <div className="product-result-body">
                <VerdictBadge verdict={lookup.data.verdict} />
                <h2>{lookup.data.productName ?? `Product ${lookup.data.gtin}`}</h2>
                {cleanBrand(lookup.data.brand, lookup.data.productName) && (
                  <p className="muted">
                    {cleanBrand(lookup.data.brand, lookup.data.productName)}
                  </p>
                )}
                <p className="result-reason">{localizeGeneratedText(lookup.data.reason, language)}</p>
                <FlaggedIngredientChips findings={lookup.data.findings} language={language} />
                {lookup.data.traces.length > 0 && (
                  <p className="trace-note">
                    {tx("Allergen trace warning")}: {lookup.data.traces.join(", ")}
                  </p>
                )}
                {lookup.data.evidence[0]?.sourceUrl && (
                  <a className="source-link" href={lookup.data.evidence[0].sourceUrl} target="_blank" rel="noreferrer">
                    {lookup.data.evidence[0].sourceName} <ExternalLink />
                  </a>
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
                      selectMode("ingredients");
                      if (lookup.data.ingredientsImageUrl) {
                        setRemotePhotoUrl(lookup.data.ingredientsImageUrl);
                        productPhotoExtraction.mutate(lookup.data.gtin, {
                          onSuccess: (text) => setIngredientsText(text),
                        });
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
        </section>
      )}

      {mode === "ingredients" && (
        <section className="checker-panel" aria-label="Ingredient checker">
          <p className="checker-intro">
            {tx("Take a clear photo of the full ingredient label, then correct the extracted text before checking it.")}
          </p>

          {(photoUrl || remotePhotoUrl) ? (
            <div className="ingredient-photo-preview">
              <img
                src={photoUrl || remotePhotoUrl}
                alt={tx("Photograph the ingredient label")}
                referrerPolicy="no-referrer"
              />
              <button
                className="secondary-button"
                onClick={() => {
                  setIngredientPhoto(undefined);
                  setRemotePhotoUrl("");
                  photoExtraction.reset();
                  productPhotoExtraction.reset();
                }}
              >
                <Camera />{tx("Retake photo")}
              </button>
            </div>
          ) : (
            <IngredientCamera onCapture={readIngredientPhoto} />
          )}

          <div className="upload-alternative">
            <span>{tx("or")}</span>
            <label className="secondary-button">
              <ImagePlus />{tx("Upload an image")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                readIngredientPhoto(file);
              }}
            />
            </label>
          </div>

          {(photoExtraction.isPending || productPhotoExtraction.isPending) && (
            <div className="loading"><LoaderCircle />{tx("Reading label…")}</div>
          )}
          {(photoExtraction.error || productPhotoExtraction.error) && (
            <div className="inline-note">
              {(photoExtraction.error || productPhotoExtraction.error)?.message}
            </div>
          )}

          <form
            className="text-analysis-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (ingredientsText.trim()) ingredientAnalysis.mutate(ingredientsText);
            }}
          >
            <label htmlFor="ingredients-text">{tx("Ingredients")}</label>
            <textarea
              id="ingredients-text"
              value={ingredientsText}
              onChange={(event) => setIngredientsText(event.target.value)}
              placeholder="Ingredients: cocoa mass, sugar, cocoa butter… May contain milk."
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
              {ingredientAnalysis.data.traces.length > 0 && (
                <p className="trace-note">
                  {tx("Allergen trace warning")}: {ingredientAnalysis.data.traces.join(", ")}
                </p>
              )}
            </article>
          )}
        </section>
      )}
    </div>
  );
}
