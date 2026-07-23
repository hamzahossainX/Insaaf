import { Languages } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <label
      className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 text-gray-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 ${
        compact ? "px-2 py-1" : "w-full px-3 py-1.5"
      }`}
      title={t("language.label")}
    >
      <Languages size={compact ? 16 : 17} className="shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        className={`min-w-0 flex-1 cursor-pointer bg-transparent font-medium outline-none ${
          compact ? "max-w-[5.75rem] text-xs" : "text-[13.5px]"
        }`}
        value={language}
        onChange={(event) => setLanguage(event.target.value as "en" | "bn")}
        aria-label={t("language.label")}
      >
        <option value="en">{t("language.english")}</option>
        <option value="bn">{t("language.bangla")}</option>
      </select>
    </label>
  );
}
