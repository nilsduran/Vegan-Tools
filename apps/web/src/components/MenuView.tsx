import { useMemo, useState } from "react";
import {
  informativeMenuReason,
  menuDisplayText,
  visibleMenuDescription,
  type DietVerdict,
  type MenuDraft,
  type MenuItem,
  type MenuItemModification,
} from "@vegan-tools/domain";
import {
  BookOpen,
  Egg,
  ExternalLink,
  Info,
  Leaf,
  MessageSquareWarning,
  Pencil,
  Utensils,
  Wrench,
} from "lucide-react";
import { t, tx, useLanguage } from "../i18n";
import type { Language } from "../i18n";
import { localizeGeneratedText } from "../generated-i18n";
import { resolveApiUrl, sourcePdfPageUrl } from "../api";
import { isPresentableMenuSource } from "../menu-source";
import { DishCorrectionDialog } from "./DishCorrectionDialog";
import { RestaurantNotesDialog } from "./RestaurantNotesDialog";

type DietFilter = "vegan" | "vegetarian" | "meat";
type Modification = { target: "vegan" | "vegetarian"; note: string; noteCa?: string };

function verdictGroup(verdict: DietVerdict): DietFilter | "unknown" {
  if (verdict === "vegan" || verdict === "probably_vegan") return "vegan";
  if (verdict === "vegetarian" || verdict === "probably_vegetarian") {
    return "vegetarian";
  }
  if (verdict === "non_vegetarian") return "meat";
  return "unknown";
}

function verdictLabel(verdict: DietVerdict) {
  if (verdict === "probably_vegan") return t("probablyVegan");
  if (verdict === "probably_vegetarian") return t("probablyVegetarian");
  if (verdict === "non_vegetarian") return "Carnist";
  return t(verdict);
}

function itemModifications(item: MenuItem): Modification[] {
  const modifications = (item.modifications || []).filter((entry) => entry.note.trim());
  if (
    item.modificationNote?.trim() &&
    item.modifiableTo &&
    !modifications.some((entry) => entry.target === item.modifiableTo)
  ) {
    modifications.push({
      target: item.modifiableTo,
      note: item.modificationNote.trim(),
      noteCa: item.modificationNoteCa?.trim(),
    });
  }
  return modifications;
}

function descriptionFromReason(reason: string) {
  const trimmed = reason.trim();
  const looksLikeIngredientText =
    (trimmed.match(/,/g)?.length ?? 0) >= 2 &&
    !/\b(classif|verdict|vegan|vegetarian|non[- ]vegetarian|animal|unclear|incomplete|unknown)\b/i
      .test(trimmed);
  return looksLikeIngredientText ? trimmed : "";
}

function localizedMenuText(value: string, language: Language) {
  return localizeGeneratedText(tx(value), language);
}

function displaySectionName(section: { name: string; nameCa?: string }, language: Language) {
  return language === "ca" && section.nameCa?.trim()
    ? section.nameCa.trim()
    : localizedMenuText(section.name, language);
}

function displayItemName(item: MenuItem, fallbackName: string, language: Language) {
  return language === "ca" && item.nameCa?.trim()
    ? item.nameCa.trim()
    : localizedMenuText(fallbackName, language);
}

function displayItemDescription(item: MenuItem, fallbackDescription: string, language: Language) {
  return language === "ca" && item.descriptionCa?.trim()
    ? item.descriptionCa.trim()
    : localizedMenuText(fallbackDescription, language);
}

function displayItemReason(item: MenuItem, fallbackReason: string, language: Language) {
  if (language === "ca" && item.reasonCa?.trim()) {
    return item.reasonCa.trim();
  }
  return localizeGeneratedText(tx(fallbackReason), language);
}

function displayModificationNote(mod: Modification, language: Language) {
  if (language === "ca" && mod.noteCa?.trim()) {
    return mod.noteCa.trim();
  }
  return localizeGeneratedText(mod.note, language);
}

function matchesSelection(
  item: MenuItem,
  selectedDiets: Set<DietFilter>,
  allSelected: boolean,
  showAdaptable: boolean,
) {
  if (allSelected) return true;
  if (selectedDiets.has(verdictGroup(item.verdict) as DietFilter)) return true;
  if (!showAdaptable) return false;
  return itemModifications(item).some((entry) => selectedDiets.has(entry.target));
}

export function MenuView({
  menu,
  onSourceReference,
  onUpdateMenu,
}: {
  menu: MenuDraft;
  onSourceReference?: (item: MenuItem) => void;
  onUpdateMenu?: (updated: MenuDraft) => void;
}) {
  const language = useLanguage();
  const [selectedDiets, setSelectedDiets] = useState<Set<DietFilter>>(
    new Set(["vegan"]),
  );
  const [allSelected, setAllSelected] = useState(false);
  const [showAdaptable, setShowAdaptable] = useState(true);
  const [openReasons, setOpenReasons] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const allItems = useMemo(
    () => menu.sections.flatMap((section) => section.items),
    [menu.sections],
  );
  const nativeCounts = useMemo(
    () => ({
      vegan: allItems.filter((item) => verdictGroup(item.verdict) === "vegan").length,
      vegetarian: allItems.filter((item) => verdictGroup(item.verdict) === "vegetarian").length,
      meat: allItems.filter((item) => verdictGroup(item.verdict) === "meat").length,
    }),
    [allItems],
  );
  const adaptableCounts = useMemo(
    () => ({
      vegan: allItems.filter((item) =>
        verdictGroup(item.verdict) !== "vegan" &&
        itemModifications(item).some((entry) => entry.target === "vegan")
      ).length,
      vegetarian: allItems.filter((item) =>
        verdictGroup(item.verdict) !== "vegetarian" &&
        itemModifications(item).some((entry) => entry.target === "vegetarian")
      ).length,
      meat: 0,
    }),
    [allItems],
  );
  const sections = useMemo(
    () =>
      menu.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            matchesSelection(item, selectedDiets, allSelected, showAdaptable),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [allSelected, menu.sections, selectedDiets, showAdaptable],
  );
  const shownCount = sections.reduce((total, section) => total + section.items.length, 0);
  const presentableSources = menu.sourceFiles.filter((source) =>
    isPresentableMenuSource(source.mimeType)
  );
  const savedPdf = presentableSources.find(
    (source) => source.mimeType === "application/pdf",
  );

  const toggleDiet = (diet: DietFilter) => {
    setAllSelected(false);
    setSelectedDiets((current) => {
      if (allSelected) return new Set([diet]);
      const next = new Set(current);
      if (next.has(diet)) next.delete(diet);
      else next.add(diet);
      return next;
    });
  };

  const dietButtons: Array<{
    value: DietFilter;
    label: string;
    Icon: typeof Leaf;
  }> = [
    { value: "vegan", label: t("vegan"), Icon: Leaf },
    { value: "vegetarian", label: t("vegetarian"), Icon: Egg },
    { value: "meat", label: tx("Carnist"), Icon: Utensils },
  ];

  const communityNotes = language === "ca" && menu.communityNotesCa?.trim()
    ? menu.communityNotesCa.trim()
    : menu.communityNotes?.trim();

  const handleDishSuccess = (updatedItem: MenuItem) => {
    const updatedSections = menu.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    }));
    const updatedMenu = { ...menu, sections: updatedSections };
    onUpdateMenu?.(updatedMenu);
  };

  const handleNotesSuccess = (updatedMenu: MenuDraft) => {
    onUpdateMenu?.(updatedMenu);
  };

  return (
    <div className="menu-view">
      <header className="public-menu-heading">
        <p className="menu-eyebrow">Menu</p>
        <h1>{menu.restaurantName || tx("Restaurant menu")}</h1>
        <div className="menu-header-actions">
          {menu.sourceUrl && (
            <a
              className="menu-website-link"
              href={menu.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink />{tx("Open original website")}
            </a>
          )}
          {presentableSources.map((source, index) => (
            <a
              key={source.url}
              className="menu-website-link"
              href={resolveApiUrl(source.url)}
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen />{tx("Open saved original")}{presentableSources.length > 1 ? ` ${tx("Page").toLocaleLowerCase()} ${index + 1}` : ""}
            </a>
          ))}
          <button
            type="button"
            className="text-button edit-notes-button"
            onClick={() => setIsEditingNotes(true)}
          >
            <MessageSquareWarning />
            {communityNotes ? tx("Edit venue notes") : tx("Add venue notes")}
          </button>
        </div>

        {communityNotes && (
          <div className="community-notes-banner">
            <div className="community-notes-content">
              <MessageSquareWarning className="notes-icon" />
              <div>
                <strong>{tx("Community note")}:</strong>
                <p>{communityNotes}</p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setIsEditingNotes(true)}
              aria-label={tx("Edit notes")}
            >
              <Pencil />
            </button>
          </div>
        )}
      </header>

      <nav className="menu-filter-bar" aria-label={tx("Diet filter")}>
        {dietButtons.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className={`${selectedDiets.has(value) && !allSelected ? "active " : ""}filter-${value}`}
            aria-pressed={selectedDiets.has(value) && !allSelected}
            onClick={() => toggleDiet(value)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong
              title={adaptableCounts[value] > 0
                ? `${nativeCounts[value]} as listed; ${
                  nativeCounts[value] + adaptableCounts[value]
                } including practical adaptations`
                : `${nativeCounts[value]} as listed`}
            >
              {nativeCounts[value]}
              {adaptableCounts[value] > 0 &&
                ` (${nativeCounts[value] + adaptableCounts[value]})`}
            </strong>
          </button>
        ))}
        <button
          type="button"
          className={allSelected ? "active filter-all" : "filter-all"}
          aria-pressed={allSelected}
          onClick={() => {
            setAllSelected(true);
            setSelectedDiets(new Set());
          }}
        >
          <span>{t("all")}</span>
          <strong>{allItems.length}</strong>
        </button>
        <label className="menu-adaptable-toggle">
          <input
            type="checkbox"
            checked={showAdaptable}
            onChange={(event) => setShowAdaptable(event.target.checked)}
          />
          <Wrench />
          {tx("Show adaptable")}
        </label>
      </nav>

      <p className="menu-result-count">
        {language === "ca" ? "Es mostren" : "Showing"} <strong>{shownCount}</strong>{" "}
        {language === "ca" ? "de" : "of"} <strong>{allItems.length}</strong>{" "}
        {language === "ca" ? "plats" : "dishes"}
      </p>

      {sections.length === 0 && (
        <div className="empty-state">{tx("Select a diet to show matching dishes.")}</div>
      )}

      <div className="menu-paper">
        {sections.map((section) => (
          <section key={section.id} className="menu-section">
            <h2>{displaySectionName(section, language)}</h2>
            <div className="menu-dish-list">
              {section.items.map((item) => {
                const group = verdictGroup(item.verdict);
                const reasonOpen = openReasons.has(item.id);
                const extractedDescription =
                  item.description.trim() || descriptionFromReason(item.reason);
                const description = visibleMenuDescription({
                  ...item,
                  description: extractedDescription,
                });
                const displayText = menuDisplayText({
                  ...item,
                  description,
                });
                const reason = item.reason.trim();
                const classificationReason =
                  !item.description.trim() && extractedDescription === reason
                    ? informativeMenuReason({ ...item, reason: "" })
                    : informativeMenuReason(item);
                const modifications = itemModifications(item).filter(
                  (entry) => allSelected || selectedDiets.has(entry.target),
                );

                return (
                  <article key={item.id} className={`menu-dish menu-dish-${group}`}>
                    <div className="menu-dish-heading">
                      <div>
                        <h3>{displayItemName(item, displayText.name, language)}</h3>
                      </div>
                      <div className="menu-dish-heading-right">
                        {item.price.trim() && <strong>{item.price}</strong>}
                        <button
                          type="button"
                          className="icon-button edit-dish-button"
                          onClick={() => setEditingItem(item)}
                          aria-label={tx("Correct dish")}
                          title={tx("Correct dish or add note")}
                        >
                          <Pencil />
                        </button>
                      </div>
                    </div>

                    {displayText.description && (
                      <p className="menu-dish-description">
                        {displayItemDescription(item, displayText.description, language)}
                      </p>
                    )}

                    <div className="menu-dish-meta">
                      <span className={`menu-diet-label menu-diet-label-${group}`}>
                        {verdictLabel(item.verdict)}
                      </span>
                      {showAdaptable && modifications.map((entry) => (
                        <span
                          key={entry.target}
                          className={`menu-adaptable-label menu-adaptable-${entry.target}`}
                        >
                          <Wrench />{tx("Adaptable to")} {entry.target === "vegan" ? t("vegan").toLocaleLowerCase() : t("vegetarian").toLocaleLowerCase()}
                        </span>
                      ))}
                      {item.sourcePage && (
                        onSourceReference ? (
                          <button
                            type="button"
                            className="menu-source-reference menu-source-button"
                            onClick={() => onSourceReference(item)}
                            title={`Open page ${item.sourcePage} in the original menu`}
                          >
                            <BookOpen />{tx("Page")} {item.sourcePage}
                          </button>
                        ) : savedPdf ? (
                          <a
                            className="menu-source-reference menu-source-button"
                            href={sourcePdfPageUrl(savedPdf.url, item.sourcePage)}
                            target="_blank"
                            rel="noreferrer"
                            title={`Open page ${item.sourcePage} in the original menu`}
                          >
                            <BookOpen />{tx("Page")} {item.sourcePage}
                          </a>
                        ) : (
                          <span className="menu-source-reference">
                            <BookOpen />{tx("Page")} {item.sourcePage}
                          </span>
                        )
                      )}
                      {classificationReason && (
                        <button
                          type="button"
                          className="menu-info-button"
                          aria-label={`${reasonOpen ? "Hide" : "Show"} classification reason for ${item.name}`}
                          aria-expanded={reasonOpen}
                          onClick={() =>
                            setOpenReasons((current) => {
                              const next = new Set(current);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            })
                          }
                        >
                          <Info />
                        </button>
                      )}
                    </div>

                    {showAdaptable && modifications.map((entry) => (
                      <p
                        key={entry.target}
                        className={`modification-note modification-note-${entry.target}`}
                      >
                        {displayModificationNote(entry, language)}
                      </p>
                    ))}
                    {reasonOpen && classificationReason && (
                      <p className="menu-reason" role="status">
                        {displayItemReason(item, classificationReason, language)}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {editingItem && (
        <DishCorrectionDialog
          item={editingItem}
          menuId={menu.id}
          token={menu.editToken === "public" ? undefined : menu.editToken}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSuccess={handleDishSuccess}
        />
      )}

      {isEditingNotes && (
        <RestaurantNotesDialog
          menuId={menu.id}
          token={menu.editToken === "public" ? undefined : menu.editToken}
          currentNotes={
            language === "ca"
              ? (menu.communityNotesCa || menu.communityNotes)
              : menu.communityNotes
          }
          isOpen={isEditingNotes}
          onClose={() => setIsEditingNotes(false)}
          onSuccess={handleNotesSuccess}
        />
      )}
    </div>
  );
}
