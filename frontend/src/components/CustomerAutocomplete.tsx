import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useI18n } from "../lib/i18n";

interface Customer {
  id: string;
  name: string;
  phone: string;
  current_due_balance: string | number;
}

export default function CustomerAutocomplete({
  value,
  onChange,
  placeholder,
}: {
  value: string; // selected customer_id
  onChange: (customerId: string, customer: Customer | null) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: results } = useQuery({
    queryKey: ["customer-search", query],
    queryFn: () => api.get("/customers", { params: { search: query } }).then((r) => r.data),
    enabled: query.length > 0,
  });

  // Clear the visible text if the parent resets the selected value externally
  useEffect(() => {
    if (!value) setSelectedLabel("");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function select(c: Customer) {
    onChange(c.id, c);
    setSelectedLabel(`${c.name} (${c.phone})`);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input"
        placeholder={placeholder ?? t("autocomplete.placeholder")}
        value={open || query ? query : selectedLabel}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("", null); // typing again clears the previous selection
        }}
      />
      {open && query.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {(results ?? []).length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">{t("autocomplete.noMatches", { query })}</div>
          )}
          {(results ?? []).map((c: Customer) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 flex justify-between items-center"
              onClick={() => select(c)}
            >
              <span>{c.name} <span className="text-gray-400 dark:text-slate-500">· {c.phone}</span></span>
              {Number(c.current_due_balance) > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400">{t("autocomplete.due")}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
