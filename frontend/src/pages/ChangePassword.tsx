import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function ChangePassword() {
  const { logout } = useAuth();
  const { t, errorMessage } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmation) {
      setError("mismatch");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      logout();
      navigate("/login", { replace: true });
    } catch (requestError: any) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("changePassword.title")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {t("changePassword.help")}
        </p>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        {error !== null && (
          <div className="text-sm text-red-700 dark:text-red-400">
            {error === "mismatch" ? t("changePassword.mismatch") : errorMessage(error, "changePassword.error")}
          </div>
        )}
        <div>
          <label className="label">{t("changePassword.current")}</label>
          <input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} onInvalid={(event) => event.currentTarget.setCustomValidity(t("validation.required"))} onInput={(event) => event.currentTarget.setCustomValidity("")} required />
        </div>
        <div>
          <label className="label">{t("changePassword.new")}</label>
          <input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} onInvalid={(event) => event.currentTarget.setCustomValidity(event.currentTarget.validity.valueMissing ? t("validation.required") : t("validation.minLength", { count: 8 }))} onInput={(event) => event.currentTarget.setCustomValidity("")} required />
        </div>
        <div>
          <label className="label">{t("changePassword.confirm")}</label>
          <input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onInvalid={(event) => event.currentTarget.setCustomValidity(event.currentTarget.validity.valueMissing ? t("validation.required") : t("validation.minLength", { count: 8 }))} onInput={(event) => event.currentTarget.setCustomValidity("")} required />
        </div>
        <button className="btn-primary w-full" disabled={saving} type="submit">
          {saving ? t("changePassword.submitting") : t("changePassword.submit")}
        </button>
      </form>
    </div>
  );
}
