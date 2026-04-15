import { prisma } from "../lib/prisma";
import { inclusiveDateRange } from "../lib/dateRange";

export async function salesReport(wing_id?: string, from?: string, to?: string) {
  const sales = await prisma.sale.findMany({
    where: { wing_id, date: inclusiveDateRange(from, to) },
    include: {
      // Full transaction detail: who sold it, who bought it, what was sold, how it was paid,
      // and who delivered it (if a delivery employee was assigned).
      line_items: { include: { product: true } },
      customer: { select: { id: true, name: true, phone: true, address: true } },
      user: { select: { id: true, name: true } },
      paid_into_account: { select: { name: true } },
      delivery_employee: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
  const total_revenue = sales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const total_collected = sales.reduce((s, sale) => s + Number(sale.paid_now_amount), 0);
  const total_due_created = sales.reduce((s, sale) => s + Number(sale.due_amount), 0);
  return { sales_count: sales.length, total_revenue, total_collected, total_due_created, sales };
}

/**
 * Actual money collected via due payments (customers paying down what they owed), separate from
 * `salesReport().total_collected` which only reflects money collected AT the moment of sale.
 * This is the correct source for a "Due Collected" dashboard figure.
 */
export async function duePaymentsCollectedReport(from?: string, to?: string) {
  const duePayments = await prisma.duePayment.findMany({
    where: { date: inclusiveDateRange(from, to) },
  });
  const total = duePayments.reduce((s, p) => s + Number(p.amount), 0);
  return { total, count: duePayments.length, due_payments: duePayments };
}

/** Receivables with simple aging buckets based on the oldest sale that created a due. */
export async function receivablesAgingReport() {
  const customers = await prisma.customer.findMany({ where: { current_due_balance: { gt: 0 } } });
  const now = Date.now();
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const rows = [];
  for (const c of customers) {
    const oldestDueSale = await prisma.sale.findFirst({
      where: { customer_id: c.id, due_amount: { gt: 0 } },
      orderBy: { date: "asc" },
    });
    const ageDays = oldestDueSale ? Math.floor((now - oldestDueSale.date.getTime()) / 86400000) : 0;
    const bucket = ageDays <= 30 ? "0-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+";
    buckets[bucket] += Number(c.current_due_balance);
    rows.push({ customer: c, age_days: ageDays, bucket });
  }
  return { buckets, rows };
}

export async function stockMovementReport(wing_id?: string) {
  const products = await prisma.product.findMany({ where: { wing_id }, include: { stock_ledger: { orderBy: { date: "desc" }, take: 20 } } });
  return products.map((p) => ({
    product: p,
    is_low_stock: p.current_stock_qty <= p.reorder_level,
    recent_movements: p.stock_ledger,
  }));
}

export async function expensesReport(wing_id?: string, from?: string, to?: string) {
  const expenses = await prisma.expense.findMany({
    where: { wing_id, date: inclusiveDateRange(from, to) },
  });
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  return { total, by_category: byCategory, expenses };
}

export async function payrollReport(wing_id?: string, month?: string) {
  const payments = await prisma.payrollPayment.findMany({
    where: { month, employee: wing_id ? { wing_id } : undefined },
    include: { employee: true },
  });
  const total_paid = payments.reduce((s, p) => s + Number(p.net_paid), 0);
  return { total_paid, payments };
}

/** Approximate profit summary: revenue - COGS (unit_cost_price * qty sold) - expenses - payroll. */
export async function profitSummary(wing_id?: string, from?: string, to?: string) {
  const dateFilter = inclusiveDateRange(from, to);
  const sales = await prisma.sale.findMany({
    where: { wing_id, date: dateFilter },
    include: { line_items: { include: { product: true } } },
  });
  const revenue = sales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const cogs = sales.reduce(
    (s, sale) => s + sale.line_items.reduce((ls, li) => ls + li.quantity * Number(li.product.unit_cost_price), 0),
    0
  );
  const expenses = await prisma.expense.aggregate({ where: { wing_id, date: dateFilter }, _sum: { amount: true } });
  const payroll = await prisma.payrollPayment.aggregate({
    where: { employee: wing_id ? { wing_id } : undefined },
    _sum: { net_paid: true },
  });
  const totalExpenses = Number(expenses._sum.amount ?? 0);
  const totalPayroll = Number(payroll._sum.net_paid ?? 0);
  const approx_profit = revenue - cogs - totalExpenses - totalPayroll;
  return { revenue, cogs, expenses: totalExpenses, payroll: totalPayroll, approx_profit };
}
