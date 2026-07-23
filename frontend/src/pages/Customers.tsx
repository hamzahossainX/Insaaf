import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function CustomersRoutes() {
  return (
    <Routes>
      <Route index element={<CustomerList />} />
      <Route path=":id" element={<CustomerProfile />} />
    </Routes>
  );
}

function CustomerList() {
  const { isAdmin } = useAuth();
  const { t, formatCurrency, errorMessage } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [hasDueOnly, setHasDueOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { data: customers, refetch } = useQuery({
    queryKey: ["customers", search, hasDueOnly],
    queryFn: () => api.get("/customers", { params: { search: search || undefined, has_due: hasDueOnly || undefined } }).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (error) => alert(errorMessage(error, "customers.deleteError")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("customers.title")}</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{t("customers.new")}</button>
      </div>

      {showForm && <NewCustomerForm onDone={() => { setShowForm(false); refetch(); }} />}

      <div className="flex gap-3">
        <input className="input max-w-xs" placeholder={t("customers.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasDueOnly} onChange={(e) => setHasDueOnly(e.target.checked)} />
          {t("customers.hasDueOnly")}
        </label>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr><th>{t("common.name")}</th><th>{t("common.phone")}</th><th>{t("customers.dueBalance")}</th><th><span className="sr-only">{t("common.actions")}</span></th></tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c: any) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td className={Number(c.current_due_balance) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{formatCurrency(c.current_due_balance)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link className="icon-btn" to={`/customers/${c.id}`} title={t("customers.viewProfile")}>
                      <Eye size={16} />
                    </Link>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title={t("customers.delete")}
                        onClick={() => {
                          if (confirm(t("customers.deleteConfirm", { name: c.name }))) remove.mutate(c.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
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

function NewCustomerForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () => api.post("/customers", { name, phone, address, notes: notes || undefined }),
    onSuccess: onDone,
  });
  return (
    <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input className="input" placeholder={t("common.name")} value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder={t("common.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" placeholder={t("common.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
      <input className="input sm:col-span-3" placeholder={t("common.noteOptional")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn-primary sm:col-span-3" disabled={!name || !phone} onClick={() => create.mutate()}>{t("customers.save")}</button>
    </div>
  );
}

function CustomerProfile() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { t, formatCurrency, formatDate, errorMessage, enumLabel } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["customer", id], queryFn: () => api.get(`/customers/${id}`).then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payAccount, setPayAccount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  const recordPayment = useMutation({
    mutationFn: () => api.post("/customers/due-payments", { customer_id: id, amount: Number(payAmount || 0), received_into_account_id: payAccount, note: payNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setPayAmount("");
      setPayNote("");
      setPayError("");
    },
    onError: (error) => setPayError(errorMessage(error, "customers.paymentError")),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/customers/${id}`),
    onSuccess: () => navigate("/customers"),
    onError: (error) => alert(errorMessage(error, "customers.deleteError")),
  });

  if (!data) return <div>{t("common.loading")}</div>;
  const { customer, cylinders_on_loan, sales, due_payments } = data;
  const dueBalance = Number(customer.current_due_balance);

  // Sales that contributed to (or still carry) a due amount — this is the "why is there a due" trail.
  const salesWithDue = sales.filter((s: any) => Number(s.due_amount) > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <Link to="/customers" className="text-sm text-brand-600 dark:text-brand-400">{t("customers.back")}</Link>
        {isAdmin && (
          <button
            className="text-red-600 dark:text-red-400 text-sm"
            onClick={() => {
              if (confirm(t("customers.deleteConfirm", { name: customer.name }))) remove.mutate();
            }}
          >
            {t("customers.delete")}
          </button>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{customer.name}</h1>
          <div className="text-sm text-gray-500 dark:text-slate-400">{customer.phone} · {customer.address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">{t("customers.dueBalance")}</div>
          <div className={`num text-xl font-display font-semibold ${dueBalance > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
            {formatCurrency(customer.current_due_balance)}
          </div>
        </div>
      </div>

      {/* WHY is there a due — itemized trail of every sale that left a balance owing */}
      {salesWithDue.length > 0 && (
        <div className="card border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10">
          <div className="font-medium mb-2 text-red-800 dark:text-red-300">{t("customers.whyOwes")}</div>
          <div className="space-y-3">
            {salesWithDue.map((s: any) => (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-lg border border-red-100 dark:border-red-500/20 p-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400 text-xs mb-1">
                  <span>{formatDate(s.date)} · {t("customers.soldBy", { name: s.user?.name ?? "—" })} · {enumLabel(s.sale_type)}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{t("customers.dueFromSale", { amount: formatCurrency(s.due_amount) })}</span>
                </div>
                <ul className="pl-4 list-disc text-gray-700 dark:text-slate-300">
                  {s.line_items.map((li: any) => (
                    <li key={li.id}>
                      {li.quantity} × {itemLabel(li, t("common.item"))} @ {formatCurrency(li.unit_price)} = {formatCurrency(li.subtotal)}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                  <span>{t("customers.saleTotal", { amount: formatCurrency(s.total_amount) })}</span>
                  <span>{t("customers.paidThen", { amount: formatCurrency(s.paid_now_amount) })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Always visible so it's easy to find — record money coming back from the customer */}
      <div className="card">
        <div className="font-medium mb-3">{t("customers.receiveDue")}</div>
        {payError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mb-3">{payError}</div>}
        {dueBalance === 0 ? (
          <div className="text-sm text-gray-400 dark:text-slate-500">{t("customers.noDue")}</div>
        ) : (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">{t("customers.amountReceived")}</label>
              <input
                className="input w-36"
                type="number"
                min={0}
                max={dueBalance}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">{t("customers.intoAccount")}</label>
              <select className="input" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
                <option value="">{t("common.select")}</option>
                {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t("common.noteOptional")}</label>
              <input className="input" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder={t("customers.paymentNotePlaceholder")} />
            </div>
            <button
              className="btn-primary"
              disabled={!payAmount || Number(payAmount) <= 0 || !payAccount || recordPayment.isPending}
              onClick={() => recordPayment.mutate()}
            >
              {recordPayment.isPending ? t("common.recording") : t("customers.recordPayment")}
            </button>
            <span className="text-xs text-gray-400 dark:text-slate-500">{t("customers.paymentHelp")}</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("customers.cylindersOnLoan")}</div>
        {cylinders_on_loan.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("common.none")}</div>}
        <ul className="text-sm space-y-1">
          {cylinders_on_loan.map((l: any) => (
            <li key={l.id}>{l.product.category} — {l.product.size_variant}: {l.quantity_on_loan}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("customers.fullSalesHistory")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.type")}</th><th>{t("common.items")}</th><th>{t("common.total")}</th><th>{t("common.paid")}</th><th>{t("common.due")}</th></tr></thead>
          <tbody>
            {sales.map((s: any) => (
              <tr key={s.id}>
                <td>{formatDate(s.date)}</td>
                <td>{enumLabel(s.sale_type)}</td>
                <td className="text-gray-600 dark:text-slate-300">
                  {s.line_items.map((li: any) => `${li.quantity}× ${itemLabel(li, t("common.item"))}`).join(", ")}
                </td>
                <td>{formatCurrency(s.total_amount)}</td>
                <td>{formatCurrency(s.paid_now_amount)}</td>
                <td className={Number(s.due_amount) > 0 ? "text-red-600 dark:text-red-400" : ""}>{formatCurrency(s.due_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("customers.duePaymentHistory")}</div>
        {due_payments.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("customers.noPayments")}</div>}
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.amount")}</th><th>{t("customers.receivedInto")}</th><th>{t("common.recordedBy")}</th><th>{t("common.note")}</th></tr></thead>
          <tbody>
            {due_payments.map((p: any) => (
              <tr key={p.id}>
                <td>{formatDate(p.date)}</td>
                <td className="text-green-700 dark:text-green-400 font-medium">{formatCurrency(p.amount)}</td>
                <td>{p.received_into_account?.name ?? "—"}</td>
                <td>{p.user?.name ?? "—"}</td>
                <td className="text-gray-500 dark:text-slate-400">{p.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

/** OTHER_ITEM lines have no `product` (null) — fall back to the free-text item name. */
function itemLabel(li: any, fallback: string): string {
  if (li.product) return `${li.product.category} (${li.product.size_variant})`;
  return li.custom_item_name ?? fallback;
}
