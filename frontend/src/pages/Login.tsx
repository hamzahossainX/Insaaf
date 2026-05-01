import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Moon, Sun, Phone, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch {
      setError("Invalid phone or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-gray-50 dark:from-slate-900 dark:to-slate-950 px-4 py-10 relative overflow-hidden">
      {/* Ambient decorative blobs — purely cosmetic, ignore pointer events */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-300/30 dark:bg-brand-500/10 blur-3xl animate-floaty" />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-sky-300/25 dark:bg-sky-500/10 blur-3xl animate-floaty"
        style={{ animationDelay: "1.2s" }}
      />

      <button
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800 transition-transform active:scale-90 z-10"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-5 relative z-10 animate-scale-in shadow-glow-lg">
        <div className="flex flex-col items-center text-center gap-3 pb-1">
          <div className="w-14 h-14 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-glow-lg animate-glow-pulse">
            <Flame size={26} className="animate-floaty" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-slate-100">Insaaf ERP</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">Oxygen Wing — sign in</div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 animate-fade-in-up">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="label">Phone</label>
          <div className="relative">
            <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              className="input pl-9"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01700000001"
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              className="input pl-9"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign in
            </>
          )}
        </button>
        <div className="text-xs text-gray-400 dark:text-slate-500 pt-3 border-t border-gray-100 dark:border-slate-700">
          Seed logins — Admin: 01700000001 / admin123 · Member: 01700000002 / member123
        </div>
      </form>
    </div>
  );
}
