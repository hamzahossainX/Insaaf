import { useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2, Users } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

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
    onError: (e: any) => alert(e?.response?.data?.error ?? "Could not delete this customer"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center page-header">
        <div className="flex items-center gap-3">
          <div className="page-header-icon"><Users size={20} /></div>
          <h1 className="text-2xl font-semibold">Customers</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New customer</button>
      </div>

      {showForm && <NewCustomerForm onDone={() => { setShowForm(false); refetch(); }} />}

      <div className="flex gap-3">
        <input className="input max-w-xs" placeholder="Search name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasDueOnly} onChange={(e) => setHasDueOnly(e.target.checked)} />
          Has due only
        </label>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Due balance</th><th></th></tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c: any) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td className={Number(c.current_due_balance) > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{currency(c.current_due_balance)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link className="icon-btn" to={`/customers/${c.id}`} title="View profile">
                      <Eye size={16} />
                    </Link>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title="Delete customer"
                        onClick={() => {
                          if (confirm(`Delete customer "${c.name}"? This can't be undone.`)) remove.mutate(c.id);
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const create = useMutation({
    mutationFn: () => api.post("/customers", { name, phone, address }),
    onSuccess: onDone,
  });
  return (
    <div className="card grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <button className="btn-primary sm:col-span-3" disabled={!name || !phone} onClick={() => create.mutate()}>Save customer</button>
    </div>
  );
}

function CustomerProfile() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["customer", id], queryFn: () => api.get(`/customers/${id}`).then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payAccount, setPayAccount] = useState("");
  const [payError, setPayError] = useState("");

  const recordPayment = useMutation({
    mutationFn: () => api.post("/customers/due-payments", { customer_id: id, amount: Number(payAmount || 0), received_into_account_id: payAccount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setPayAmount("");
      setPayError("");
    },
    onError: (e: any) => setPayError(e?.response?.data?.error ?? "Failed to record payment"),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/customers/${id}`),
    onSuccess: () => navigate("/customers"),
    onError: (e: any) => alert(e?.response?.data?.error ?? "Could not delete this customer"),
  });

  if (!data) return <div>Loading...</div>;
  const { customer, cylinders_on_loan, sales, due_payments } = data;
  const dueBalance = Number(customer.current_due_balance);

  // Sales that contributed to (or still carry) a due amount — this is the "why is there a due" trail.
  const salesWithDue = sales.filter((s: any) => Number(s.due_amount) > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <Link to="/customers" className="text-sm text-brand-600 dark:text-brand-400">← Back to customers</Link>
        {isAdmin && (
          <button
            className="text-red-600 dark:text-red-400 text-sm"
            onClick={() => {
              if (confirm(`Delete customer "${customer.name}"? This can't be undone.`)) remove.mutate();
            }}
          >
            Delete customer
          </button>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <div className="text-sm text-gray-500 dark:text-slate-400">{customer.phone} · {customer.address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-slate-400">Due balance</div>
          <div className={`text-xl font-semibold ${dueBalance > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
            {currency(customer.current_due_balance)}
          </div>
        </div>
      </div>

      {/* WHY is there a due — itemized trail of every sale that left a balance owing */}
      {salesWithDue.length > 0 && (
        <div className="card border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10">
          <div className="font-medium mb-2 text-red-800 dark:text-red-300">Why this customer owes money</div>
          <div className="space-y-3">
            {salesWithDue.map((s: any) => (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-lg border border-red-100 dark:border-red-500/20 p-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-slate-400 text-xs mb-1">
                  <span>{new Date(s.date).toLocaleDateString()} · sold by {s.user?.name ?? "—"} · {s.sale_type.replaceAll("_", " ")}</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">Due from this sale: {currency(s.due_amount)}</span>
                </div>
                <ul className="pl-4 list-disc text-gray-700 dark:text-slate-300">
                  {s.line_items.map((li: any) => (
                    <li key={li.id}>
                      {li.quantity} × {itemLabel(li)} @ {currency(li.unit_price)} = {currency(li.subtotal)}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
                  <span>Total: {currency(s.total_amount)}</span>
                  <span>Paid then: {currency(s.paid_now_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Always visible so it's easy to find — record money coming back from the customer */}
      <div className="card">
        <div className="font-medium mb-3">Receive due payment</div>
        {payError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2 mb-3">{payError}</div>}
        {dueBalance === 0 ? (
          <div className="text-sm text-gray-400 dark:text-slate-500">No outstanding due for this customer right now.</div>
        ) : (
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">Amount received</label>
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
              <label className="label">Into account</label>
              <select className="input" value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
                <option value="">Select...</option>
                {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <button
              className="btn-primary"
              disabled={!payAmount || Number(payAmount) <= 0 || !payAccount || recordPayment.isPending}
              onClick={() => recordPayment.mutate()}
            >
              {recordPayment.isPending ? "Recording..." : "Record payment"}
            </button>
            <span className="text-xs text-gray-400 dark:text-slate-500">Reduces due, adds to the account balance — same as the shared golden rule.</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="font-medium mb-2">Cylinders on loan</div>
        {cylinders_on_loan.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">None.</div>}
        <ul className="text-sm space-y-1">
          {cylinders_on_loan.map((l: any) => (
            <li key={l.id}>{l.product.category} — {l.product.size_variant}: {l.quantity_on_loan}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Full sales history</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Type</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
          <tbody>
            {sales.map((s: any) => (
              <tr key={s.id}>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td>{s.sale_type.replaceAll("_", " ")}</td>
                <td className="text-gray-600 dark:text-slate-300">
                  {s.line_items.map((li: any) => `${li.quantity}× ${itemLabel(li)}`).join(", ")}
                </td>
                <td>{currency(s.total_amount)}</td>
                <td>{currency(s.paid_now_amount)}</td>
                <td className={Number(s.due_amount) > 0 ? "text-red-600 dark:text-red-400" : ""}>{currency(s.due_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-2">Due payment history</div>
        {due_payments.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No payments recorded yet.</div>}
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Amount</th><th>Received into</th><th>Recorded by</th></tr></thead>
          <tbody>
            {due_payments.map((p: any) => (
              <tr key={p.id}>
                <td>{new Date(p.date).toLocaleDateString()}</td>
                <td className="text-green-700 dark:text-green-400 font-medium">{currency(p.amount)}</td>
                <td>{p.received_into_account?.name ?? "—"}</td>
                <td>{p.user?.name ?? "—"}</td>
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
function itemLabel(li: any): string {
  if (li.product) return `${li.product.category} (${li.product.size_variant})`;
  return li.custom_item_name ?? "Item";
}
