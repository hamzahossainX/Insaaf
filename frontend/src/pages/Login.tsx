import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Moon, Sun } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { useI18n } from "../lib/i18n";
import LanguageSelector from "../components/LanguageSelector";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setHasError(false);
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Ambient gradient backdrop — quiet, not a spotlight; a signature without being loud */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-brand-300/25 dark:bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-24 w-[36rem] h-[36rem] rounded-full bg-brand-500/15 dark:bg-brand-400/[0.06] blur-3xl" />
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <LanguageSelector compact />
        <button
          className="p-2 rounded-lg text-gray-500 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/70"
          onClick={toggleTheme}
          aria-label={t("nav.toggleTheme")}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 card w-full max-w-sm space-y-5 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center gap-3 pb-1">
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-glow">
            <Flame size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-xl font-semibold text-gray-900 dark:text-slate-100">{t("app.name")}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">{t("login.subtitle")}</div>
          </div>
        </div>

        {hasError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
            {t("login.invalidCredentials")}
          </div>
        )}

        <div>
          <label className="label">{t("common.phone")}</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onInvalid={(e) => e.currentTarget.setCustomValidity(t("validation.required"))}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            placeholder="01XXXXXXXXX"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label">{t("common.password")}</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onInvalid={(e) => e.currentTarget.setCustomValidity(t("validation.required"))}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? t("login.signingIn") : t("login.signIn")}
        </button>
        {import.meta.env.DEV && (
          <div className="text-xs text-gray-400 dark:text-slate-500 pt-3 border-t border-gray-100 dark:border-slate-800 text-center">
            {t("login.devHelp")}
          </div>
        )}
      </form>
    </div>
  );
}
