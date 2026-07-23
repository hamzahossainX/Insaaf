import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import en from "../i18n/en.json";
import bn from "../i18n/bn.json";

export type Language = "en" | "bn";
type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  locale: "en-BD" | "bn-BD";
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslationValues) => string;
  formatCurrency: (amount: number | string) => string;
  formatDate: (value: string | number | Date) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  enumLabel: (value: string | null | undefined) => string;
  errorMessage: (error: unknown, fallbackKey: string) => string;
}

const STORAGE_KEY = "insaaf_language";
const dictionaries = { en, bn } as const;
const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const serverErrorKeys: Record<string, string> = {
  "Validation failed": "errors.validationFailed",
  "Database is busy; please retry shortly": "errors.databaseBusy",
  "Record not found": "errors.recordNotFound",
  "A record with these values already exists": "errors.duplicate",
  "This record is referenced by another record": "errors.referenced",
  "Internal server error": "errors.server",
  "Too many login attempts. Please try again later.": "errors.tooManyAttempts",
  "Current password is incorrect": "errors.currentPassword",
  "New password must be different from the current password": "errors.samePassword",
  "You cannot deactivate your own account": "errors.ownAccount",
  "The last active admin cannot be deactivated": "errors.lastAdmin",
  "The last active admin cannot lose admin access": "errors.lastAdminAccess",
  "A member must be assigned to a wing": "errors.memberWing",
  "Admin role required for this action": "errors.adminRequired",
  "Members can only create records, not update or delete": "errors.memberWrite",
  "Members may only operate within their assigned wing": "errors.wingOnly"
};

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return navigator.language.toLowerCase().startsWith("bn") ? "bn" : "en";
}

function lookup(dictionary: unknown, key: string): string | undefined {
  let current: unknown = dictionary;
  for (const segment of key.split(".")) {
    if (!current || typeof current !== "object" || !(segment in current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? `{{${key}}}`));
}

function responseErrorText(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const response = (error as { response?: { data?: { error?: unknown } } }).response;
  return typeof response?.data?.error === "string" ? response.data.error : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const locale = language === "bn" ? "bn-BD" : "en-BD";

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, values?: TranslationValues) => {
      const translated = lookup(dictionaries[language], key) ?? lookup(en, key) ?? key;
      return interpolate(translated, values);
    };

    const formatNumber = (number: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(number);

    return {
      language,
      locale,
      setLanguage,
      t,
      formatNumber,
      formatCurrency: (amount) =>
        `৳ ${formatNumber(typeof amount === "string" ? Number(amount) : amount, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
      formatDate: (date) => new Intl.DateTimeFormat(locale).format(new Date(date)),
      enumLabel: (enumValue) => enumValue ? (lookup(dictionaries[language], `enums.${enumValue}`) ?? enumValue.replace(/_/g, " ")) : "—",
      errorMessage: (error, fallbackKey) => {
        const serverMessage = responseErrorText(error);
        const translatedKey = serverMessage ? serverErrorKeys[serverMessage] : undefined;
        return translatedKey ? t(translatedKey) : t(fallbackKey);
      }
    };
  }, [language, locale]);

  useEffect(() => {
    document.documentElement.lang = language === "bn" ? "bn" : "en";
    document.documentElement.dir = "ltr";
    document.documentElement.classList.toggle("lang-bn", language === "bn");
    document.title = value.t("app.title");
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The language still remains active for the current session.
    }
  }, [language, value]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
