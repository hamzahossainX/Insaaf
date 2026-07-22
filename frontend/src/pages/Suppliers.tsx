import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

export default function SuppliersRoutes() {
  return (
    <Routes>
      <Route index element={<SupplierList />} />
      <Route path=":id" element={<SupplierProfile />} />
    </Routes>
  );
}

function SupplierList() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [hasPayableOnly, setHasPayableOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { data: suppliers, refetch } = useQuery({
    queryKey: ["suppliers", search, hasPayableOnly],
    queryFn: () => api.get("/suppliers", { params: { search: search || undefined, has_payable: hasPayableOnly || undefined } }).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: any) => alert(e?.response?.data?.error ?? "Could not delete this supplier"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Suppliers</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New supplier</button>
      </div>

      {showForm && <NewSupplierForm onDone={() => { setShowForm(false); refetch(); }} />}

      <div className="flex gap-3">
        <input className="input max-w-xs" placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasPayableOnly} onChange={(e) => setHasPayableOnly(e.target.checked)} />
          Has payable due only
        </label>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Payable balance</th><th></th></tr>
          </thead>
          <tbody>
            {(suppliers ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.phone}</td>
                <td className={Number(s.current_payable_balance) > 0 ? "text-red-600 dark:text-red-400 font-medium" : Number(s.current_payable_balance) < 0 ? "text-green-700 dark:text-green-400 font-medium" : ""}>
                  {currency(s.current_payable_balance)}
                  {Number(s.current_payable_balance) < 0 && <span className="text-xs text-gray-400 ml-1">(credit)</span>}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link className="icon-btn" to={`/suppliers/${s.id}`} title="View profile">
                      <Eye size={16} />
                    </Link>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title="Delete supplier"
                        onClick={() => { if (confirm(`Delete supplier "${s.name}"? This can't be undone.`)) remove.mutate(s.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(suppliers ?? []).length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function NewSupplierForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () => api.post("/suppliers", { name, phone, address, notes: notes || undefined }),
    onSuccess: onDone,
  });
  return (
    <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <input className="input sm:col-span-3" placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn-primary sm:col-span-3" disabled={!name || !phone} onClick={() => create.mutate()}>Save supplier</button>
    </div>
  );
}

function SupplierProfile() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["supplier", id], queryFn: () => api.get(`/suppliers/${id}`).then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const { data: products } = useQuery({
    queryKey: ["products", user?.wing_id],
    queryFn: () => api.get("/products", { params: { wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/suppliers/${id}`),
    onSuccess: () => navigate("/suppliers"),
    onError: (e: any) => alert(e?.response?.data?.error ?? "Could not delete this supplier"),
  });

  // Record payment (advance or installment)
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payType, setPayType] = useState<"ADVANCE" | "INSTALLMENT">("INSTALLMENT");
  const [payAccount, setPayAccount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const recordPayment = useMutation({
    mutationFn: () => api.post("/suppliers/payments", { supplier_id: id, amount: Number(payAmount || 0), type: payType, paid_from_account_id: payAccount, note: payNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setPayAmount(""); setPayNote(""); setPayError("");
    },
    onError: (e: any) => setPayError(e?.response?.data?.error ?? "Failed to record payment"),
  });

  // Send empty cylinders to supplier
  const [sendProduct, setSendProduct] = useState("");
  const [sendQty, setSendQty] = useState<number | "">("");
  const [sendNote, setSendNote] = useState("");
  const [sendError, setSendError] = useState("");
  const sendCylinders = useMutation({
    mutationFn: () => api.post("/suppliers/sends", { supplier_id: id, product_id: sendProduct, quantity_sent: Number(sendQty || 0), note: sendNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setSendQty(""); setSendNote(""); setSendError("");
    },
    onError: (e: any) => setSendError(e?.response?.data?.error ?? "Failed to record send"),
  });

  // Receive from supplier (refill and/or new)
  const [recvProduct, setRecvProduct] = useState("");
  const [recvRefillQty, setRecvRefillQty] = useState<number | "">("");
  const [recvNewQty, setRecvNewQty] = useState<number | "">("");
  const [recvTotal, setRecvTotal] = useState<number | "">("");
  const [recvPaidNow, setRecvPaidNow] = useState<number | "">("");
  const [recvAccount, setRecvAccount] = useState("");
  const [recvNote, setRecvNote] = useState("");
  const [recvError, setRecvError] = useState("");
  const recvTotalNum = Number(recvTotal || 0);
  const recvPaidNowNum = Number(recvPaidNow || 0);
  const recvDue = Math.max(0, round2(recvTotalNum - recvPaidNowNum));
  const receiveFromSupplier = useMutation({
    mutationFn: () => api.post("/suppliers/receipts", {
      supplier_id: id,
      product_id: recvProduct,
      refill_quantity: Number(recvRefillQty || 0),
      new_quantity: Number(recvNewQty || 0),
      total_amount: recvTotalNum,
      paid_now_amount: recvPaidNowNum,
      paid_from_account_id: recvPaidNowNum > 0 ? recvAccount : undefined,
      due_amount: recvDue,
      note: recvNote || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setRecvRefillQty(""); setRecvNewQty(""); setRecvTotal(""); setRecvPaidNow(""); setRecvNote(""); setRecvError("");
    },
    onError: (e: any) => setRecvError(e?.response?.data?.error ?? "Failed to record receipt"),
  });

  if (!data) return <div>Loading...</div>;
  const { supplier, cylinders_on_hold, receipts, payments } = data;
  const payableBalance = Number(supplier.current_payable_balance);
  const receiptsWithDue = receipts.filter((r: any) => Number(r.due_amount) > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <Link to="/suppliers" className="text-sm text-brand-600 dark:text-brand-400">← Back to suppliers</Link>
        {isAdmin && (
          <button
            className="text-red-600 dark:text-red-400 text-sm"
            onClick={() => { if (confirm(`Delete supplier "${supplier.name}"? This can't be undone.`)) remove.mutate(); }}
          >
            Delete supplier
          </button>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{supplier.name}</h1>
          <div className="text-sm text-gray-500 dark:text-slate-400">{supplier.phone} · {supplier.address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">Payable balance</div>
          <div className={`num text-xl font-display font-semibold ${payableBalance > 0 ? "text-red-600 dark:text-red-400" : payableBalance < 0 ? "text-green-700 dark:text-green-400" : ""}`}>
            {currency(payableBalance)}
          </div>
          {payableBalance < 0 && <div className="text-xs text-gray-400 dark:text-slate-500">Prepaid credit</div>}
        </div>
      </div>

      {receiptsWithDue.length > 0 && (
        <div className="card border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/[0.06]">
          <div className="font-medium mb-2 text-red-800 dark:text-red-300">Why the payable balance is what it is</div>
          <div className="space-y-3">
            {receiptsWithDue.map((r: any) => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-lg border border-red-100 dark:border-red-500/20 p-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400 text-xs mb-1">
                  <span>{new Date(r.date).toLocaleDateString()} · recorded by {r.user?.name ?? "—"}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">Due from this receipt: {currency(r.due_amount)}</span>
                </div>
                <div className="text-gray-700 dark:text-slate-300">
                  {r.refill_quantity > 0 && `${r.refill_quantity} refilled`}
                  {r.refill_quantity > 0 && r.new_quantity > 0 && " + "}
                  {r.new_quantity > 0 && `${r.new_quantity} new`}
                  {" "}{r.product.category} ({r.product.size_variant}) — total {currency(r.total_amount)}, paid then {currency(r.paid_now_amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="font-medium mb-3">Record payment (advance or installment)</div>
        {payError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mb-3">{payError}</div>}
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="label">Amount</label>
            <input className="input w-36" type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={payType} onChange={(e) => setPayType(e.target.value as any)}>
              <option value="INSTALLMENT">Installment (against due)</option>
              <option value="ADVANCE">Advance (ahead of a receipt)</option>
            </select>
          </div>
          <div>
            <label className="label">From account</label>
            <select className="input" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
              <option value="">Select...</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="label">Note (optional)</label>
            <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={!payAmount || Number(payAmount) <= 0 || !payAccount || recordPayment.isPending} onClick={() => recordPayment.mutate()}>
            {recordPayment.isPending ? "Recording..." : "Record payment"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Cylinders currently on hold at this supplier</div>
        {cylinders_on_hold.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">None — nothing sent for refill right now.</div>}
        <ul className="text-sm space-y-1">
          {cylinders_on_hold.map((h: any) => (
            <li key={h.id}>{h.product.category} — {h.product.size_variant}: {h.quantity_with_supplier}</li>
          ))}
        </ul>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-medium text-sm">Send empty cylinders for refill</div>
          {sendError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{sendError}</div>}
          <select className="input" value={sendProduct} onChange={(e) => setSendProduct(e.target.value)}>
            <option value="">Select product...</option>
            {(products ?? []).filter((p: any) => p.is_returnable).map((p: any) => (
              <option key={p.id} value={p.id}>{p.category} — {p.size_variant}</option>
            ))}
          </select>
          <input className="input" type="number" min={1} placeholder="Quantity sent" value={sendQty} onChange={(e) => setSendQty(e.target.value === "" ? "" : Number(e.target.value))} />
          <input className="input" placeholder="Note (optional)" value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          <button className="btn-primary w-full" disabled={!sendProduct || !sendQty || sendCylinders.isPending} onClick={() => sendCylinders.mutate()}>
            {sendCylinders.isPending ? "Recording..." : "Send to supplier"}
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500">Deducts stock now (the cylinders leave the premises empty) and adds to "on hold" above.</p>
        </div>

        <div className="card space-y-2">
          <div className="font-medium text-sm">Receive from supplier</div>
          {recvError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{recvError}</div>}
          <select className="input" value={recvProduct} onChange={(e) => setRecvProduct(e.target.value)}>
            <option value="">Select product...</option>
            {(products ?? []).filter((p: any) => p.is_returnable).map((p: any) => (
              <option key={p.id} value={p.id}>{p.category} — {p.size_variant}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min={0} placeholder="Refilled qty" value={recvRefillQty} onChange={(e) => setRecvRefillQty(e.target.value === "" ? "" : Number(e.target.value))} />
            <input className="input" type="number" min={0} placeholder="New qty" value={recvNewQty} onChange={(e) => setRecvNewQty(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <input className="input" type="number" min={0} placeholder="Total amount charged" value={recvTotal} onChange={(e) => setRecvTotal(e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min={0} max={recvTotalNum} placeholder="Paid now" value={recvPaidNow} onChange={(e) => setRecvPaidNow(e.target.value === "" ? "" : Math.min(recvTotalNum, Number(e.target.value)))} />
            <select className="input" value={recvAccount} onChange={(e) => setRecvAccount(e.target.value)} disabled={recvPaidNowNum === 0}>
              <option value="">Paid from...</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Due (added to payable): {currency(recvDue)}</div>
          <input className="input" placeholder="Note (optional)" value={recvNote} onChange={(e) => setRecvNote(e.target.value)} />
          <button
            className="btn-primary w-full"
            disabled={!recvProduct || (!recvRefillQty && !recvNewQty) || !recvTotal || (recvPaidNowNum > 0 && !recvAccount) || receiveFromSupplier.isPending}
            onClick={() => receiveFromSupplier.mutate()}
          >
            {receiveFromSupplier.isPending ? "Recording..." : "Record receipt"}
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500">Both refilled and new cylinders add to stock; only the refilled portion clears "on hold" above.</p>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Receipt history</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Refilled</th><th>New</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
          <tbody>
            {receipts.map((r: any) => (
              <tr key={r.id}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.refill_quantity || "—"}</td>
                <td>{r.new_quantity || "—"}</td>
                <td>{currency(r.total_amount)}</td>
                <td>{currency(r.paid_now_amount)}</td>
                <td className={Number(r.due_amount) > 0 ? "text-red-600 dark:text-red-400" : ""}>{currency(r.due_amount)}</td>
              </tr>
            ))}
            {receipts.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 dark:text-slate-500 py-4">No receipts yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Payment history</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Account</th><th>Recorded by</th></tr></thead>
          <tbody>
            {payments.map((p: any) => (
              <tr key={p.id}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td>{p.type === "ADVANCE" ? "Advance" : "Installment"}</td>
                <td className="text-green-700 dark:text-green-400 font-medium">{currency(p.amount)}</td>
                <td>{p.paid_from_account?.name ?? "—"}</td>
                <td>{p.user?.name ?? "—"}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 dark:text-slate-500 py-4">No payments recorded yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
