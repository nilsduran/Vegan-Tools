import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Camera,
  ClipboardCheck,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  ScanBarcode,
  ShieldAlert,
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
import { t } from "../i18n";

type CheckerMode = "barcode" | "ingredients";

export function ProductScannerPage() {
  const [mode, setMode] = useState<CheckerMode>("barcode");
  const [code, setCode] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [ingredientPhoto, setIngredientPhoto] = useState<File>();
  const [photoUrl, setPhotoUrl] = useState("");
  const [remotePhotoUrl, setRemotePhotoUrl] = useState("");
  const lookup = useMutation({ mutationFn: getProduct });
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
    lookup.mutate(value);
  }, [lookup]);

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
        <h1>Is this vegan?</h1>
        <p>Scan a barcode or check the ingredient label directly.</p>
      </header>

      <div className="mode-tabs" role="tablist" aria-label="Product check method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "barcode"}
          className={mode === "barcode" ? "active" : ""}
          onClick={() => selectMode("barcode")}
        >
          <ScanBarcode /> Barcode
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ingredients"}
          className={mode === "ingredients" ? "active" : ""}
          onClick={() => selectMode("ingredients")}
        >
          <Type /> Ingredients
        </button>
      </div>

      {mode === "barcode" && (
        <section className="checker-panel" aria-label="Barcode checker">
          {!lookup.data && <BarcodeCamera onDetected={runLookup} />}

          <form
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
              <button className="primary-button" disabled={lookup.isPending}>{t("lookUp")}</button>
            </div>
          </form>

          {lookup.isPending && <div className="loading"><LoaderCircle />Checking product…</div>}
          {lookup.error && <div className="error-banner">{lookup.error.message}</div>}

          {lookup.data && (
            <article className="product-result">
              {lookup.data.imageUrl && (
                <img src={lookup.data.imageUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <div className="product-result-body">
                <VerdictBadge verdict={lookup.data.verdict} />
                <h2>{lookup.data.productName ?? `Product ${lookup.data.gtin}`}</h2>
                {lookup.data.brand && <p className="muted">{lookup.data.brand}</p>}
                {!lookup.data.definitive && (
                  <div className="caution">
                    <ShieldAlert />
                    Check the current package before relying on this result.
                  </div>
                )}
                <h3>{t("why")}</h3>
                <p>{lookup.data.reason}</p>
                <IngredientFindings findings={lookup.data.findings} />
                {lookup.data.traces.length > 0 && (
                  <p className="trace-note">
                    Allergen trace warning: {lookup.data.traces.join(", ")}
                  </p>
                )}
                <p className="source-summary">
                  {t("source")}: {lookup.data.evidence[0]?.sourceName ?? "None"}
                </p>
                {lookup.data.evidence[0]?.sourceUrl && (
                  <a className="source-link" href={lookup.data.evidence[0].sourceUrl} target="_blank" rel="noreferrer">
                    View source <ExternalLink />
                  </a>
                )}
                <div className="result-actions">
                  <button className="secondary-button" onClick={() => lookup.reset()}>
                    <RotateCcw />Scan another
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
                    {lookup.data.ingredientsImageUrl ? "Read ingredient label" : "Check label"}
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
            Take a clear photo of the full ingredient label, then correct the extracted
            text before checking it.
          </p>

          {(photoUrl || remotePhotoUrl) ? (
            <div className="ingredient-photo-preview">
              <img
                src={photoUrl || remotePhotoUrl}
                alt="Ingredient label preview"
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
                <Camera />Retake photo
              </button>
            </div>
          ) : (
            <IngredientCamera onCapture={readIngredientPhoto} />
          )}

          <div className="upload-alternative">
            <span>or</span>
            <label className="secondary-button">
              <ImagePlus />Upload an image
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
            <div className="loading"><LoaderCircle />Reading label…</div>
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
            <label htmlFor="ingredients-text">Ingredients</label>
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
              Check ingredients
            </button>
          </form>

          {ingredientAnalysis.error && (
            <div className="error-banner">{ingredientAnalysis.error.message}</div>
          )}
          {ingredientAnalysis.data && (
            <article className="ingredient-result">
              <VerdictBadge verdict={ingredientAnalysis.data.verdict} />
              <h3>{ingredientAnalysis.data.reason}</h3>
              <IngredientFindings findings={ingredientAnalysis.data.findings} />
              {ingredientAnalysis.data.traces.length > 0 && (
                <p className="trace-note">
                  Allergen trace warning: {ingredientAnalysis.data.traces.join(", ")}
                </p>
              )}
            </article>
          )}
        </section>
      )}
    </div>
  );
}
