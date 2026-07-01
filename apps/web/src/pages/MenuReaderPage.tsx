import { useEffect, useState } from "react";
import type { MenuDraft } from "@vegan-tools/domain";
import { FileImage, FileText, LoaderCircle, Upload, X } from "lucide-react";
import { createMenuAnalysis, getMenuDraft } from "../api";
import { MenuEditor } from "../components/MenuEditor";
import { t } from "../i18n";

export function MenuReaderPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<MenuDraft>();
  const [error, setError] = useState("");
  const draftId = draft?.id;
  const editToken = draft?.editToken;
  const draftStatus = draft?.status;

  useEffect(() => {
    if (!draftId || !editToken || draftStatus !== "processing") return;
    let cancelled = false;
    let timeout: number | undefined;
    const deadline = Date.now() + 20_000;

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
    return <MenuEditor initialMenu={draft} sourceFile={files[0]} />;
  }

  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <h1>{t("menus")}</h1>
        <p>{t("menusSummary")} This feature is currently in beta.</p>
      </header>

      <label className="upload-zone">
        <Upload aria-hidden="true" />
        <strong>{t("uploadTitle")}</strong>
        <span>{t("uploadBody")}</span>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setFiles([...event.target.files ?? []].slice(0, 8))}
        />
      </label>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`}>
              {file.type === "application/pdf" ? <FileText /> : <FileImage />}
              <span>{file.name}</span>
              <button
                aria-label={`Remove ${file.name}`}
                onClick={() => setFiles(files.filter((_, candidate) => candidate !== index))}
              ><X /></button>
            </li>
          ))}
        </ul>
      )}

      <button
        className="primary-button large-button"
        disabled={files.length === 0 || draft?.status === "processing"}
        onClick={async () => {
          setError("");
          try {
            setDraft(await createMenuAnalysis(files));
          } catch (analysisError) {
            setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
          }
        }}
      >
        {draft?.status === "processing" ? <LoaderCircle className="spin" /> : <Upload />}
        {draft?.status === "processing" ? "Extracting dishes…" : t("analyze")}
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
          Cancel analysis
        </button>
      )}

      <p className="privacy-note">
        Files are processed for this analysis and are not stored by this demo.
      </p>
      {(error || draft?.error) && <div className="error-banner">{error || draft?.error}</div>}
    </div>
  );
}
