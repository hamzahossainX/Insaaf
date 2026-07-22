import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
<<<<<<< HEAD
=======
import { PackageOpen } from "lucide-react";
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
import { api, currency } from "../api/client";
import CustomerAutocomplete from "../components/CustomerAutocomplete";

export default function CylinderReturns() {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number | "">>({});
<<<<<<< HEAD
  const [note, setNote] = useState("");
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
  const [message, setMessage] = useState("");

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
<<<<<<< HEAD
      api.post("/cylinders/returns", { customer_id: customerId, note: note || undefined, ...payload }),
=======
      api.post("/cylinders/returns", { customer_id: customerId, ...payload }),
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans", customerId] });
      qc.invalidateQueries({ queryKey: ["all-loans"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setMessage("Return recorded.");
<<<<<<< HEAD
      setNote("");
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
    },
    onError: (e: any) => setMessage(e?.response?.data?.error ?? "Failed to record return"),
  });

  return (
    <div className="max-w-4xl space-y-6">
<<<<<<< HEAD
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Cylinder Returns</h1>
=======
      <div className="page-header">
        <div className="page-header-icon"><PackageOpen size={20} /></div>
        <h1 className="text-2xl font-semibold">Cylinder Returns</h1>
      </div>
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac

      {/* Overview: every cylinder currently out with a customer, expected back */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">Cylinders currently due back</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>Customer</th><th>Product</th><th>Date issued</th>
              <th>Taken</th><th>Returned so far</th><th>Still on loan</th><th>Payment status</th>
            </tr>
          </thead>
          <tbody>
            {(allLoans ?? []).map((l: any) => (
              <tr key={l.id}>
                <td>{l.customer.name} <span className="text-gray-400 dark:text-slate-500">· {l.customer.phone}</span></td>
                <td>{l.product.category} — {l.product.size_variant}</td>
                <td>{new Date(l.date_issued).toLocaleDateString()}</td>
                <td>{l.quantity_originally_taken}</td>
                <td>{l.quantity_returned_so_far}</td>
                <td className="font-medium text-blue-700 dark:text-blue-300">{l.quantity_on_loan}</td>
                <td>
                  {Number(l.customer.current_due_balance) > 0 ? (
                    <span className="text-red-600 dark:text-red-400">Due {currency(l.customer.current_due_balance)}</span>
                  ) : (
                    <span className="text-green-700 dark:text-green-400">Paid</span>
                  )}
                </td>
              </tr>
            ))}
            {(allLoans ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 dark:text-slate-500 py-4">No cylinders currently out on loan.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {message && <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg px-3 py-2">{message}</div>}

      <div className="card space-y-4">
        <div className="font-medium">Record a return</div>
        <div>
          <label className="label">Customer</label>
          <CustomerAutocomplete value={customerId} onChange={(id) => { setCustomerId(id); setMessage(""); }} />
        </div>

        {customerId && (
          <div>
            <div className="label">Cylinders on loan</div>
            {(loans ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No cylinders currently on loan.</div>}
<<<<<<< HEAD
            <div className="mb-3">
              <label className="label">Note (optional)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra context for this return..." />
            </div>
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            <div className="space-y-2">
              {(loans ?? []).map((loan: any) => (
                <div key={loan.id} className="flex flex-wrap sm:grid sm:grid-cols-12 gap-2 items-center border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
                  <div className="w-full sm:w-auto sm:col-span-5 text-sm">{loan.product.category} — {loan.product.size_variant}</div>
                  <div className="sm:col-span-3 text-sm text-gray-500 dark:text-slate-400">On loan: {loan.quantity_on_loan}</div>
                  <input
                    className="input flex-1 min-w-[4.5rem] sm:col-span-2"
                    type="number"
                    min={1}
                    max={loan.quantity_on_loan}
                    placeholder="Qty"
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
                    Return
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
