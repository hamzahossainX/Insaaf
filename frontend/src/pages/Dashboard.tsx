import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  ShoppingCart, HandCoins, Receipt, PackageOpen, ArrowDownToLine, ArrowUpFromLine, Wallet,
  TrendingUp, ListChecks, AlertTriangle, Boxes, Landmark, ClipboardList, Truck,
} from "lucide-react";
import { api } from "../api/client";
import { useI18n } from "../lib/i18n";

export default function Dashboard() {
  const { t, formatCurrency, formatDate, formatNumber, enumLabel } = useI18n();
  const { data: sales } = useQuery({ queryKey: ["reports", "sales"], queryFn: () => api.get("/reports/sales").then((r) => r.data) });
  const { data: receivables } = useQuery({ queryKey: ["reports", "receivables"], queryFn: () => api.get("/reports/receivables").then((r) => r.data) });
  const { data: stock } = useQuery({ queryKey: ["reports", "stock"], queryFn: () => api.get("/reports/stock").then((r) => r.data) });
  const { data: expenses } = useQuery({ queryKey: ["reports", "expenses"], queryFn: () => api.get("/reports/expenses").then((r) => r.data) });
  const { data: dueCollected } = useQuery({ queryKey: ["reports", "due-collected"], queryFn: () => api.get("/reports/due-collected").then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const { data: recentActivity } = useQuery({ queryKey: ["reports", "recent-activity"], queryFn: () => api.get("/reports/recent-activity", { params: { limit: 15 } }).then((r) => r.data) });
  const { data: supplierPayables } = useQuery({ queryKey: ["reports", "supplier-payables"], queryFn: () => api.get("/reports/supplier-payables").then((r) => r.data) });

  const lowStock = (stock ?? []).filter((s: any) => s.is_low_stock);
  const cylindersOnLoan = (stock ?? []).length; // placeholder aggregate; real loan count comes from customer loans

  const trend = buildDailyTrend(sales?.sales ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">{t("nav.dashboard")}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t("dashboard.todaySales")} value={formatCurrency(sales?.total_revenue ?? 0)} icon={TrendingUp} tone="brand" />
        <Stat label={t("dashboard.salesCount")} value={formatNumber(sales?.sales_count ?? 0)} icon={ListChecks} tone="blue" />
        <Stat label={t("dashboard.dueCreated")} value={formatCurrency(sales?.total_due_created ?? 0)} icon={ClipboardList} tone="amber" />
        <Stat label={t("dashboard.dueCollected")} value={formatCurrency(dueCollected?.total ?? 0)} icon={HandCoins} tone="green" />
        <Stat label={t("dashboard.totalExpenses")} value={formatCurrency(expenses?.total ?? 0)} icon={Receipt} tone="red" />
        <Stat label={t("dashboard.outstandingDue")} value={formatCurrency(sumBuckets(receivables?.buckets))} icon={Landmark} tone="amber" />
        <Stat label={t("dashboard.supplierPayable")} value={formatCurrency(supplierPayables?.total_payable ?? 0)} icon={Truck} tone="red" />
        <Stat label={t("dashboard.lowStockSkus")} value={formatNumber(lowStock.length)} icon={AlertTriangle} tone={lowStock.length > 0 ? "warn" : "neutral"} />
        <Stat label={t("dashboard.trackedSkus")} value={formatNumber(cylindersOnLoan)} icon={Boxes} tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">{t("dashboard.accountBalances")}</div>
          <div className="space-y-2.5">
            {(accounts ?? []).map((a: any) => (
              <div key={a.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-slate-300">{a.name}</span>
                <span className="num font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(a.current_balance)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">{t("dashboard.topDueCustomers")}</div>
          <div className="space-y-2.5">
            {(receivables?.rows ?? [])
              .sort((a: any, b: any) => Number(b.customer.current_due_balance) - Number(a.customer.current_due_balance))
              .slice(0, 5)
              .map((r: any) => (
                <div key={r.customer.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-slate-300">{r.customer.name}</span>
                  <span className="num font-semibold text-red-600 dark:text-red-400">{formatCurrency(r.customer.current_due_balance)}</span>
                </div>
              ))}
            {(receivables?.rows ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("dashboard.noOutstandingDues")}</div>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">{t("dashboard.salesTrend")}</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 13, border: "1px solid #e5e7eb" }} />
              <Line type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">{t("dashboard.receivablesAging")}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketsToArray(receivables?.buckets)}>
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 13, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="font-display font-semibold text-[15px] mb-3">{t("dashboard.recentActivity")}</div>
        <div className="space-y-1">
          {(recentActivity ?? []).map((ev: any) => (
            <div key={`${ev.type}-${ev.id}`} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-800 last:border-0">
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${activityIconStyle(ev.direction)}`}>
                {activityIcon(ev.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{localizeActivityTitle(ev, t)}</div>
                {ev.subtitle && <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{localizeActivitySubtitle(ev, t, enumLabel)}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className={`num text-sm font-semibold ${ev.direction === "IN" ? "text-green-700 dark:text-green-400" : ev.direction === "OUT" ? "text-red-600 dark:text-red-400" : ""}`}>
                  {ev.type === "CYLINDER_RETURN" ? t(ev.amount === 1 ? "dashboard.units" : "dashboard.units_plural", { count: formatNumber(ev.amount) }) : formatCurrency(ev.amount)}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500">{timeAgo(ev.date, t, formatDate, formatNumber)}</div>
              </div>
            </div>
          ))}
          {(recentActivity ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">{t("dashboard.noRecentActivity")}</div>}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 mb-2">
            <AlertTriangle size={16} />
            {t("dashboard.lowStockAlerts")}
          </div>
          <ul className="text-sm text-amber-800 dark:text-amber-300 list-disc pl-5 space-y-0.5">
            {lowStock.map((s: any) => (
              <li key={s.product.id}>
                {t("dashboard.stockAlert", {
                  product: `${s.product.category} — ${s.product.size_variant}`,
                  count: formatNumber(s.product.current_stock_qty),
                  level: formatNumber(s.product.reorder_level)
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const TONE_STYLES: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400",
  green: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  neutral: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

function Stat({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon: any; tone?: string }) {
  const isWarn = tone === "warn";
  return (
    <div className={`card ${isWarn ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/[0.06]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{label}</div>
          <div className="num text-xl font-display font-semibold mt-1 text-gray-900 dark:text-slate-100 truncate">{value}</div>
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${TONE_STYLES[tone]}`}>
          <Icon size={17} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function sumBuckets(buckets?: Record<string, number>) {
  if (!buckets) return 0;
  return Object.values(buckets).reduce((a, b) => a + b, 0);
}

function bucketsToArray(buckets?: Record<string, number>) {
  if (!buckets) return [];
  return Object.entries(buckets).map(([bucket, amount]) => ({ bucket, amount }));
}

function buildDailyTrend(sales: any[]) {
  const byDay: Record<string, number> = {};
  for (const s of sales) {
    const day = new Date(s.date).toISOString().slice(5, 10);
    byDay[day] = (byDay[day] ?? 0) + Number(s.total_amount);
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }));
}

function activityIcon(type: string) {
  const size = 16;
  switch (type) {
    case "SALE": return <ShoppingCart size={size} />;
    case "DUE_PAYMENT": return <HandCoins size={size} />;
    case "EXPENSE": return <Receipt size={size} />;
    case "CYLINDER_RETURN": return <PackageOpen size={size} />;
    case "EMPLOYEE_LOAN": return <ArrowUpFromLine size={size} />;
    case "EMPLOYEE_LOAN_REPAYMENT": return <ArrowDownToLine size={size} />;
    case "PAYROLL": return <Wallet size={size} />;
    case "SUPPLIER_RECEIPT": return <Truck size={size} />;
    case "SUPPLIER_PAYMENT": return <ArrowUpFromLine size={size} />;
    default: return <ShoppingCart size={size} />;
  }
}

function activityIconStyle(direction: string) {
  if (direction === "IN") return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (direction === "OUT") return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  return "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300";
}

function timeAgo(
  dateStr: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatDate: (value: string | number | Date) => string,
  formatNumber: (value: number) => string
) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("dashboard.justNow");
  if (mins < 60) return t("dashboard.minutesAgo", { count: formatNumber(mins) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("dashboard.hoursAgo", { count: formatNumber(hours) });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("dashboard.daysAgo", { count: formatNumber(days) });
  return formatDate(dateStr);
}

function localizeActivityTitle(ev: any, t: (key: string, values?: Record<string, string | number>) => string) {
  const patterns: Array<[string, string]> = [
    ["Sale to ", "dashboard.saleTo"],
    ["Due payment from ", "dashboard.duePaymentFrom"],
    ["Expense — ", "dashboard.expenseTitle"],
    ["Cylinder return from ", "dashboard.returnFrom"],
    ["Loan/advance given to ", "dashboard.loanTo"],
    ["Loan repayment from ", "dashboard.repaymentFrom"],
    ["Payroll paid — ", "dashboard.payrollPaid"],
    ["Received from ", "dashboard.receivedFrom"],
    ["Advance to ", "dashboard.advanceTo"],
    ["Payment to ", "dashboard.paymentTo"]
  ];
  const match = patterns.find(([prefix]) => ev.title.startsWith(prefix));
  if (!match) return ev.title;
  const [prefix, key] = match;
  const valueKey = prefix === "Expense — " ? "category" : "name";
  return t(key, { [valueKey]: ev.title.slice(prefix.length) });
}

function localizeActivitySubtitle(
  ev: any,
  t: (key: string, values?: Record<string, string | number>) => string,
  enumLabel: (value: string) => string
) {
  if (ev.type === "SALE") return enumLabel(ev.subtitle.replaceAll(" ", "_"));
  if (ev.type !== "SUPPLIER_RECEIPT") return ev.subtitle;
  return ev.subtitle
    .replace(/(\d+) refilled/g, (_: string, count: string) => t("suppliers.refilledCount", { count }))
    .replace(/(\d+) new/g, (_: string, count: string) => t("suppliers.newCount", { count }));
}
