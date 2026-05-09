import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Trash2, Boxes } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

export default function Products() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const { data: products } = useQuery({
    queryKey: ["products", user?.wing_id],
    queryFn: () => api.get("/products", { params: { wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });
  const [stockInFor, setStockInFor] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState<number | "">("");
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const doStockIn = useMutation({
    mutationFn: () => api.post("/products/stock-in", { product_id: stockInFor, quantity: stockQty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setStockInFor(null);
      setStockQty("");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setDeleteError(""); },
    onError: (e: any) => setDeleteError(e?.response?.data?.error ?? "Could not delete this product"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center page-header">
        <div className="flex items-center gap-3">
          <div className="page-header-icon"><Boxes size={20} /></div>
          <h1 className="text-2xl font-semibold">Products & Stock — Oxygen</h1>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setShowNewProduct(!showNewProduct)}>+ New product</button>}
      </div>

      {showNewProduct && <NewProductForm onDone={() => { setShowNewProduct(false); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>Type</th><th>Category</th><th>Size</th><th>Cost</th><th>Sale price</th>
              <th>Stock on hand</th><th>Due back (on loan)</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className={p.current_stock_qty <= p.reorder_level ? "bg-amber-50 dark:bg-amber-500/10" : ""}>
                <td>
                  {p.is_returnable ? (
                    <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Cylinder</span>
                  ) : (
                    <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">Other item</span>
                  )}
                </td>
                <td>{p.category}</td>
                <td>{p.size_variant}</td>
                <td>{currency(p.unit_cost_price)}</td>
                <td>{currency(p.unit_sale_price)}</td>
                <td className={p.current_stock_qty <= p.reorder_level ? "text-amber-700 dark:text-amber-400 font-medium" : ""}>
                  {p.current_stock_qty} {p.current_stock_qty <= p.reorder_level && "⚠ low"}
                </td>
                <td className={p.cylinders_due_back > 0 ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-400 dark:text-slate-500"}>
                  {p.is_returnable ? (p.cylinders_due_back > 0 ? `${p.cylinders_due_back} expected back` : "—") : <span className="text-gray-300 dark:text-slate-600">n/a</span>}
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button className="icon-btn" title="Stock in" onClick={() => setStockInFor(p.id)}>
                      <PackagePlus size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title="Delete product"
                        onClick={() => {
                          if (confirm(`Delete ${p.category} — ${p.size_variant}?`)) remove.mutate(p.id);
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
      <p className="text-xs text-gray-400 dark:text-slate-500">
        "Due back" is how many cylinders of that SKU are currently loaned to customers (Gas-only sales)
        and expected to return via Cylinder Returns — it doesn't count toward stock on hand until returned.
        "Other item" products (like a stove) skip this entirely: once sold, they're permanently gone from stock.
      </p>

      {stockInFor && (
        <div className="card max-w-sm space-y-3">
          <div className="font-medium">Stock In</div>
          <input className="input" type="number" min={1} placeholder="Quantity" value={stockQty} onChange={(e) => setStockQty(e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="flex gap-2">
            <button className="btn-primary" disabled={!stockQty} onClick={() => doStockIn.mutate()}>Confirm</button>
            <button className="btn-secondary" onClick={() => setStockInFor(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const oxygenWing = (wings ?? []).find((w: any) => w.name === "INSAAF_OXYGEN");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [opening, setOpening] = useState<number | "">("");
  const [isReturnable, setIsReturnable] = useState(true);

  const create = useMutation({
    mutationFn: () =>
      api.post("/products", {
        wing_id: user?.wing_id ?? oxygenWing?.id,
        category,
        size_variant: size,
        unit_cost_price: cost,
        unit_sale_price: price,
        opening_stock_qty: opening || 0,
        is_returnable: isReturnable,
      }),
    onSuccess: onDone,
  });

  return (
    <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      <div><label className="label">Category</label><input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Industrial Oxygen, or Stove" /></div>
      <div><label className="label">Size / variant</label><input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="10m3, or Standard" /></div>
      <div><label className="label">Cost price</label><input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div><label className="label">Sale price</label><input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div><label className="label">Opening stock</label><input className="input" type="number" value={opening} onChange={(e) => setOpening(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <label className="sm:col-span-2 lg:col-span-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isReturnable} onChange={(e) => setIsReturnable(e.target.checked)} />
        Returnable cylinder? (uncheck for non-cylinder items like a stove — those show up under "Other Item" on New Sale and never come back to stock once sold)
      </label>
      <button className="btn-primary sm:col-span-2 lg:col-span-5" disabled={!category || !size} onClick={() => create.mutate()}>Create product</button>
    </div>
  );
}
