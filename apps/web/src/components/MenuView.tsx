import { useMemo, useState } from "react";
import type { DietVerdict, MenuDraft } from "@vegan-tools/domain";
import { CalendarDays, Filter } from "lucide-react";
import { VerdictBadge } from "./VerdictBadge";
import { t } from "../i18n";

export function MenuView({ menu }: { menu: MenuDraft }) {
  const [filter, setFilter] = useState<DietVerdict | "all">("vegan");
  const [includeModifications, setIncludeModifications] = useState(true);

  const sections = useMemo(
    () =>
      menu.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            if (filter === "all") return true;
            if (item.verdict === filter) return true;
            if (!includeModifications) return false;
            if (item.modifiableTo === filter) return true;
            return item.modifiableTo === "vegan" && filter === "vegetarian";
          }),
        }))
        .filter((section) => section.items.length > 0),
    [filter, includeModifications, menu.sections],
  );

  return (
    <div className="menu-view">
      <header className="public-menu-heading">
        <h1>{menu.restaurantName || "Restaurant menu"}</h1>
        <div className="menu-provenance">
          <span><CalendarDays />Captured {new Date(menu.sourceCapturedAt).toLocaleDateString()}</span>
          <span>{menu.sourceLabel}</span>
          {menu.service && <span>{menu.service}</span>}
          {menu.validOn && <span>Valid on {menu.validOn}</span>}
        </div>
      </header>

      <div className="menu-controls">
        <div className="filter-row" aria-label="Diet filter">
          <Filter aria-hidden="true" />
          {(["vegan", "probably_vegan", "vegetarian", "probably_vegetarian", "non_vegetarian", "unknown", "all"] as const).map((value) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {value === "all"
                ? t("all")
                : value === "probably_vegan"
                  ? t("probablyVegan")
                  : value === "probably_vegetarian"
                    ? t("probablyVegetarian")
                    : value === "non_vegetarian"
                      ? t("nonVegetarian")
                      : t(value)}
            </button>
          ))}
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={includeModifications}
            onChange={(event) => setIncludeModifications(event.target.checked)}
          />
          {t("includeModifications")}
        </label>
      </div>

      {sections.length === 0 && (
        <div className="empty-state">No dishes match these filters.</div>
      )}

      {sections.map((section) => (
        <section key={section.id} className="menu-section">
          <h2>{section.name}</h2>
          <div className="dish-grid">
            {section.items.map((item) => (
              <article key={item.id} className="dish-card">
                <div className="dish-title">
                  <div>
                    <h3>{item.name}</h3>
                    {item.originalName !== item.name && (
                      <p className="original-name">{item.originalName}</p>
                    )}
                  </div>
                  {item.price && <strong>{item.price}</strong>}
                </div>
                {item.description && <p>{item.description}</p>}
                <div className="dish-footer">
                  <VerdictBadge verdict={item.verdict} />
                  {item.reason && <span className="dish-reason">{item.reason}</span>}
                </div>
                {item.modificationNote && (
                  <p className="modification-note">{item.modificationNote}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
