import { useQuery } from "@tanstack/react-query";
<<<<<<< HEAD
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  ShoppingCart, HandCoins, Receipt, PackageOpen, ArrowDownToLine, ArrowUpFromLine, Wallet,
  TrendingUp, ListChecks, AlertTriangle, Boxes, Landmark, ClipboardList, Truck,
} from "lucide-react";
import { api, currency } from "../api/client";

=======
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Area, AreaChart } from "recharts";
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  CircleDollarSign,
  Wallet,
  Receipt,
  AlertTriangle,
  Boxes,
  Landmark,
  Users,
  BarChart3,
  PieChart,
} from "lucide-react";
import { api, currency } from "../api/client";

const STAT_ICONS: Record<string, { icon: any; tint: string }> = {
  "Today's Sales Value": { icon: TrendingUp, tint: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
  "Sales Count": { icon: ShoppingCart, tint: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  "Due Created": { icon: Receipt, tint: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  "Due Collected": { icon: CircleDollarSign, tint: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  "Total Expenses": { icon: Wallet, tint: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  "Outstanding Due": { icon: Landmark, tint: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  "Low-Stock SKUs": { icon: AlertTriangle, tint: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  "Oxygen SKUs Tracked": { icon: Boxes, tint: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
};

>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
export default function Dashboard() {
  const { data: sales } = useQuery({ queryKey: ["reports", "sales"], queryFn: () => api.get("/reports/sales").then((r) => r.data) });
  const { data: receivables } = useQuery({ queryKey: ["reports", "receivables"], queryFn: () => api.get("/reports/receivables").then((r) => r.data) });
  const { data: stock } = useQuery({ queryKey: ["reports", "stock"], queryFn: () => api.get("/reports/stock").then((r) => r.data) });
  const { data: expenses } = useQuery({ queryKey: ["reports", "expenses"], queryFn: () => api.get("/reports/expenses").then((r) => r.data) });
  const { data: dueCollected } = useQuery({ queryKey: ["reports", "due-collected"], queryFn: () => api.get("/reports/due-collected").then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
<<<<<<< HEAD
  const { data: recentActivity } = useQuery({ queryKey: ["reports", "recent-activity"], queryFn: () => api.get("/reports/recent-activity", { params: { limit: 15 } }).then((r) => r.data) });
  const { data: supplierPayables } = useQuery({ queryKey: ["reports", "supplier-payables"], queryFn: () => api.get("/reports/supplier-payables").then((r) => r.data) });
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac

  const lowStock = (stock ?? []).filter((s: any) => s.is_low_stock);
  const cylindersOnLoan = (stock ?? []).length; // placeholder aggregate; real loan count comes from customer loans

  const trend = buildDailyTrend(sales?.sales ?? []);

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <div>
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">A snapshot of the Oxygen wing, right now.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Today's Sales Value" value={currency(sales?.total_revenue ?? 0)} icon={TrendingUp} tone="brand" />
        <Stat label="Sales Count" value={String(sales?.sales_count ?? 0)} icon={ListChecks} tone="blue" />
        <Stat label="Due Created" value={currency(sales?.total_due_created ?? 0)} icon={ClipboardList} tone="amber" />
        <Stat label="Due Collected" value={currency(dueCollected?.total ?? 0)} icon={HandCoins} tone="green" />
        <Stat label="Total Expenses" value={currency(expenses?.total ?? 0)} icon={Receipt} tone="red" />
        <Stat label="Outstanding Due" value={currency(sumBuckets(receivables?.buckets))} icon={Landmark} tone="amber" />
        <Stat label="Payable to Suppliers" value={currency(supplierPayables?.total_payable ?? 0)} icon={Truck} tone="red" />
        <Stat label="Low-Stock SKUs" value={String(lowStock.length)} icon={AlertTriangle} tone={lowStock.length > 0 ? "warn" : "neutral"} />
        <Stat label="Oxygen SKUs Tracked" value={String(cylindersOnLoan)} icon={Boxes} tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">Account balances</div>
          <div className="space-y-2.5">
            {(accounts ?? []).map((a: any) => (
              <div key={a.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-slate-300">{a.name}</span>
                <span className="num font-semibold text-gray-900 dark:text-slate-100">{currency(a.current_balance)}</span>
=======
      <div className="page-header">
        <div className="page-header-icon">
          <LayoutDashboard size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="page-header-sub">A snapshot of today's sales, dues, and stock.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat i={0} label="Today's Sales Value" value={currency(sales?.total_revenue ?? 0)} />
        <Stat i={1} label="Sales Count" value={String(sales?.sales_count ?? 0)} />
        <Stat i={2} label="Due Created" value={currency(sales?.total_due_created ?? 0)} />
        <Stat i={3} label="Due Collected" value={currency(dueCollected?.total ?? 0)} />
        <Stat i={4} label="Total Expenses" value={currency(expenses?.total ?? 0)} />
        <Stat i={5} label="Outstanding Due" value={currency(sumBuckets(receivables?.buckets))} />
        <Stat i={6} label="Low-Stock SKUs" value={String(lowStock.length)} warn={lowStock.length > 0} />
        <Stat i={7} label="Oxygen SKUs Tracked" value={String(cylindersOnLoan)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card stagger-item" style={{ animationDelay: "80ms" }}>
          <div className="font-medium mb-3 flex items-center gap-2">
            <Landmark size={16} className="text-brand-600 dark:text-brand-400" />
            Account balances
          </div>
          <div className="space-y-1">
            {(accounts ?? []).map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                <span>{a.name}</span>
                <span className="font-medium">{currency(a.current_balance)}</span>
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
              </div>
            ))}
          </div>
        </div>
<<<<<<< HEAD
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">Top-due customers</div>
          <div className="space-y-2.5">
=======
        <div className="card stagger-item" style={{ animationDelay: "120ms" }}>
          <div className="font-medium mb-3 flex items-center gap-2">
            <Users size={16} className="text-brand-600 dark:text-brand-400" />
            Top-due customers
          </div>
          <div className="space-y-1">
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            {(receivables?.rows ?? [])
              .sort((a: any, b: any) => Number(b.customer.current_due_balance) - Number(a.customer.current_due_balance))
              .slice(0, 5)
              .map((r: any) => (
<<<<<<< HEAD
                <div key={r.customer.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-slate-300">{r.customer.name}</span>
                  <span className="num font-semibold text-red-600 dark:text-red-400">{currency(r.customer.current_due_balance)}</span>
                </div>
              ))}
            {(receivables?.rows ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No outstanding dues.</div>}
=======
                <div key={r.customer.id} className="flex justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <span>{r.customer.name}</span>
                  <span className="font-medium">{currency(r.customer.current_due_balance)}</span>
                </div>
              ))}
            {(receivables?.rows ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500 px-2">No outstanding dues.</div>}
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
<<<<<<< HEAD
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">Sales trend (last 14 days)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ borderRadius: 10, fontSize: 13, border: "1px solid #e5e7eb" }} />
              <Line type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="font-display font-semibold text-[15px] mb-3">Receivables aging</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketsToArray(receivables?.buckets)}>
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-gray-400 dark:text-slate-500" />
              <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ borderRadius: 10, fontSize: 13, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
=======
        <div className="card stagger-item" style={{ animationDelay: "160ms" }}>
          <div className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-600 dark:text-brand-400" />
            Sales trend (last 14 days)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }} />
              <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} fill="url(#salesTrendFill)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card stagger-item" style={{ animationDelay: "200ms" }}>
          <div className="font-medium mb-3 flex items-center gap-2">
            <PieChart size={16} className="text-brand-600 dark:text-brand-400" />
            Receivables aging
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketsToArray(receivables?.buckets)}>
              <defs>
                <linearGradient id="agingBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" />
                  <stop offset="100%" stopColor="#0c7f47" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-slate-700" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => currency(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }} />
              <Bar dataKey="amount" fill="url(#agingBarFill)" radius={[6, 6, 0, 0]} />
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

<<<<<<< HEAD
      <div className="card">
        <div className="font-display font-semibold text-[15px] mb-3">Recent activity</div>
        <div className="space-y-1">
          {(recentActivity ?? []).map((ev: any) => (
            <div key={`${ev.type}-${ev.id}`} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-800 last:border-0">
              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${activityIconStyle(ev.direction)}`}>
                {activityIcon(ev.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{ev.title}</div>
                {ev.subtitle && <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{ev.subtitle}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className={`num text-sm font-semibold ${ev.direction === "IN" ? "text-green-700 dark:text-green-400" : ev.direction === "OUT" ? "text-red-600 dark:text-red-400" : ""}`}>
                  {ev.type === "CYLINDER_RETURN" ? `${ev.amount} unit${ev.amount === 1 ? "" : "s"}` : currency(ev.amount)}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500">{timeAgo(ev.date)}</div>
              </div>
            </div>
          ))}
          {(recentActivity ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No recent activity yet.</div>}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300 mb-2">
            <AlertTriangle size={16} />
            Low-stock alerts
          </div>
          <ul className="text-sm text-amber-800 dark:text-amber-300 list-disc pl-5 space-y-0.5">
=======
      {lowStock.length > 0 && (
        <div className="card border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 animate-fade-in-up">
          <div className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Low-stock alerts
          </div>
          <ul className="text-sm text-amber-800 dark:text-amber-300 list-disc pl-5">
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
            {lowStock.map((s: any) => (
              <li key={s.product.id}>
                {s.product.category} — {s.product.size_variant}: {s.product.current_stock_qty} left (reorder at {s.product.reorder_level})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

<<<<<<< HEAD
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
=======
function Stat({ label, value, warn, i }: { label: string; value: string; warn?: boolean; i: number }) {
  const meta = STAT_ICONS[label];
  const Icon = meta?.icon ?? TrendingUp;
  return (
    <div
      className={`card stagger-item ${warn ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10" : ""}`}
      style={{ animationDelay: `${i * 45}ms` }}
    >
      <div className={`stat-icon ${warn ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : meta?.tint ?? ""} mb-2`}>
        <Icon size={17} />
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
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
<<<<<<< HEAD

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

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
