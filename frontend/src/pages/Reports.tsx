import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { downloadCsv, printFriendlyDownload } from "../lib/csv";
import { useI18n } from "../lib/i18n";

const TABS = ["Sales", "Receivables", "Supplier Payables", "Stock", "Expenses", "Payroll", "Loans & Advances", "Profit Summary"] as const;
type Tab = (typeof TABS)[number];
const reportTabKey: Record<Tab, string> = {
  Sales: "reports.sales",
  Receivables: "reports.receivables",
  "Supplier Payables": "reports.supplierPayables",
  Stock: "reports.stock",
  Expenses: "reports.expenses",
  Payroll: "reports.payroll",
  "Loans & Advances": "reports.loans",
  "Profit Summary": "reports.profit"
};

export default function Reports() {
  const { t, enumLabel } = useI18n();
  const [tab, setTab] = useState<Tab>("Sales");
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const [wingId, setWingId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("reports.title")}</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((tabName) => (
          <button key={tabName} className={`btn ${tab === tabName ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300"}`} onClick={() => setTab(tabName)}>
            {t(reportTabKey[tabName])}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="label">{t("common.wing")}</label>
          <select className="input" value={wingId} onChange={(e) => setWingId(e.target.value)}>
            <option value="">{t("reports.allWings")}</option>
            {(wings ?? []).map((w: any) => <option key={w.id} value={w.id}>{enumLabel(w.name)}</option>)}
          </select>
        </div>
        <div><label className="label">{t("reports.fromDate")}</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">{t("reports.toDate")}</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        {(from || to) && (
          <button className="btn-secondary" onClick={() => { setFrom(""); setTo(""); }}>{t("reports.clearDates")}</button>
        )}
        <span className="text-xs text-gray-400 dark:text-slate-500 max-w-xs">
          {t("reports.dateHelp")}
        </span>
        <button className="btn-secondary ml-auto" onClick={printFriendlyDownload}>{t("reports.print")}</button>
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
  const { t } = useI18n();
  return <button className="btn-secondary" onClick={onClick}>{t("reports.export")}</button>;
}

function SalesReport({ wingId, from, to }: { wingId: string; from: string; to: string }) {
  const { t, formatCurrency, formatDate, enumLabel } = useI18n();
  const { data } = useQuery({
    queryKey: ["report-sales", wingId, from, to],
    queryFn: () => api.get("/reports/sales", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;

  // One row per line item, so every "what sold / who sold it / at what price" detail is visible —
  // this is the detailed, spreadsheet-friendly view; the summary cards above give the roll-up.
  const detailRows = data.sales.flatMap((s: any) =>
    s.line_items.map((li: any) => ({
      date: formatDate(s.date),
      customer: s.customer?.name ?? "—",
      customer_phone: s.customer?.phone ?? "",
      sold_by: s.user?.name ?? "—",
      delivered_by: s.delivery_employee?.name ?? "—",
      sale_type: enumLabel(s.sale_type),
      product: li.product ? `${li.product.category} (${li.product.size_variant})` : (li.custom_item_name ?? t("common.item")),
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
        <SummaryCard label={t("reports.salesCount")} value={String(data.sales_count)} />
        <SummaryCard label={t("reports.totalRevenue")} value={formatCurrency(data.total_revenue)} />
        <SummaryCard label={t("reports.collectedNow")} value={formatCurrency(data.total_collected)} />
        <SummaryCard label={t("reports.dueCreated")} value={formatCurrency(data.total_due_created)} />
      </div>

      <div className="flex justify-end">
        <ExportButton onClick={() => downloadCsv("sales-report", detailRows, t("reports.nothingToExport"))} />
      </div>

      <div className="card p-0 overflow-x-auto">
        <div className="table-scroll">
        <table className="table-base">
          <thead>
            <tr>
              <th>{t("common.date")}</th><th>{t("common.customer")}</th><th>{t("reports.soldBy")}</th><th>{t("reports.deliveredBy")}</th><th>{t("reports.saleType")}</th><th>{t("common.product")}</th>
              <th>{t("reports.qty")}</th><th>{t("common.unitPrice")}</th><th>{t("common.subtotal")}</th><th>{t("reports.saleTotal")}</th><th>{t("reports.paidNow")}</th><th>{t("reports.intoAccount")}</th><th>{t("common.due")}</th>
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
                <td>{formatCurrency(r.unit_price)}</td>
                <td>{formatCurrency(r.subtotal)}</td>
                <td>{formatCurrency(r.sale_total)}</td>
                <td>{formatCurrency(r.paid_now)}</td>
                <td>{r.paid_into}</td>
                <td className={r.due > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{formatCurrency(r.due)}</td>
              </tr>
            ))}
            {detailRows.length === 0 && (
              <tr><td colSpan={13} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noSales")}</td></tr>
            )}
          </tbody>
          {detailRows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={6}>{t("reports.totalSales", { count: data.sales_count })}</td>
                <td>{detailRows.reduce((s: number, r: any) => s + r.quantity, 0)}</td>
                <td></td>
                <td>{formatCurrency(detailRows.reduce((s: number, r: any) => s + r.subtotal, 0))}</td>
                <td>{formatCurrency(data.total_revenue)}</td>
                <td>{formatCurrency(data.total_collected)}</td>
                <td></td>
                <td>{formatCurrency(data.total_due_created)}</td>
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
  const { t, formatCurrency } = useI18n();
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
          <SummaryCard key={bucket} label={t("reports.bucketDays", { bucket })} value={formatCurrency(amount as number)} />
        ))}
      </div>
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("receivables-aging", rows, t("reports.nothingToExport"))} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.customer")}</th><th>{t("common.due")}</th><th>{t("reports.ageDays")}</th><th>{t("reports.bucket")}</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.customer}>
                <td>{r.customer}</td>
                <td>{formatCurrency(r.due)}</td>
                <td>{r.age_days}</td>
                <td>{r.bucket}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noDues")}</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td>{t("reports.totalCustomers", { count: rows.length })}</td>
                <td>{formatCurrency(rows.reduce((s: number, r: any) => s + r.due, 0))}</td>
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
  const { t, formatCurrency, formatDate, enumLabel } = useI18n();
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
        <SummaryCard label={t("reports.totalSupplierPayable")} value={formatCurrency(payables.total_payable)} />
        <SummaryCard label={t("reports.receivedValue")} value={formatCurrency(activity?.total_received_value ?? 0)} />
        <SummaryCard label={t("reports.paidSuppliers")} value={formatCurrency(activity?.total_paid ?? 0)} />
      </div>

      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("supplier-payables", rows, t("reports.nothingToExport"))} /></div>

      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.supplier")}</th><th>{t("common.phone")}</th><th>{t("suppliers.payableBalance")}</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.supplier}>
                <td>{r.supplier}</td>
                <td>{r.phone}</td>
                <td className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(r.payable)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noPayables")}</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={2}>{t("reports.totalSuppliers", { count: rows.length })}</td>
                <td>{formatCurrency(rows.reduce((s: number, r: any) => s + r.payable, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      {activity && (activity.receipts.length > 0 || activity.payments.length > 0) && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-800">{t("reports.recentSupplierActivity")}</div>
          <div className="table-scroll">
          <table className="table-base">
            <thead><tr><th>{t("common.date")}</th><th>{t("common.supplier")}</th><th>{t("common.type")}</th><th>{t("common.detail")}</th><th>{t("common.amount")}</th></tr></thead>
            <tbody>
              {[
                ...activity.receipts.map((r: any) => ({
                  id: `r-${r.id}`, date: r.date, supplier: r.supplier.name, type: "SUPPLIER_RECEIPT",
                  detail: `${r.refill_quantity ? t("suppliers.refilledCount", { count: r.refill_quantity }) : ""}${r.refill_quantity && r.new_quantity ? " + " : ""}${r.new_quantity ? t("suppliers.newCount", { count: r.new_quantity }) : ""} ${r.product.category} (${r.product.size_variant})`,
                  amount: Number(r.total_amount),
                })),
                ...activity.payments.map((p: any) => ({
                  id: `p-${p.id}`, date: p.date, supplier: p.supplier.name, type: p.type,
                  detail: "", amount: Number(p.amount),
                })),
              ]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((row: any) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">{formatDate(row.date)}</td>
                    <td>{row.supplier}</td>
                    <td>{enumLabel(row.type)}</td>
                    <td className="text-gray-500 dark:text-slate-400">{row.detail}</td>
                    <td>{formatCurrency(row.amount)}</td>
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
  const { t, formatNumber } = useI18n();
  const { data } = useQuery({
    queryKey: ["report-stock", wingId],
    queryFn: () => api.get("/reports/stock", { params: { wing_id: wingId || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  const rows = data.map((row: any) => ({
    product: `${row.product.category} (${row.product.size_variant})`,
    stock_on_hand: row.product.current_stock_qty,
    reorder_level: row.product.reorder_level,
    status: row.is_low_stock ? t("reports.lowStock") : t("common.ok"),
  }));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("stock-report", rows, t("reports.nothingToExport"))} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.product")}</th><th>{t("reports.stockOnHand")}</th><th>{t("reports.reorderLevel")}</th><th>{t("common.status")}</th></tr></thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.product.id} className={row.is_low_stock ? "bg-amber-50 dark:bg-amber-500/10" : ""}>
                <td>{row.product.category} — {row.product.size_variant}</td>
                <td>{row.product.current_stock_qty}</td>
                <td>{row.product.reorder_level}</td>
                <td>{row.is_low_stock ? <span className="text-amber-700 dark:text-amber-400 font-medium">{t("reports.lowStock")}</span> : t("common.ok")}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noProducts")}</td></tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td>{t("reports.totalStock", { count: formatNumber(data.length) })}</td>
                <td>{formatNumber(data.reduce((s: number, row: any) => s + row.product.current_stock_qty, 0))}</td>
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
  const { t, formatCurrency, formatDate } = useI18n();
  const { data } = useQuery({
    queryKey: ["report-expenses", wingId, from, to],
    queryFn: () => api.get("/reports/expenses", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  const rows = data.expenses.map((e: any) => ({ date: formatDate(e.date), category: e.category, amount: Number(e.amount), note: e.note ?? "" }));
  return (
    <div className="space-y-4">
      <SummaryCard label={t("reports.totalExpenses")} value={formatCurrency(data.total)} />
      <div className="card">
        <div className="font-medium mb-2">{t("reports.byCategory")}</div>
        {Object.entries(data.by_category).map(([cat, amt]) => (
          <div key={cat} className="flex justify-between text-sm py-1"><span>{cat}</span><span>{formatCurrency(amt as number)}</span></div>
        ))}
      </div>
      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("expenses-report", rows, t("reports.nothingToExport"))} /></div>
      <div className="card p-0 overflow-hidden">
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.category")}</th><th>{t("common.amount")}</th><th>{t("common.note")}</th></tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={i}><td>{r.date}</td><td>{r.category}</td><td>{formatCurrency(r.amount)}</td><td className="text-gray-500 dark:text-slate-400">{r.note}</td></tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noExpenses")}</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={2}>{t("reports.totalExpenseRows", { count: rows.length })}</td>
                <td>{formatCurrency(rows.reduce((s: number, r: any) => s + r.amount, 0))}</td>
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
  const { t, formatCurrency } = useI18n();
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
          <SummaryCard label={t("reports.totalPaidMonth", { month })} value={formatCurrency(data.total_paid)} />
          <div className="flex justify-end">
            <ExportButton onClick={() => downloadCsv("payroll-report", data.payments.map((p: any) => ({ employee: p.employee.name, month: p.month, base_salary: Number(p.base_salary), increment: Number(p.increment_amount), advances: Number(p.total_advances), net_paid: Number(p.net_paid) })), t("reports.nothingToExport"))} />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="table-scroll">
            <table className="table-base">
              <thead><tr><th>{t("common.employee")}</th><th>{t("payroll.netPaid")}</th></tr></thead>
              <tbody>
                {data.payments.map((p: any) => (
                  <tr key={p.id}><td>{p.employee.name}</td><td>{formatCurrency(p.net_paid)}</td></tr>
                ))}
                {data.payments.length === 0 && (
                  <tr><td colSpan={2} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noPayrollMonth", { month })}</td></tr>
                )}
              </tbody>
              {data.payments.length > 0 && (
                <tfoot>
                  <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                    <td>{t("common.total")}</td>
                    <td>{formatCurrency(data.total_paid)}</td>
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
  const { t, formatCurrency, formatDate } = useI18n();
  const { data } = useQuery({
    queryKey: ["report-loans", from, to],
    queryFn: () => api.get("/employee-loans", { params: { from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;

  const givenRows = data.loans.map((l: any) => ({
    date: formatDate(l.date),
    employee: l.employee.name,
    type: "GIVEN",
    amount: Number(l.amount),
    account: l.paid_from_account?.name ?? "—",
    recorded_by: l.user?.name ?? "—",
    note: l.note ?? "",
  }));
  const repaidRows = data.repayments.map((r: any) => ({
    date: formatDate(r.date),
    employee: r.employee.name,
    type: "REPAID",
    amount: Number(r.amount),
    account: r.received_into_account?.name ?? "—",
    recorded_by: r.user?.name ?? "—",
    note: "",
  }));
  const allRows = [...givenRows, ...repaidRows].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label={t("reports.totalGiven")} value={formatCurrency(data.total_given)} />
        <SummaryCard label={t("reports.totalRepaid")} value={formatCurrency(data.total_repaid)} />
        <SummaryCard label={t("reports.totalOutstanding")} value={formatCurrency(data.total_outstanding)} />
      </div>

      <div className="card">
        <div className="font-medium mb-2">{t("reports.outstandingByEmployee")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.employee")}</th><th>{t("reports.outstandingBalance")}</th></tr></thead>
          <tbody>
            {data.balances.map((b: any) => (
              <tr key={b.employee.id}>
                <td>{b.employee.name}</td>
                <td className={b.outstanding_balance > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>{formatCurrency(b.outstanding_balance)}</td>
              </tr>
            ))}
            {data.balances.length === 0 && (
              <tr><td colSpan={2} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("payroll.noEmployees")}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex justify-end"><ExportButton onClick={() => downloadCsv("loans-and-advances", allRows, t("reports.nothingToExport"))} /></div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">{t("reports.transactionHistory")}</div>
        <div className="table-scroll">
        <table className="table-base">
          <thead><tr><th>{t("common.date")}</th><th>{t("common.employee")}</th><th>{t("common.type")}</th><th>{t("common.amount")}</th><th>{t("common.account")}</th><th>{t("common.recordedBy")}</th><th>{t("common.note")}</th></tr></thead>
          <tbody>
            {allRows.map((r: any, i: number) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td>{r.employee}</td>
                <td className={r.type === "GIVEN" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}>{t(r.type === "GIVEN" ? "payroll.given" : "payroll.repaid")}</td>
                <td>{formatCurrency(r.amount)}</td>
                <td>{r.account}</td>
                <td>{r.recorded_by}</td>
                <td className="text-gray-500 dark:text-slate-400">{r.note}</td>
              </tr>
            ))}
            {allRows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 dark:text-slate-500 py-4">{t("reports.noLoanActivity")}</td></tr>
            )}
          </tbody>
          {allRows.length > 0 && (
            <tfoot>
              <tr className="font-semibold bg-gray-50 dark:bg-slate-900/40">
                <td colSpan={3}>{t("common.total")}</td>
                <td>{formatCurrency(data.total_given - data.total_repaid)}</td>
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
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["report-profit", wingId, from, to],
    queryFn: () => api.get("/reports/profit-summary", { params: { wing_id: wingId || undefined, from: from || undefined, to: to || undefined } }).then((r) => r.data),
  });
  if (!data) return null;
  return (
    <div className="card max-w-md space-y-2">
      <Row label={t("reports.revenue")} value={data.revenue} />
      <Row label={t("reports.cogs")} value={-data.cogs} />
      <Row label={t("reports.expenseCost")} value={-data.expenses} />
      <Row label={t("reports.payrollCost")} value={-data.payroll} />
      <div className="border-t border-gray-200 dark:border-slate-700 pt-2"><Row label={t("reports.approxProfit")} value={data.approx_profit} bold /></div>
      <p className="text-xs text-gray-400 dark:text-slate-500">{t("reports.profitHelp")}</p>
      <ExportButton onClick={() => downloadCsv("profit-summary", [{ revenue: data.revenue, cogs: data.cogs, expenses: data.expenses, payroll: data.payroll, approx_profit: data.approx_profit }], t("reports.nothingToExport"))} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const { formatCurrency } = useI18n();
  return <div className={`flex justify-between text-sm ${bold ? "font-semibold text-base" : ""}`}><span>{label}</span><span>{formatCurrency(value)}</span></div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
      <div className="num text-lg font-display font-semibold mt-1">{value}</div>
    </div>
  );
}
