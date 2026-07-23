import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import CustomerAutocomplete from "../components/CustomerAutocomplete";
import { useI18n } from "../lib/i18n";

export default function CylinderReturns() {
  const qc = useQueryClient();
  const { t, formatCurrency, formatDate, errorMessage } = useI18n();
  const [customerId, setCustomerId] = useState("");
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number | "">>({});
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ type: "success" } | { type: "error"; error: unknown } | null>(null);

  const { data: allLoans } = useQuery({
    queryKey: ["all-loans"],
    queryFn: () => api.get("/cylinders/loans").then((r) => r.data),
  });

  const { data: loans } = useQuery({
    queryKey: ["loans", customerId],
    queryFn: () => api.get(`/cylinders/loans/${customerId}`).then((r) => r.data),
    enabled: !!customerId,
  });

  const submitReturn = useMutation({
    mutationFn: (payload: { product_id: string; quantity_returned: number }) =>
      api.post("/cylinders/returns", { customer_id: customerId, note: note || undefined, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans", customerId] });
      qc.invalidateQueries({ queryKey: ["all-loans"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setResult({ type: "success" });
      setNote("");
    },
    onError: (error) => setResult({ type: "error", error }),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("returns.title")}</h1>

      {/* Overview: every cylinder currently out with a customer, expected back */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">{t("returns.dueBack")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t("common.customer")}</th><th>{t("common.product")}</th><th>{t("returns.dateIssued")}</th>
              <th>{t("returns.taken")}</th><th>{t("returns.returnedSoFar")}</th><th>{t("returns.stillOnLoan")}</th><th>{t("returns.paymentStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {(allLoans ?? []).map((l: any) => (
              <tr key={l.id}>
                <td>{l.customer.name} <span className="text-gray-400 dark:text-slate-500">· {l.customer.phone}</span></td>
                <td>{l.product.category} — {l.product.size_variant}</td>
                <td>{formatDate(l.date_issued)}</td>
                <td>{l.quantity_originally_taken}</td>
                <td>{l.quantity_returned_so_far}</td>
                <td className="font-medium text-blue-700 dark:text-blue-300">{l.quantity_on_loan}</td>
                <td>
                  {Number(l.customer.current_due_balance) > 0 ? (
                    <span className="text-red-600 dark:text-red-400">{t("common.due")} {formatCurrency(l.customer.current_due_balance)}</span>
                  ) : (
                    <span className="text-green-700 dark:text-green-400">{t("common.paid")}</span>
                  )}
                </td>
              </tr>
            ))}
            {(allLoans ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("returns.noLoansAll")}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {result && (
        <div className={`text-sm rounded-lg border px-3 py-2 ${result.type === "success" ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30" : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30"}`}>
          {result.type === "success" ? t("returns.success") : errorMessage(result.error, "returns.error")}
        </div>
      )}

      <div className="card space-y-4">
        <div className="font-medium">{t("returns.recordReturn")}</div>
        <div>
          <label className="label">{t("common.customer")}</label>
          <CustomerAutocomplete value={customerId} onChange={(id) => { setCustomerId(id); setResult(null); }} />
        </div>

        {customerId && (
          <div>
            <div className="label">{t("customers.cylindersOnLoan")}</div>
            {(loans ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("returns.noLoansCustomer")}</div>}
            <div className="mb-3">
              <label className="label">{t("common.noteOptional")}</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("returns.notePlaceholder")} />
            </div>
            <div className="space-y-2">
              {(loans ?? []).map((loan: any) => (
                <div key={loan.id} className="flex flex-wrap sm:grid sm:grid-cols-12 gap-2 items-center border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  <div className="w-full sm:w-auto sm:col-span-5 text-sm">{loan.product.category} — {loan.product.size_variant}</div>
                  <div className="sm:col-span-3 text-sm text-gray-500 dark:text-slate-400">{t("returns.onLoan", { count: loan.quantity_on_loan })}</div>
                  <input
                    className="input flex-1 min-w-[4.5rem] sm:col-span-2"
                    type="number"
                    min={1}
                    max={loan.quantity_on_loan}
                    placeholder={t("returns.qtyPlaceholder")}
                    value={qtyByProduct[loan.product_id] ?? ""}
                    onChange={(e) =>
                      setQtyByProduct({ ...qtyByProduct, [loan.product_id]: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                  />
                  <button
                    className="btn-primary sm:col-span-2"
                    disabled={!qtyByProduct[loan.product_id]}
                    onClick={() =>
                      submitReturn.mutate({ product_id: loan.product_id, quantity_returned: Number(qtyByProduct[loan.product_id]) })
                    }
                  >
                    {t("returns.return")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
