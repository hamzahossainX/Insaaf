import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";
import CustomerAutocomplete from "../components/CustomerAutocomplete";

type SaleType = "GAS_ONLY" | "GAS_PLUS_CYLINDER" | "CYLINDER_EXCHANGE" | "OTHER_ITEM";

interface LineItem {
  product_id: string;
  quantity: number | "";
  unit_price: number | "";
}

export default function NewSale() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products", user?.wing_id],
    queryFn: () => api.get("/products", { params: { wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const { data: employees } = useQuery({
    queryKey: ["employees", user?.wing_id],
    queryFn: () => api.get("/payroll/employees", { params: { wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });

  const [customerId, setCustomerId] = useState("");
  const [saleType, setSaleType] = useState<SaleType>("GAS_ONLY");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [paidNow, setPaidNow] = useState<number | "">("");
  const [paidIntoAccount, setPaidIntoAccount] = useState("");
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState("");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // OTHER_ITEM (e.g. a stove) picks from non-returnable catalog products, exactly like the
  // gas sale types pick from returnable cylinder products — same dropdown UX, different list.
  const availableProducts = useMemo(
    () => (products ?? []).filter((p: any) => (saleType === "OTHER_ITEM" ? !p.is_returnable : p.is_returnable)),
    [products, saleType]
  );

  const total = useMemo(() => lineItems.reduce((s, li) => s + Number(li.quantity || 0) * Number(li.unit_price || 0), 0), [lineItems]);
  const paidNowNum = Number(paidNow || 0);
  const due = Math.max(0, round2(total - paidNowNum));

  const createSale = useMutation({
    mutationFn: () =>
      api.post("/sales", {
        wing_id: user?.wing_id ?? products?.[0]?.wing_id,
        customer_id: customerId,
        sale_type: saleType,
        line_items: lineItems.map((li) => ({
          product_id: li.product_id,
          quantity: Number(li.quantity || 0),
          unit_price: Number(li.unit_price || 0),
        })),
        paid_now_amount: round2(paidNowNum),
        paid_into_account_id: paidNowNum > 0 ? paidIntoAccount : undefined,
        due_amount: due,
        delivery_employee_id: deliveryEmployeeId || undefined,
        note: note || undefined,
      }),
    onSuccess: () => {
      setSuccess("Sale recorded.");
      setError("");
      setLineItems([]);
      setPaidNow("");
      setDeliveryEmployeeId("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: any) => {
      setError(e?.response?.data?.error ?? "Failed to record sale");
      setSuccess("");
    },
  });

  function changeSaleType(t: SaleType) {
    setSaleType(t);
    setLineItems([]); // the product list differs (cylinders vs. other items), so start fresh
  }

  function addLine() {
    if (!availableProducts.length) return;
    const p = availableProducts[0];
    setLineItems([...lineItems, { product_id: p.id, quantity: 1, unit_price: Number(p.unit_sale_price) }]);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLineItems(lineItems.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  }

  function removeLine(idx: number) {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  }

  function onProductChange(idx: number, productId: string) {
    const p = availableProducts.find((pp: any) => pp.id === productId);
    updateLine(idx, { product_id: productId, unit_price: p ? Number(p.unit_sale_price) : "" });
  }

  const canSubmit =
    customerId &&
    lineItems.length > 0 &&
    lineItems.every((li) => Number(li.quantity || 0) > 0 && !!li.product_id) &&
    (paidNowNum === 0 || paidIntoAccount);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">New Sale</h1>

      {success && <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg px-3 py-2">{success}</div>}
      {error && <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{error}</div>}

      <div className="card space-y-4">
        <div>
          <label className="label">Customer</label>
          <CustomerAutocomplete value={customerId} onChange={(id) => setCustomerId(id)} />
        </div>

        <div>
          <label className="label">Sale type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["GAS_ONLY", "GAS_PLUS_CYLINDER", "CYLINDER_EXCHANGE", "OTHER_ITEM"] as SaleType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`btn ${saleType === t ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"}`}
                onClick={() => changeSaleType(t)}
              >
                {label(t)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">{explain(saleType)}</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="label mb-0">Line items</label>
            <button type="button" className="btn-secondary" onClick={addLine} disabled={availableProducts.length === 0}>+ Add item</button>
          </div>
          {saleType === "OTHER_ITEM" && availableProducts.length === 0 && (
            <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 mb-2">
              No non-cylinder products yet. Add one from the Products page first — uncheck "Returnable cylinder?" when creating it (e.g. a stove).
            </div>
          )}
          <div className="space-y-3 sm:space-y-2">
            {lineItems.map((li, idx) => (
              <div key={idx} className="flex flex-wrap sm:grid sm:grid-cols-12 gap-2 items-center pb-2 sm:pb-0 border-b sm:border-0 border-gray-100 dark:border-slate-700/60">
                <select
                  className="input w-full sm:col-span-5"
                  value={li.product_id}
                  onChange={(e) => onProductChange(idx, e.target.value)}
                >
                  {availableProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.category} — {p.size_variant}</option>
                  ))}
                </select>
                <input
                  className="input flex-1 min-w-[4.5rem] sm:col-span-2"
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateLine(idx, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                />
                <input
                  className="input flex-1 min-w-[5.5rem] sm:col-span-3"
                  type="number"
                  min={0}
                  value={li.unit_price}
                  onChange={(e) => updateLine(idx, { unit_price: e.target.value === "" ? "" : Number(e.target.value) })}
                />
                <div className="sm:col-span-1 text-sm text-right w-20 sm:w-auto">{currency(Number(li.quantity || 0) * Number(li.unit_price || 0))}</div>
                <button type="button" className="sm:col-span-1 text-red-600 dark:text-red-400 text-sm px-1" onClick={() => removeLine(idx)}>✕</button>
              </div>
            ))}
            {lineItems.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No items added yet.</div>}
          </div>
        </div>

        <div className="flex justify-between border-t border-gray-200 dark:border-slate-700 pt-3">
          <span className="font-medium">Total</span>
          <span className="font-semibold text-lg">{currency(total)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Paid now</label>
            <input
              className="input"
              type="number"
              min={0}
              max={total}
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value === "" ? "" : Math.min(total, Number(e.target.value)))}
            />
          </div>
          <div>
            <label className="label">Into account</label>
            <select className="input" value={paidIntoAccount} onChange={(e) => setPaidIntoAccount(e.target.value)} disabled={paidNowNum === 0}>
              <option value="">Select account...</option>
              {(accounts ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Delivery man (optional)</label>
          <select className="input" value={deliveryEmployeeId} onChange={(e) => setDeliveryEmployeeId(e.target.value)}>
            <option value="">Not assigned</option>
            {(employees ?? []).map((e: any) => (
              <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra context for this sale..." />
        </div>

        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-300">
          <span>Due</span>
          <span className="font-medium">{currency(due)}</span>
        </div>

        <button
          className="btn-primary w-full"
          disabled={!canSubmit || createSale.isPending}
          onClick={() => createSale.mutate()}
        >
          {createSale.isPending ? "Submitting..." : "Complete sale"}
        </button>
      </div>
    </div>
  );
}

function label(t: SaleType) {
  if (t === "GAS_ONLY") return "Gas only";
  if (t === "GAS_PLUS_CYLINDER") return "Gas + Cylinder";
  if (t === "CYLINDER_EXCHANGE") return "Cylinder Exchange";
  return "Other Item";
}

function explain(t: SaleType) {
  if (t === "GAS_ONLY") return "Cylinder leaves the premises on loan — stock is deducted now and comes back when the customer returns the cylinder.";
  if (t === "GAS_PLUS_CYLINDER") return "Cylinder is sold outright — stock is permanently deducted; no loan is created.";
  if (t === "CYLINDER_EXCHANGE") return "Cylinder changes hands as part of an exchange — stock is permanently deducted; no loan is created.";
  return "Non-cylinder products from the catalog (e.g. a stove) — picked the same way as gas. Stock is permanently deducted; it never comes back.";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
