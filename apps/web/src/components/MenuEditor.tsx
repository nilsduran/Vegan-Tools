import { useMemo, useState } from "react";
import type { DietVerdict, MenuDraft, MenuItem } from "@vegan-tools/domain";
import { Copy, Plus, Save, Send, Trash2 } from "lucide-react";
import { publishMenu, updateMenuDraft } from "../api";
import { t } from "../i18n";

const verdicts: DietVerdict[] = [
  "vegan",
  "probably_vegan",
  "vegetarian",
  "probably_vegetarian",
  "non_vegetarian",
  "unknown",
];

export function MenuEditor({
  initialMenu,
  sourceFile,
}: {
  initialMenu: MenuDraft;
  sourceFile?: File;
}) {
  const [menu, setMenu] = useState(initialMenu);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const sourceUrl = useMemo(
    () => (sourceFile ? URL.createObjectURL(sourceFile) : undefined),
    [sourceFile],
  );

  const updateItem = (sectionId: string, itemId: string, patch: Partial<MenuItem>) => {
    setMenu((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setMenu((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section,
      ),
    }));
  };

  const addItem = (sectionId: string) => {
    setMenu((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                {
                  id: crypto.randomUUID(),
                  originalName: "",
                  name: "",
                  description: "",
                  price: "",
                  verdict: "unknown",
                  reason: "Manually added; review required.",
                },
              ],
            }
          : section,
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const saved = await updateMenuDraft(menu.id, menu.editToken, {
        restaurantName: menu.restaurantName,
        sourceLabel: menu.sourceLabel,
        service: menu.service,
        validOn: menu.validOn,
        originalLanguage: menu.originalLanguage,
        sections: menu.sections,
      });
      setMenu(saved);
      setMessage("Draft saved.");
      return saved;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    const saved = await save();
    if (!saved) return;
    setSaving(true);
    try {
      const published = await publishMenu(saved.id, saved.editToken);
      setMenu(published);
      setMessage("Menu published.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish.");
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = menu.publicSlug
    ? `${window.location.origin}/m/${menu.publicSlug}`
    : undefined;

  return (
    <div className="review-shell">
      <header className="review-header">
        <div>
          <h1>{t("editHint")}</h1>
        </div>
        <div className="review-actions">
          <button className="secondary-button" onClick={() => void save()} disabled={saving}>
            <Save />Save draft
          </button>
          <button className="primary-button" onClick={() => void publish()} disabled={saving}>
            <Send />{t("publish")}
          </button>
        </div>
      </header>

      {message && <p className="status-message" role="status">{message}</p>}
      {publicUrl && (
        <div className="published-link">
          <a href={publicUrl}>{publicUrl}</a>
          <button
            onClick={() => void navigator.clipboard.writeText(publicUrl)}
            aria-label="Copy public link"
          ><Copy /></button>
        </div>
      )}

      <div className="review-layout">
        <aside className="source-preview">
          <h2>Original menu</h2>
          {!sourceUrl && <p>Original preview is only available in this browser session.</p>}
          {sourceUrl && sourceFile?.type === "application/pdf" && (
            <iframe src={sourceUrl} title="Original menu PDF" />
          )}
          {sourceUrl && sourceFile?.type !== "application/pdf" && (
            <img src={sourceUrl} alt="Original uploaded menu" />
          )}
        </aside>

        <div className="editor">
          <div className="editor-metadata">
            <label>
              Restaurant
              <input
                value={menu.restaurantName}
                onChange={(event) => setMenu({ ...menu, restaurantName: event.target.value })}
              />
            </label>
            <label>
              Source
              <input
                value={menu.sourceLabel}
                onChange={(event) => setMenu({ ...menu, sourceLabel: event.target.value })}
              />
            </label>
            <label>
              Service / time
              <input
                value={menu.service ?? ""}
                onChange={(event) => setMenu({ ...menu, service: event.target.value || undefined })}
                placeholder="Lunch, dinner…"
              />
            </label>
            <label>
              Valid on
              <input
                type="date"
                value={menu.validOn ?? ""}
                onChange={(event) => setMenu({ ...menu, validOn: event.target.value || undefined })}
              />
            </label>
          </div>

          {menu.sections.map((section) => (
            <section key={section.id} className="editor-section">
              <input
                className="section-name-input"
                aria-label="Section name"
                value={section.name}
                onChange={(event) =>
                  setMenu({
                    ...menu,
                    sections: menu.sections.map((candidate) =>
                      candidate.id === section.id
                        ? { ...candidate, name: event.target.value }
                        : candidate,
                    ),
                  })
                }
              />
              {section.items.map((item) => (
                <div key={item.id} className="editor-item">
                  <label>Original name<input value={item.originalName} onChange={(event) => updateItem(section.id, item.id, { originalName: event.target.value })} /></label>
                  <label>English name<input value={item.name} onChange={(event) => updateItem(section.id, item.id, { name: event.target.value })} /></label>
                  <label>Description<textarea value={item.description} onChange={(event) => updateItem(section.id, item.id, { description: event.target.value })} /></label>
                  <label>Price<input value={item.price} onChange={(event) => updateItem(section.id, item.id, { price: event.target.value })} /></label>
                  <label>
                    Verdict
                    <select value={item.verdict} onChange={(event) => updateItem(section.id, item.id, { verdict: event.target.value as DietVerdict })}>
                      {verdicts.map((verdict) => <option key={verdict} value={verdict}>{verdict.replace("_", " ")}</option>)}
                    </select>
                  </label>
                  <label>Reason<textarea value={item.reason} onChange={(event) => updateItem(section.id, item.id, { reason: event.target.value })} /></label>
                  <label className="wide-field">Modification suggestion<input value={item.modificationNote ?? ""} onChange={(event) => updateItem(section.id, item.id, { modificationNote: event.target.value || undefined })} placeholder="Ask whether it can be prepared…" /></label>
                  <button className="icon-button danger" onClick={() => removeItem(section.id, item.id)} aria-label={t("remove")}><Trash2 /></button>
                </div>
              ))}
              <button className="text-button" onClick={() => addItem(section.id)}><Plus />{t("addDish")}</button>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
