import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { t, errorMessage, enumLabel } = useI18n();
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/users").then((r) => r.data) });
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const [deleteError, setDeleteError] = useState("");
  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeleteError(""); },
    onError: (error) => setDeleteError(errorMessage(error, "settings.deactivateError")),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [wingId, setWingId] = useState("");
  const [note, setNote] = useState("");
  const [createError, setCreateError] = useState("");

  const createUser = useMutation({
    mutationFn: () => api.post("/users", { name, phone, password, role, wing_id: role === "MEMBER" ? wingId : undefined, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setName(""); setPhone(""); setPassword(""); setNote("");
      setCreateError("");
    },
    onError: (error) => setCreateError(errorMessage(error, "settings.createError")),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("settings.title")}</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        {t("settings.help")}
      </p>

      <div className="card grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">{t("common.name")}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">{t("common.phone")}</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div>
          <label className="label">{t("common.password")}</label>
          <input className="input" type="password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-1 text-xs text-gray-400 dark:text-slate-500">{t("settings.passwordHelp")}</div>
        </div>
        <div>
          <label className="label">{t("common.role")}</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="MEMBER">{t("common.member")}</option>
            <option value="ADMIN">{t("common.admin")}</option>
          </select>
        </div>
        {role === "MEMBER" && (
          <div className="sm:col-span-2">
            <label className="label">{t("common.wing")}</label>
            <select className="input" value={wingId} onChange={(e) => setWingId(e.target.value)}>
              <option value="">{t("common.selectWing")}</option>
              {(wings ?? []).map((w: any) => <option key={w.id} value={w.id}>{enumLabel(w.name)}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-2"><label className="label">{t("common.noteOptional")}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        {createError && <div className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{createError}</div>}
        <button className="btn-primary sm:col-span-2" disabled={!name || !phone || password.length < 8 || (role === "MEMBER" && !wingId)} onClick={() => createUser.mutate()}>
          {t("settings.createUser")}
        </button>
      </div>

      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.name")}</th><th>{t("common.phone")}</th><th>{t("common.role")}</th><th>{t("common.wing")}</th><th>{t("common.active")}</th><th><span className="sr-only">{t("common.actions")}</span></th></tr></thead>
          <tbody>
            {(users ?? []).map((u: any) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.phone}</td><td>{enumLabel(u.role)}</td><td>{enumLabel((wings ?? []).find((wing: any) => wing.id === u.wing_id)?.name)}</td><td>{u.is_active ? t("common.yes") : t("common.no")}</td>
                <td>
                  {u.is_active && u.id !== currentUser?.id && (
                    <button
                      className="text-red-600 dark:text-red-400 text-sm"
                      onClick={() => { if (confirm(t("settings.deactivateConfirm", { name: u.name }))) deactivate.mutate(u.id); }}
                    >
                      {t("settings.deactivate")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
