import { prisma } from "../lib/prisma";
import { inclusiveDateRange } from "../lib/dateRange";

export interface ActivityEvent {
  id: string;
  type: "SALE" | "DUE_PAYMENT" | "EXPENSE" | "CYLINDER_RETURN" | "EMPLOYEE_LOAN" | "EMPLOYEE_LOAN_REPAYMENT" | "PAYROLL" | "SUPPLIER_RECEIPT" | "SUPPLIER_PAYMENT";
  date: Date;
  title: string;
  subtitle?: string;
  amount: number;
  direction: "IN" | "OUT" | "NEUTRAL";
  user_name?: string;
}

/**
 * A unified "what just happened" feed for the dashboard — merges the most recent sales, due
 * payments, expenses, cylinder returns, employee loan activity, payroll runs, and supplier
 * receipts/payments into one chronological list. Read-only aggregation; doesn't touch or
 * derive any stored balances.
 */
export async function recentActivity(limit = 15): Promise<ActivityEvent[]> {
  const perTypeLimit = Math.min(limit, 15);

  const [sales, duePayments, expenses, cylinderReturns, loansGiven, loanRepayments, payrollRuns, supplierReceipts, supplierPayments] = await Promise.all([
    prisma.sale.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { customer: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.duePayment.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { customer: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      where: { is_deleted: false },
      include: { user: { select: { name: true } } },
    }),
    prisma.cylinderReturn.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { customer: { select: { name: true } }, product: { select: { category: true, size_variant: true } } },
    }),
    prisma.employeeLoan.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { employee: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.employeeLoanRepayment.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { employee: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.payrollPayment.findMany({
      take: perTypeLimit,
      orderBy: { date_paid: "desc" },
      include: { employee: { select: { name: true } } },
    }),
    prisma.supplierReceipt.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { supplier: { select: { name: true } }, product: { select: { category: true, size_variant: true } } },
    }),
    prisma.supplierPayment.findMany({
      take: perTypeLimit,
      orderBy: { date: "desc" },
      include: { supplier: { select: { name: true } }, user: { select: { name: true } } },
    }),
  ]);

  const events: ActivityEvent[] = [
    ...sales.map((s): ActivityEvent => ({
      id: s.id,
      type: "SALE",
      date: s.date,
      title: `Sale to ${s.customer?.name ?? "customer"}`,
      subtitle: s.sale_type.replaceAll("_", " "),
      amount: Number(s.total_amount),
      direction: "IN",
      user_name: s.user?.name,
    })),
    ...duePayments.map((p): ActivityEvent => ({
      id: p.id,
      type: "DUE_PAYMENT",
      date: p.date,
      title: `Due payment from ${p.customer?.name ?? "customer"}`,
      amount: Number(p.amount),
      direction: "IN",
      user_name: p.user?.name,
    })),
    ...expenses.map((e): ActivityEvent => ({
      id: e.id,
      type: "EXPENSE",
      date: e.date,
      title: `Expense — ${e.category}`,
      subtitle: e.note ?? undefined,
      amount: Number(e.amount),
      direction: "OUT",
      user_name: e.user?.name,
    })),
    ...cylinderReturns.map((r): ActivityEvent => ({
      id: r.id,
      type: "CYLINDER_RETURN",
      date: r.date,
      title: `Cylinder return from ${r.customer?.name ?? "customer"}`,
      subtitle: `${r.quantity_returned}× ${r.product?.category} (${r.product?.size_variant})`,
      amount: r.quantity_returned,
      direction: "NEUTRAL",
    })),
    ...loansGiven.map((l): ActivityEvent => ({
      id: l.id,
      type: "EMPLOYEE_LOAN",
      date: l.date,
      title: `Loan/advance given to ${l.employee?.name ?? "employee"}`,
      subtitle: l.note ?? undefined,
      amount: Number(l.amount),
      direction: "OUT",
      user_name: l.user?.name,
    })),
    ...loanRepayments.map((r): ActivityEvent => ({
      id: r.id,
      type: "EMPLOYEE_LOAN_REPAYMENT",
      date: r.date,
      title: `Loan repayment from ${r.employee?.name ?? "employee"}`,
      amount: Number(r.amount),
      direction: "IN",
      user_name: r.user?.name,
    })),
    ...payrollRuns.map((p): ActivityEvent => ({
      id: p.id,
      type: "PAYROLL",
      date: p.date_paid,
      title: `Payroll paid — ${p.employee?.name ?? "employee"}`,
      subtitle: p.month,
      amount: Number(p.net_paid),
      direction: "OUT",
    })),
    ...supplierReceipts.map((r): ActivityEvent => ({
      id: r.id,
      type: "SUPPLIER_RECEIPT",
      date: r.date,
      title: `Received from ${r.supplier?.name ?? "supplier"}`,
      subtitle: `${r.refill_quantity ? `${r.refill_quantity} refilled` : ""}${r.refill_quantity && r.new_quantity ? " + " : ""}${r.new_quantity ? `${r.new_quantity} new` : ""} ${r.product?.category} (${r.product?.size_variant})`.trim(),
      amount: Number(r.total_amount),
      direction: "NEUTRAL",
    })),
    ...supplierPayments.map((p): ActivityEvent => ({
      id: p.id,
      type: "SUPPLIER_PAYMENT",
      date: p.date,
      title: `${p.type === "ADVANCE" ? "Advance" : "Payment"} to ${p.supplier?.name ?? "supplier"}`,
      amount: Number(p.amount),
      direction: "OUT",
      user_name: p.user?.name,
    })),
  ];

  return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}

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
