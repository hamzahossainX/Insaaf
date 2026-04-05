import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyAccountLedgerEntry } from "./sales.service";
import { inclusiveDateRange } from "../lib/dateRange";

export interface CreateExpenseInput {
  category: string;
  amount: number;
  paid_from_account_id: string;
  wing_id?: string;
  note?: string;
  attachment_url?: string;
  user_id: string;
  date?: string;
}

export async function createExpense(input: CreateExpenseInput) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        category: input.category,
        amount: input.amount,
        paid_from_account_id: input.paid_from_account_id,
        wing_id: input.wing_id,
        note: input.note,
        attachment_url: input.attachment_url,
        user_id: input.user_id,
        date: input.date ? new Date(input.date) : undefined,
      },
    });

    await applyAccountLedgerEntry(tx, {
      account_id: input.paid_from_account_id,
      type: "OUT",
      amount: input.amount,
      reference_type: "EXPENSE",
      reference_id: expense.id,
    });

    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "Expense", entity_id: expense.id });
    return expense;
  });
}

export async function listExpenses(filters: { wing_id?: string; category?: string; from?: string; to?: string }) {
  return prisma.expense.findMany({
    where: {
      is_deleted: false,
      wing_id: filters.wing_id,
      category: filters.category,
      date: inclusiveDateRange(filters.from, filters.to),
    },
    orderBy: { date: "desc" },
  });
}

/**
 * Admin-only soft delete. Per the shared rule, financial records are never hard-deleted —
 * this marks the expense deleted AND writes a reversal ledger entry (money back IN to the
 * account it was paid from) inside the same transaction, so the account balance stays correct.
 */
export async function softDeleteExpense(expense_id: string, user_id: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUniqueOrThrow({ where: { id: expense_id } });
    if (expense.is_deleted) throw new Error("Expense already deleted");

    await tx.expense.update({ where: { id: expense_id }, data: { is_deleted: true } });

    await applyAccountLedgerEntry(tx, {
      account_id: expense.paid_from_account_id,
      type: "IN",
      amount: Number(expense.amount),
      reference_type: "EXPENSE_REVERSAL",
      reference_id: expense_id,
    });

    await writeAuditLog(tx, { user_id, action: "DELETE", entity: "Expense", entity_id: expense_id, diff: { reversed_amount: Number(expense.amount) } });
    return expense;
  });
}
