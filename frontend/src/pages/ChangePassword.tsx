import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";

export default function ChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("New password and confirmation do not match.");
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
      setError(requestError?.response?.data?.error ?? "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Change password</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Use at least 8 characters. Changing it signs out every existing session for this account.
        </p>
      </div>
      <form onSubmit={submit} className="card space-y-4">
        {error && <div className="text-sm text-red-700 dark:text-red-400">{error}</div>}
        <div>
          <label className="label">Current password</label>
          <input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </div>
        <button className="btn-primary w-full" disabled={saving} type="submit">
          {saving ? "Changing password..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
