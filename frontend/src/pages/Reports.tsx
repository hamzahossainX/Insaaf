import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, currency } from "../api/client";
import { downloadCsv, printFriendlyDownload } from "../lib/csv";

const TABS = ["Sales", "Receivables", "Supplier Payables", "Stock", "Expenses", "Payroll", "Loans & Advances", "Profit Summary"] as const;
type Tab = (typeof TABS)[number];

export default function Reports() {
  const [tab, setTab] = useState<Tab>("Sales");
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const [wingId, setWingId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Reports</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t} className={`btn ${tab === t ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="label">Wing</label>
          <select className="input" value={wingId} onChange={(e) => setWingId(e.target.value)}>
            <option value="">All wings</option>
            {(wings ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {(from || to) && (
          <button className="btn-secondary" onClick={() => { setFrom(""); setTo(""); }}>Show all (clear dates)</button>
        )}
        <span className="text-xs text-gray-400 dark:text-slate-500 max-w-xs">
          "To" includes everything up through the end of that day.
        </span>
        <button className="btn-secondary ml-auto" onClick={printFriendlyDownload}>Print / Save as PDF</button>
      </div>

      {tab === "Sales" && <SalesReport wingId={wingId} from={from} to={to} />}
      {tab === "Receivables" && <ReceivablesReport />}
      {tab === "Supplier Payables" && <SupplierPayablesReport from={from} to={to} />}
      {tab === "Stock" && <StockReport wingId={wingId} />}
      {tab === "Expenses" && <ExpensesReport wingId={wingId} from={from} to={to} />}
      {tab === "Payroll" && <PayrollReport wingId={wingId} />}
      {tab === "Loans & Advances" && <LoansAndAdvancesReport from={from} to={to} />}
      {tab === "Profit Summary" && <ProfitReport wingId={wingId} from={from} to={to} />}
    </div>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return <button className="btn-secondary" onClick={onClick}>⬇ Export as Excel (CSV)</button>;
}

function SalesReport({ wingId, from, to }: { wingId: string; from: string; to: string }) {
  const { data } = useQuery({
    queryKey: ["report-sales", wingId, from, to],
    queryFn: () => api.get("/reports/sales", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;

  // One row per line item, so every "what sold / who sold it / at what price" detail is visible —
  // this is the detailed, spreadsheet-friendly view; the summary cards above give the roll-up.
  const detailRows = data.sales.flatMap((s: any) =>
    s.line_items.map((li: any) => ({
      date: new Date(s.date).toLocaleDateString(),
      customer: s.customer?.name ?? "—",
      customer_phone: s.customer?.phone ?? "",
      sold_by: s.user?.name ?? "—",
      delivered_by: s.delivery_employee?.name ?? "—",
      sale_type: s.sale_type.replaceAll("_", " "),
      product: li.product ? `${li.product.category} (${li.product.size_variant})` : (li.custom_item_name ?? "Item"),
      quantity: li.quantity,
      unit_price: Number(li.unit_price),
      subtotal: Number(li.subtotal),
      sale_total: Number(s.total_amount),
      paid_now: Number(s.paid_now_amount),
      paid_into: s.paid_into_account?.name ?? "—",
      due: Number(s.due_amount),
    }))
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Sales count" value={String(data.sales_count)} />
        <SummaryCard label="Total revenue" value={currency(data.total_revenue)} />
        <SummaryCard label="Collected now" value={currency(data.total_collected)} />
        <SummaryCard label="Due created" value={currency(data.total_due_created)} />
      </div>

      <div className="flex justify-end">
        <ExportButton onClick={() => downloadCsv("sales-report", detailRows)} />
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th><th>Customer</th><th>Sold by</th><th>Delivered by</th><th>Sale type</th><th>Product</th>
              <th>Qty</th><th>Unit price</th><th>Subtotal</th><th>Sale total</th><th>Paid now</th><th>Into account</th><th>Due</th>
            </tr>
          </thead>
          <tbody>
            {detailRows.map((r: any, i: number) => (
              <tr key={i}>
                <td className="whitespace-nowrap">{r.date}</td>
                <td>{r.customer}</td>
                <td>{r.sold_by}</td>
                <td>{r.delivered_by}</td>
                <td>{r.sale_type}</td>
                <td>{r.product}</td>
                <td>{r.quantity}</td>
                <td>{currency(r.unit_price)}</td>
                <td>{currency(r.subtotal)}</td>
                <td>{currency(r.sale_total)}</td>
                <td>{currency(r.paid_now)}</td>
                <td>{r.paid_into}</td>
                <td className={r.due > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{currency(r.due)}</td>
              </tr>
            ))}
            {detailRows.length === 0 && (
              <tr><td colSpan={13} className="text-center text-gray-400 dark:text-slate-500 py-4">No sales in this range.</td></tr>
            )}
          </tbody>
          {detailRows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={6}>Total ({data.sales_count} sales)</td>
                <td>{detailRows.reduce((s: number, r: any) => s + r.quantity, 0)}</td>
                <td></td>
                <td>{currency(detailRows.reduce((s: number, r: any) => s + r.subtotal, 0))}</td>
                <td>{currency(data.total_revenue)}</td>
                <td>{currency(data.total_collected)}</td>
                <td></td>
                <td>{currency(data.total_due_created)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}

function ReceivablesReport() {
  const { data } = useQuery({ queryKey: ["report-receivables"], queryFn: () => api.get("/reports/receivables").then((r) => r.data) });
  if (!data) return null;
  const rows = data.rows.map((r: any) => ({
    customer: r.customer.name,
    phone: r.customer.phone,
    due: Number(r.customer.current_due_balance),
    age_days: r.age_days,
    bucket: r.bucket,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(data.buckets).map(([bucket, amount]) => (
          <SummaryCard key={bucket} label={`${bucket} days`} value={currency(amount as number)} />
        ))}
      </div>
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("receivables-aging", rows)} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Customer</th><th>Due</th><th>Age (days)</th><th>Bucket</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.customer}>
                <td>{r.customer}</td>
                <td>{currency(r.due)}</td>
                <td>{r.age_days}</td>
                <td>{r.bucket}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">No outstanding dues.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td>Total ({rows.length} customers)</td>
                <td>{currency(rows.reduce((s: number, r: any) => s + r.due, 0))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}

function SupplierPayablesReport({ from, to }: { from: string; to: string }) {
  const { data: payables } = useQuery({ queryKey: ["report-supplier-payables"], queryFn: () => api.get("/reports/supplier-payables").then((r) => r.data) });
  const { data: activity } = useQuery({
    queryKey: ["report-supplier-activity", from, to],
    queryFn: () => api.get("/reports/supplier-activity", { params: { from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!payables) return null;

  const rows = payables.suppliers.map((s: any) => ({ supplier: s.name, phone: s.phone, payable: Number(s.current_payable_balance) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Total payable to suppliers" value={currency(payables.total_payable)} />
        <SummaryCard label="Received (value) in range" value={currency(activity?.total_received_value ?? 0)} />
        <SummaryCard label="Paid to suppliers in range" value={currency(activity?.total_paid ?? 0)} />
      </div>

      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("supplier-payables", rows)} /></div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Supplier</th><th>Phone</th><th>Payable balance</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.supplier}>
                <td>{r.supplier}</td>
                <td>{r.phone}</td>
                <td className="text-red-600 dark:text-red-400 font-medium">{currency(r.payable)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 dark:text-slate-500 py-4">No outstanding payables.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={2}>Total ({rows.length} suppliers)</td>
                <td>{currency(rows.reduce((s: number, r: any) => s + r.payable, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      {activity && (activity.receipts.length > 0 || activity.payments.length > 0) && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-800">Recent supplier activity</div>
          <div className="table-scroll">
          <table className="table-base">
            <thead><tr><th>Date</th><th>Supplier</th><th>Type</th><th>Detail</th><th>Amount</th></tr></thead>
            <tbody>
              {[
                ...activity.receipts.map((r: any) => ({
                  id: `r-${r.id}`, date: r.date, supplier: r.supplier.name, type: "Receipt",
                  detail: `${r.refill_quantity ? `${r.refill_quantity} refilled` : ""}${r.refill_quantity && r.new_quantity ? " + " : ""}${r.new_quantity ? `${r.new_quantity} new` : ""} ${r.product.category} (${r.product.size_variant})`,
                  amount: Number(r.total_amount),
                })),
                ...activity.payments.map((p: any) => ({
                  id: `p-${p.id}`, date: p.date, supplier: p.supplier.name, type: p.type === "ADVANCE" ? "Advance" : "Installment",
                  detail: "", amount: Number(p.amount),
                })),
              ]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((row: any) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                    <td>{row.supplier}</td>
                    <td>{row.type}</td>
                    <td className="text-gray-500 dark:text-slate-400">{row.detail}</td>
                    <td>{currency(row.amount)}</td>
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

function StockReport({ wingId }: { wingId: string }) {
  const { data } = useQuery({
    queryKey: ["report-stock", wingId],
    queryFn: () => api.get("/reports/stock", { params: { wing_id: wingId || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  const rows = data.map((row: any) => ({
    product: `${row.product.category} (${row.product.size_variant})`,
    stock_on_hand: row.product.current_stock_qty,
    reorder_level: row.product.reorder_level,
    status: row.is_low_stock ? "Low stock" : "OK",
  }));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("stock-report", rows)} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Product</th><th>Stock</th><th>Reorder level</th><th>Status</th></tr></thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.product.id} className={row.is_low_stock ? "bg-amber-50 dark:bg-amber-500/10" : ""}>
                <td>{row.product.category} — {row.product.size_variant}</td>
                <td>{row.product.current_stock_qty}</td>
                <td>{row.product.reorder_level}</td>
                <td>{row.is_low_stock ? <span className="text-amber-700 dark:text-amber-400 font-medium">Low stock</span> : "OK"}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">No products found.</td></tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td>Total stock ({data.length} SKUs)</td>
                <td>{data.reduce((s: number, row: any) => s + row.product.current_stock_qty, 0)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}

function ExpensesReport({ wingId, from, to }: { wingId: string; from: string; to: string }) {
  const { data } = useQuery({
    queryKey: ["report-expenses", wingId, from, to],
    queryFn: () => api.get("/reports/expenses", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  const rows = data.expenses.map((e: any) => ({ date: new Date(e.date).toLocaleDateString(), category: e.category, amount: Number(e.amount), note: e.note ?? "" }));
  return (
    <div className="space-y-4">
      <SummaryCard label="Total expenses" value={currency(data.total)} />
      <div className="card">
        <div className="font-medium mb-2">By category</div>
        {Object.entries(data.by_category).map(([cat, amt]) => (
          <div key={cat} className="flex justify-between text-sm py-1"><span>{cat}</span><span>{currency(amt as number)}</span></div>
        ))}
      </div>
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("expenses-report", rows)} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i}><td>{r.date}</td><td>{r.category}</td><td>{currency(r.amount)}</td><td className="text-gray-500 dark:text-slate-400">{r.note}</td></tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">No expenses in this range.</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={2}>Total ({rows.length} expenses)</td>
                <td>{currency(rows.reduce((s: number, r: any) => s + r.amount, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}

function PayrollReport({ wingId }: { wingId: string }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data } = useQuery({
    queryKey: ["report-payroll", wingId, month],
    queryFn: () => api.get("/reports/payroll", { params: { wing_id: wingId || undefined, month } }).then((r) => r.data),
  });
  return (
    <div className="space-y-4">
      <input className="input max-w-xs" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      {data && (
        <>
          <SummaryCard label={`Total paid — ${month}`} value={currency(data.total_paid)} />
          <div className="flex justify-end">
            <ExportButton onClick={() => downloadCsv("payroll-report", data.payments.map((p: any) => ({ employee: p.employee.name, month: p.month, base_salary: Number(p.base_salary), increment: Number(p.increment_amount), advances: Number(p.total_advances), net_paid: Number(p.net_paid) })))} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="table-scroll">
            <table className="table-base">
              <thead><tr><th>Employee</th><th>Net paid</th></tr></thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id}><td>{p.employee.name}</td><td>{currency(p.net_paid)}</td></tr>
                ))}
                {data.payments.length === 0 && (
                  <tr><td colSpan={2} className="text-center text-gray-400 dark:text-slate-500 py-4">No payroll runs for {month}.</td></tr>
                )}
              </tbody>
              {data.payments.length > 0 && (
                <tfoot>
                  <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                    <td>Total</td>
                    <td>{currency(data.total_paid)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoansAndAdvancesReport({ from, to }: { from: string; to: string }) {
  const { data } = useQuery({
    queryKey: ["report-loans", from, to],
    queryFn: () => api.get("/employee-loans", { params: { from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;

  const givenRows = data.loans.map((l: any) => ({
    date: new Date(l.date).toLocaleDateString(),
    employee: l.employee.name,
    type: "Given",
    amount: Number(l.amount),
    account: l.paid_from_account?.name ?? "—",
    recorded_by: l.user?.name ?? "—",
    note: l.note ?? "",
  }));
  const repaidRows = data.repayments.map((r: any) => ({
    date: new Date(r.date).toLocaleDateString(),
    employee: r.employee.name,
    type: "Repaid",
    amount: Number(r.amount),
    account: r.received_into_account?.name ?? "—",
    recorded_by: r.user?.name ?? "—",
    note: "",
  }));
  const allRows = [...givenRows, ...repaidRows].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Total given (loans/advances)" value={currency(data.total_given)} />
        <SummaryCard label="Total repaid" value={currency(data.total_repaid)} />
        <SummaryCard label="Total still outstanding" value={currency(data.total_outstanding)} />
      </div>

      <div className="card">
        <div className="font-medium mb-2">Outstanding balance by employee</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Employee</th><th>Outstanding balance</th></tr></thead>
          <tbody>
            {data.balances.map((b: any) => (
              <tr key={b.employee.id}>
                <td>{b.employee.name}</td>
                <td className={b.outstanding_balance > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{currency(b.outstanding_balance)}</td>
              </tr>
            ))}
            {data.balances.length === 0 && (
              <tr><td colSpan={2} className="text-center text-gray-400 dark:text-slate-500 py-4">No employees yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("loans-and-advances", allRows)} /></div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">Transaction history</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Amount</th><th>Account</th><th>Recorded by</th><th>Note</th></tr></thead>
          <tbody>
            {allRows.map((r: any, i: number) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td>{r.employee}</td>
                <td className={r.type === "Given" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}>{r.type}</td>
                <td>{currency(r.amount)}</td>
                <td>{r.account}</td>
                <td>{r.recorded_by}</td>
                <td className="text-gray-500 dark:text-slate-400">{r.note}</td>
              </tr>
            ))}
            {allRows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 dark:text-slate-500 py-4">No loan/advance activity in this range.</td></tr>
            )}
          </tbody>
          {allRows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={3}>Total</td>
                <td>{currency(data.total_given - data.total_repaid)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}

function ProfitReport({ wingId, from, to }: { wingId: string; from: string; to: string }) {
  const { data } = useQuery({
    queryKey: ["report-profit", wingId, from, to],
    queryFn: () => api.get("/reports/profit-summary", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  return (
    <div className="card max-w-md space-y-2">
      <Row label="Revenue" value={data.revenue} />
      <Row label="− COGS" value={-data.cogs} />
      <Row label="− Expenses" value={-data.expenses} />
      <Row label="− Payroll" value={-data.payroll} />
      <div className="border-t border-gray-200 dark:border-slate-700 pt-2"><Row label="Approx. profit" value={data.approx_profit} bold /></div>
      <p className="text-xs text-gray-400 dark:text-slate-500">Approximate — based on unit cost price at time of report, not historical cost.</p>
      <ExportButton onClick={() => downloadCsv("profit-summary", [{ revenue: data.revenue, cogs: data.cogs, expenses: data.expenses, payroll: data.payroll, approx_profit: data.approx_profit }])} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <div className={`flex justify-between text-sm ${bold ? "font-semibold text-base" : ""}`}><span>{label}</span><span>{currency(value)}</span></div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
      <div className="num text-lg font-display font-semibold mt-1">{value}</div>
    </div>
  );
}
