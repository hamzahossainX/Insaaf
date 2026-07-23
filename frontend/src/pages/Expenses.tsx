import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function Expenses() {
  const { user, isAdmin } = useAuth();
  const { t, formatCurrency, formatDate, errorMessage } = useI18n();
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
    onError: (error) => setDeleteError(errorMessage(error, "expenses.deleteError")),
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
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("expenses.title")}</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{t("expenses.add")}</button>
      </div>

      {showForm && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div><label className="label">{t("common.category")}</label><input className="input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder={t("expenses.categoryPlaceholder")} /></div>
          <div><label className="label">{t("common.amount")}</label><input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} /></div>
          <div>
            <label className="label">{t("expenses.paidFrom")}</label>
            <select className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="">{t("common.select")}</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div><label className="label">{t("common.note")}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <button className="btn-primary sm:col-span-2 lg:col-span-4" disabled={!cat || !amount || !account} onClick={() => create.mutate()}>{t("expenses.save")}</button>
        </div>
      )}

      <input className="input max-w-xs" placeholder={t("expenses.filter")} value={category} onChange={(e) => setCategoryFilter(e.target.value)} />
      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.category")}</th><th>{t("common.amount")}</th><th>{t("common.note")}</th><th><span className="sr-only">{t("common.actions")}</span></th></tr></thead>
          <tbody>
            {(expenses ?? []).map((e: any) => (
              <tr key={e.id}>
                <td>{formatDate(e.date)}</td>
                <td>{e.category}</td>
                <td>{formatCurrency(e.amount)}</td>
                <td className="text-gray-500 dark:text-slate-400">{e.note}</td>
                <td>
                  {isAdmin && (
                    <button
                      className="icon-btn-danger"
                      title={t("expenses.delete")}
                      onClick={() => { if (confirm(t("expenses.deleteConfirm"))) remove.mutate(e.id); }}
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
