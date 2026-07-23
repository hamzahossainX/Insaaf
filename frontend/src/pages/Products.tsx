import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";

export default function Products() {
  const { isAdmin, user } = useAuth();
  const { t, formatCurrency, errorMessage } = useI18n();
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
    onError: (error) => setDeleteError(errorMessage(error, "products.deleteError")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("products.title")}</h1>
        {isAdmin && <button className="btn-primary" onClick={() => setShowNewProduct(!showNewProduct)}>{t("products.new")}</button>}
      </div>

      {showNewProduct && <NewProductForm onDone={() => { setShowNewProduct(false); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
      {deleteError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{deleteError}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t("common.type")}</th><th>{t("common.category")}</th><th>{t("products.size")}</th><th>{t("products.cost")}</th><th>{t("products.salePrice")}</th>
              <th>{t("products.stockOnHand")}</th><th>{t("products.dueBack")}</th><th><span className="sr-only">{t("common.actions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className={p.current_stock_qty <= p.reorder_level ? "bg-amber-50 dark:bg-amber-500/10" : ""}>
                <td>
                  {p.is_returnable ? (
                    <span className="text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{t("products.cylinder")}</span>
                  ) : (
                    <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">{t("products.otherItem")}</span>
                  )}
                </td>
                <td>{p.category}</td>
                <td>{p.size_variant}</td>
                <td>{formatCurrency(p.unit_cost_price)}</td>
                <td>{formatCurrency(p.unit_sale_price)}</td>
                <td className={p.current_stock_qty <= p.reorder_level ? "text-amber-700 dark:text-amber-400 font-medium" : ""}>
                  {p.current_stock_qty} {p.current_stock_qty <= p.reorder_level && `⚠ ${t("products.low")}`}
                </td>
                <td className={p.cylinders_due_back > 0 ? "text-blue-700 dark:text-blue-300 font-medium" : "text-gray-400 dark:text-slate-500"}>
                  {p.is_returnable ? (p.cylinders_due_back > 0 ? t("products.expectedBack", { count: p.cylinders_due_back }) : "—") : <span className="text-gray-300 dark:text-slate-600">{t("common.notAvailable")}</span>}
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button className="icon-btn" title={t("products.stockIn")} onClick={() => setStockInFor(p.id)}>
                      <PackagePlus size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        className="icon-btn-danger"
                        title={t("products.delete")}
                        onClick={() => {
                          if (confirm(t("products.deleteConfirm", { product: `${p.category} — ${p.size_variant}` }))) remove.mutate(p.id);
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
        {t("products.explanation")}
      </p>

      {stockInFor && (
        <div className="card max-w-sm space-y-3">
          <div className="font-medium">{t("products.stockInTitle")}</div>
          <input className="input" type="number" min={1} placeholder={t("common.quantity")} value={stockQty} onChange={(e) => setStockQty(e.target.value === "" ? "" : Number(e.target.value))} />
          <div className="flex gap-2">
            <button className="btn-primary" disabled={!stockQty} onClick={() => doStockIn.mutate()}>{t("common.confirm")}</button>
            <button className="btn-secondary" onClick={() => setStockInFor(null)}>{t("common.cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const oxygenWing = (wings ?? []).find((w: any) => w.name === "INSAAF_OXYGEN");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");
  const [opening, setOpening] = useState<number | "">("");
  const [isReturnable, setIsReturnable] = useState(true);
  const [note, setNote] = useState("");

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
        note: note || undefined,
      }),
    onSuccess: onDone,
  });

  return (
    <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      <div><label className="label">{t("common.category")}</label><input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("products.categoryPlaceholder")} /></div>
      <div><label className="label">{t("products.sizeVariant")}</label><input className="input" value={size} onChange={(e) => setSize(e.target.value)} placeholder={t("products.sizePlaceholder")} /></div>
      <div><label className="label">{t("products.costPrice")}</label><input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div><label className="label">{t("products.salePrice")}</label><input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div><label className="label">{t("products.openingStock")}</label><input className="input" type="number" value={opening} onChange={(e) => setOpening(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div className="sm:col-span-2 lg:col-span-5"><label className="label">{t("common.noteOptional")}</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <label className="sm:col-span-2 lg:col-span-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isReturnable} onChange={(e) => setIsReturnable(e.target.checked)} />
        {t("products.returnable")}
      </label>
      <button className="btn-primary sm:col-span-2 lg:col-span-5" disabled={!category || !size} onClick={() => create.mutate()}>{t("products.create")}</button>
    </div>
  );
}
