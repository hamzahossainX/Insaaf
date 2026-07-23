import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

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
  const { t, formatCurrency, errorMessage } = useI18n();
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
    onError: (error) => alert(errorMessage(error, "suppliers.deleteError")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("suppliers.title")}</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{t("suppliers.new")}</button>
      </div>

      {showForm && <NewSupplierForm onDone={() => { setShowForm(false); refetch(); }} />}

      <div className="flex gap-3">
        <input className="input max-w-xs" placeholder={t("suppliers.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasPayableOnly} onChange={(e) => setHasPayableOnly(e.target.checked)} />
          {t("suppliers.hasPayableOnly")}
        </label>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr><th>{t("common.name")}</th><th>{t("common.phone")}</th><th>{t("suppliers.payableBalance")}</th><th><span className="sr-only">{t("common.actions")}</span></th></tr>
          </thead>
          <tbody>
            {(suppliers ?? []).map((s: any) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.phone}</td>
                <td className={Number(s.current_payable_balance) > 0 ? "text-red-600 dark:text-red-400 font-medium" : Number(s.current_payable_balance) < 0 ? "text-green-700 dark:text-green-400 font-medium" : ""}>
                  {formatCurrency(s.current_payable_balance)}
                  {Number(s.current_payable_balance) < 0 && <span className="text-xs text-gray-400 ml-1">({t("common.credit")})</span>}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link className="icon-btn" to={`/suppliers/${s.id}`} title={t("suppliers.viewProfile")}>
                      <Eye size={16} />
                    </Link>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title={t("suppliers.delete")}
                        onClick={() => { if (confirm(t("suppliers.deleteConfirm", { name: s.name }))) remove.mutate(s.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(suppliers ?? []).length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("suppliers.empty")}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function NewSupplierForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
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
      <input className="input" placeholder={t("common.name")} value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder={t("common.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" placeholder={t("common.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
      <input className="input sm:col-span-3" placeholder={t("common.noteOptional")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn-primary sm:col-span-3" disabled={!name || !phone} onClick={() => create.mutate()}>{t("suppliers.save")}</button>
    </div>
  );
}

function SupplierProfile() {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  const { t, formatCurrency, formatDate, formatNumber, errorMessage, enumLabel } = useI18n();
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
    onError: (error) => alert(errorMessage(error, "suppliers.deleteError")),
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
    onError: (error) => setPayError(errorMessage(error, "suppliers.paymentError")),
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
    onError: (error) => setSendError(errorMessage(error, "suppliers.sendError")),
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
    onError: (error) => setRecvError(errorMessage(error, "suppliers.receiptError")),
  });

  if (!data) return <div>{t("common.loading")}</div>;
  const { supplier, cylinders_on_hold, receipts, payments } = data;
  const payableBalance = Number(supplier.current_payable_balance);
  const receiptsWithDue = receipts.filter((r: any) => Number(r.due_amount) > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <Link to="/suppliers" className="text-sm text-brand-600 dark:text-brand-400">{t("suppliers.back")}</Link>
        {isAdmin && (
          <button
            className="text-red-600 dark:text-red-400 text-sm"
            onClick={() => { if (confirm(t("suppliers.deleteConfirm", { name: supplier.name }))) remove.mutate(); }}
          >
            {t("suppliers.delete")}
          </button>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{supplier.name}</h1>
          <div className="text-sm text-gray-500 dark:text-slate-400">{supplier.phone} · {supplier.address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">{t("suppliers.payableBalance")}</div>
          <div className={`num text-xl font-display font-semibold ${payableBalance > 0 ? "text-red-600 dark:text-red-400" : payableBalance < 0 ? "text-green-700 dark:text-green-400" : ""}`}>
            {formatCurrency(payableBalance)}
          </div>
          {payableBalance < 0 && <div className="text-xs text-gray-400 dark:text-slate-500">{t("suppliers.prepaidCredit")}</div>}
        </div>
      </div>

      {receiptsWithDue.length > 0 && (
        <div className="card border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/[0.06]">
          <div className="font-medium mb-2 text-red-800 dark:text-red-300">{t("suppliers.whyPayable")}</div>
          <div className="space-y-3">
            {receiptsWithDue.map((r: any) => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-lg border border-red-100 dark:border-red-500/20 p-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400 text-xs mb-1">
                  <span>{formatDate(r.date)} · {t("suppliers.recordedBy", { name: r.user?.name ?? "—" })}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{t("suppliers.dueFromReceipt", { amount: formatCurrency(r.due_amount) })}</span>
                </div>
                <div className="text-gray-700 dark:text-slate-300">
                  {t("suppliers.receiptTotals", {
                    items: [
                      r.refill_quantity > 0 ? t("suppliers.refilledCount", { count: formatNumber(r.refill_quantity) }) : "",
                      r.new_quantity > 0 ? t("suppliers.newCount", { count: formatNumber(r.new_quantity) }) : ""
                    ].filter(Boolean).join(" + "),
                    product: `${r.product.category} (${r.product.size_variant})`,
                    total: formatCurrency(r.total_amount),
                    paid: formatCurrency(r.paid_now_amount)
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="font-medium mb-3">{t("suppliers.recordPayment")}</div>
        {payError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mb-3">{payError}</div>}
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="label">{t("common.amount")}</label>
            <input className="input w-36" type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t("common.type")}</label>
            <select className="input" value={payType} onChange={(e) => setPayType(e.target.value as any)}>
              <option value="INSTALLMENT">{t("suppliers.installmentDue")}</option>
              <option value="ADVANCE">{t("suppliers.advanceReceipt")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("suppliers.fromAccount")}</label>
            <select className="input" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
              <option value="">{t("common.select")}</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="label">{t("common.noteOptional")}</label>
            <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={!payAmount || Number(payAmount) <= 0 || !payAccount || recordPayment.isPending} onClick={() => recordPayment.mutate()}>
            {recordPayment.isPending ? t("common.recording") : t("customers.recordPayment")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("suppliers.onHold")}</div>
        {cylinders_on_hold.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("suppliers.nothingOnHold")}</div>}
        <ul className="text-sm space-y-1">
          {cylinders_on_hold.map((h: any) => (
            <li key={h.id}>{h.product.category} — {h.product.size_variant}: {h.quantity_with_supplier}</li>
          ))}
        </ul>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-medium text-sm">{t("suppliers.sendForRefill")}</div>
          {sendError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{sendError}</div>}
          <select className="input" value={sendProduct} onChange={(e) => setSendProduct(e.target.value)}>
            <option value="">{t("common.selectProduct")}</option>
            {(products ?? []).filter((p: any) => p.is_returnable).map((p: any) => (
              <option key={p.id} value={p.id}>{p.category} — {p.size_variant}</option>
            ))}
          </select>
          <input className="input" type="number" min={1} placeholder={t("suppliers.quantitySent")} value={sendQty} onChange={(e) => setSendQty(e.target.value === "" ? "" : Number(e.target.value))} />
          <input className="input" placeholder={t("common.noteOptional")} value={sendNote} onChange={(e) => setSendNote(e.target.value)} />
          <button className="btn-primary w-full" disabled={!sendProduct || !sendQty || sendCylinders.isPending} onClick={() => sendCylinders.mutate()}>
            {sendCylinders.isPending ? t("common.recording") : t("suppliers.send")}
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500">{t("suppliers.sendHelp")}</p>
        </div>

        <div className="card space-y-2">
          <div className="font-medium text-sm">{t("suppliers.receive")}</div>
          {recvError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{recvError}</div>}
          <select className="input" value={recvProduct} onChange={(e) => setRecvProduct(e.target.value)}>
            <option value="">{t("common.selectProduct")}</option>
            {(products ?? []).filter((p: any) => p.is_returnable).map((p: any) => (
              <option key={p.id} value={p.id}>{p.category} — {p.size_variant}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min={0} placeholder={t("suppliers.refilledQty")} value={recvRefillQty} onChange={(e) => setRecvRefillQty(e.target.value === "" ? "" : Number(e.target.value))} />
            <input className="input" type="number" min={0} placeholder={t("suppliers.newQty")} value={recvNewQty} onChange={(e) => setRecvNewQty(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <input className="input" type="number" min={0} placeholder={t("suppliers.totalCharged")} value={recvTotal} onChange={(e) => setRecvTotal(e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" type="number" min={0} max={recvTotalNum} placeholder={t("sales.paidNow")} value={recvPaidNow} onChange={(e) => setRecvPaidNow(e.target.value === "" ? "" : Math.min(recvTotalNum, Number(e.target.value)))} />
            <select className="input" value={recvAccount} onChange={(e) => setRecvAccount(e.target.value)} disabled={recvPaidNowNum === 0}>
              <option value="">{t("suppliers.paidFrom")}</option>
              {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">{t("suppliers.dueAdded", { amount: formatCurrency(recvDue) })}</div>
          <input className="input" placeholder={t("common.noteOptional")} value={recvNote} onChange={(e) => setRecvNote(e.target.value)} />
          <button
            className="btn-primary w-full"
            disabled={!recvProduct || (!recvRefillQty && !recvNewQty) || !recvTotal || (recvPaidNowNum > 0 && !recvAccount) || receiveFromSupplier.isPending}
            onClick={() => receiveFromSupplier.mutate()}
          >
            {receiveFromSupplier.isPending ? t("common.recording") : t("suppliers.recordReceipt")}
          </button>
          <p className="text-xs text-gray-400 dark:text-slate-500">{t("suppliers.receiveHelp")}</p>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("suppliers.receiptHistory")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("suppliers.refilled")}</th><th>{t("common.new")}</th><th>{t("common.total")}</th><th>{t("common.paid")}</th><th>{t("common.due")}</th></tr></thead>
          <tbody>
            {receipts.map((r: any) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.refill_quantity || "—"}</td>
                <td>{r.new_quantity || "—"}</td>
                <td>{formatCurrency(r.total_amount)}</td>
                <td>{formatCurrency(r.paid_now_amount)}</td>
                <td className={Number(r.due_amount) > 0 ? "text-red-600 dark:text-red-400" : ""}>{formatCurrency(r.due_amount)}</td>
              </tr>
            ))}
            {receipts.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("suppliers.noReceipts")}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("suppliers.paymentHistory")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.type")}</th><th>{t("common.amount")}</th><th>{t("common.account")}</th><th>{t("common.recordedBy")}</th></tr></thead>
          <tbody>
            {payments.map((p: any) => (
              <tr key={p.id}>
                <td>{formatDate(p.date)}</td>
                <td>{enumLabel(p.type)}</td>
                <td className="text-green-700 dark:text-green-400 font-medium">{formatCurrency(p.amount)}</td>
                <td>{p.paid_from_account?.name ?? "—"}</td>
                <td>{p.user?.name ?? "—"}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("suppliers.noPayments")}</td></tr>}
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
