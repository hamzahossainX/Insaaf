import { useQuery } from "@tanstack/react-query";
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

export default function Dashboard() {
  const { data: sales } = useQuery({ queryKey: ["reports", "sales"], queryFn: () => api.get("/reports/sales").then((r) => r.data) });
  const { data: receivables } = useQuery({ queryKey: ["reports", "receivables"], queryFn: () => api.get("/reports/receivables").then((r) => r.data) });
  const { data: stock } = useQuery({ queryKey: ["reports", "stock"], queryFn: () => api.get("/reports/stock").then((r) => r.data) });
  const { data: expenses } = useQuery({ queryKey: ["reports", "expenses"], queryFn: () => api.get("/reports/expenses").then((r) => r.data) });
  const { data: dueCollected } = useQuery({ queryKey: ["reports", "due-collected"], queryFn: () => api.get("/reports/due-collected").then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });

  const lowStock = (stock ?? []).filter((s: any) => s.is_low_stock);
  const cylindersOnLoan = (stock ?? []).length; // placeholder aggregate; real loan count comes from customer loans

  const trend = buildDailyTrend(sales?.sales ?? []);

  return (
    <div className="space-y-6">
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
              </div>
            ))}
          </div>
        </div>
        <div className="card stagger-item" style={{ animationDelay: "120ms" }}>
          <div className="font-medium mb-3 flex items-center gap-2">
            <Users size={16} className="text-brand-600 dark:text-brand-400" />
            Top-due customers
          </div>
          <div className="space-y-1">
            {(receivables?.rows ?? [])
              .sort((a: any, b: any) => Number(b.customer.current_due_balance) - Number(a.customer.current_due_balance))
              .slice(0, 5)
              .map((r: any) => (
                <div key={r.customer.id} className="flex justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <span>{r.customer.name}</span>
                  <span className="font-medium">{currency(r.customer.current_due_balance)}</span>
                </div>
              ))}
            {(receivables?.rows ?? []).length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500 px-2">No outstanding dues.</div>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
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
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 animate-fade-in-up">
          <div className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Low-stock alerts
          </div>
          <ul className="text-sm text-amber-800 dark:text-amber-300 list-disc pl-5">
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
