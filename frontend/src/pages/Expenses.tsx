import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

export default function Expenses() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [category, setCategoryFilter] = useState("");
  const { data: expenses } = useQuery({
    queryKey: ["expenses", category, user?.wing_id],
    queryFn: () => api.get("/expenses", { params: { category: category || undefined, wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });
  const [deleteError, setDeleteError] = useState("");
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); setDeleteError(""); },
    onError: (e: any) => setDeleteError(e?.response?.data?.error ?? "Could not delete this expense"),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });

  const [showForm, setShowForm] = useState(false);
  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");

  const create = useMutation({
    mutationFn: () => api.post("/expenses", { category: cat, amount: Number(amount || 0), paid_from_account_id: account, note, wing_id: user?.wing_id ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      setAmount("");
      setCat("");
      setNote("");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Expenses</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add expense</button>
      </div>

      {showForm && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div><label className="label">Category</label><input className="input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Fuel, Maintenance..." /></div>
          <div><label className="label">Amount</label><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          <div>
            <label className="label">Paid from</label>
            <select className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="">Select...</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div><label className="label">Note</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button className="btn-primary sm:col-span-2 lg:col-span-4" disabled={!cat || !amount || !account} onClick={() => create.mutate()}>Save expense</button>
        </div>
      )}

      <input className="input max-w-xs" placeholder="Filter by category..." value={category} onChange={(e) => setCategoryFilter(e.target.value)} />
      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {(expenses ?? []).map((e: any) => (
              <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td>{e.category}</td>
                <td>{currency(e.amount)}</td>
                <td className="text-gray-500 dark:text-slate-400">{e.note}</td>
                <td>
                  {isAdmin && (
                    <button
                      className="icon-btn-danger"
                      title="Delete expense"
                      onClick={() => { if (confirm("Delete this expense? The amount will be reversed back into its account.")) remove.mutate(e.id); }}
                    >
                      <Trash2 size={16} />
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
