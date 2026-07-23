import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function Accounts() {
  const { isAdmin } = useAuth();
  const { t, formatCurrency, formatDate, errorMessage, enumLabel } = useI18n();
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const [selected, setSelected] = useState<string | null>(null);
  const { data: ledger } = useQuery({
    queryKey: ["account-ledger", selected],
    queryFn: () => api.get(`/accounts/${selected}/ledger`).then((r) => r.data),
    enabled: !!selected,
  });

  const [deleteError, setDeleteError] = useState("");
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); setSelected(null); setDeleteError(""); },
    onError: (error) => setDeleteError(errorMessage(error, "accounts.removeError")),
  });

  const [showTransfer, setShowTransfer] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const transfer = useMutation({
    mutationFn: () => api.post("/accounts/transfer", { from_account_id: from, to_account_id: to, amount: Number(amount || 0) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setShowTransfer(false);
      setAmount("");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("accounts.title")}</h1>
        {isAdmin && <button className="btn-primary" onClick={() => setShowTransfer(!showTransfer)}>{t("accounts.internalTransfer")}</button>}
      </div>

      {showTransfer && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">{t("common.from")}</label>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">{t("common.select")}</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("common.to")}</label>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">{t("common.select")}</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("common.amount")}</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <button className="btn-primary" disabled={!from || !to || !amount || from === to} onClick={() => transfer.mutate()}>{t("common.transfer")}</button>
        </div>
      )}

      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(accounts ?? []).map((a: any) => (
          <div key={a.id} className={`card text-left transition-shadow hover:shadow-card-hover ${selected === a.id ? "ring-2 ring-brand-500" : ""}`}>
            <button className="w-full text-left" onClick={() => setSelected(a.id)}>
              <div className="text-sm text-gray-500 dark:text-slate-400">{enumLabel(a.type)}</div>
              <div className="font-medium">{a.name}</div>
              <div className="num text-xl font-display font-semibold mt-2">{formatCurrency(a.current_balance)}</div>
            </button>
            {isAdmin && (
              <button
                className="text-red-600 dark:text-red-400 text-xs mt-2"
                onClick={() => {
                  if (confirm(t("accounts.removeConfirm", { name: a.name }))) remove.mutate(a.id);
                }}
              >
                {t("accounts.remove")}
              </button>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">{t("accounts.ledger")}</div>
          <div className="table-scroll">
          <table className="table-base">
            <thead><tr><th>{t("common.date")}</th><th>{t("common.type")}</th><th>{t("common.amount")}</th><th>{t("common.reference")}</th><th>{t("accounts.balanceAfter")}</th></tr></thead>
            <tbody>
              {(ledger ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td>{enumLabel(e.type)}</td>
                  <td>{formatCurrency(e.amount)}</td>
                  <td>{enumLabel(e.reference_type)}</td>
                  <td>{formatCurrency(e.resulting_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
