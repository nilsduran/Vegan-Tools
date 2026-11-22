import { setLanguage, tx, useLanguage, type Language } from "../i18n";
import { FlagCatalonia, FlagUK } from "./FlagIcons";

const OPTIONS: Array<{ value: Language; label: string; Flag: typeof FlagUK }> = [
  { value: "en", label: "English", Flag: FlagUK },
  { value: "ca", label: "Català", Flag: FlagCatalonia },
];

/**
 * Header language switcher, available to everyone. Settings has the same
 * choice, but it is only linked from the profile, so without it a visitor
 * who is not signed in could not change the language at all.
 */
export function LanguageSwitcher() {
  const language = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={tx("Language")}>
      {OPTIONS.map(({ value, label, Flag }) => (
        <button
          key={value}
          type="button"
          className={language === value ? "active" : ""}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
          title={label}
          lang={value}
        >
          <Flag />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
