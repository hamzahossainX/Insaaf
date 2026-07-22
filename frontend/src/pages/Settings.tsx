import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/users").then((r) => r.data) });
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const [deleteError, setDeleteError] = useState("");
  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeleteError(""); },
    onError: (e: any) => setDeleteError(e?.response?.data?.error ?? "Could not deactivate this user"),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [wingId, setWingId] = useState("");
  const [note, setNote] = useState("");

  const createUser = useMutation({
    mutationFn: () => api.post("/users", { name, phone, password, role, wing_id: role === "MEMBER" ? wingId : undefined, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setName(""); setPhone(""); setPassword(""); setNote("");
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Settings — User Management</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Gas categories/sizes and expense categories are managed inline from the Products and Expenses screens
        (they're seeded as data, not hardcoded, so new ones can be added freely). Accounts are managed from the
        Accounts screen. This page covers Admin/Member user management.
      </p>

      <div className="card grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div><label className="label">Password</label><input className="input" type="password" minLength={12} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {role === "MEMBER" && (
          <div className="sm:col-span-2">
            <label className="label">Wing</label>
            <select className="input" value={wingId} onChange={(e) => setWingId(e.target.value)}>
              <option value="">Select wing...</option>
              {(wings ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
        <div className="sm:col-span-2"><label className="label">Note (optional)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button className="btn-primary sm:col-span-2" disabled={!name || !phone || !password || (role === "MEMBER" && !wingId)} onClick={() => createUser.mutate()}>
          Create user
        </button>
      </div>

      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Wing</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(users ?? []).map((u: any) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.phone}</td><td>{u.role}</td><td>{u.wing_id ?? "—"}</td><td>{u.is_active ? "Yes" : "No"}</td>
                <td>
                  {u.is_active && u.id !== currentUser?.id && (
                    <button
                      className="text-red-600 dark:text-red-400 text-sm"
                      onClick={() => { if (confirm(`Deactivate ${u.name}? They won't be able to log in anymore.`)) deactivate.mutate(u.id); }}
                    >
                      Deactivate
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
