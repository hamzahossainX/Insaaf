import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

export default function Accounts() {
  const { isAdmin } = useAuth();
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
    onError: (e: any) => setDeleteError(e?.response?.data?.error ?? "Could not remove this account"),
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
      <div className="flex flex-wrap gap-2 justify-between items-center page-header">
        <div className="flex items-center gap-3">
          <div className="page-header-icon"><Wallet size={20} /></div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setShowTransfer(!showTransfer)}>Internal transfer</button>}
      </div>

      {showTransfer && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">From</label>
            <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Select...</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">To</label>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Select...</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <button className="btn-primary" disabled={!from || !to || !amount || from === to} onClick={() => transfer.mutate()}>Transfer</button>
        </div>
      )}

      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(accounts ?? []).map((a: any) => (
          <div key={a.id} className={`card text-left ${selected === a.id ? "ring-2 ring-brand-500" : ""}`}>
            <button className="w-full text-left" onClick={() => setSelected(a.id)}>
              <div className="text-sm text-gray-500 dark:text-slate-400">{a.type}</div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xl font-semibold mt-2">{currency(a.current_balance)}</div>
            </button>
            {isAdmin && (
              <button
                className="text-red-600 dark:text-red-400 text-xs mt-2"
                onClick={() => {
                  if (confirm(`Remove account "${a.name}"? Only possible if its balance is zero.`)) remove.mutate(a.id);
                }}
              >
                Remove account
              </button>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">Ledger</div>
          <div className="table-scroll">
          <table className="table-base">
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reference</th><th>Balance after</th></tr></thead>
            <tbody>
              {(ledger ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td>{e.type}</td>
                  <td>{currency(e.amount)}</td>
                  <td>{e.reference_type}</td>
                  <td>{currency(e.resulting_balance)}</td>
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
