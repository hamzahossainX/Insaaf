import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyAccountLedgerEntry } from "./sales.service";
import { inclusiveDateRange } from "../lib/dateRange";

export interface GiveLoanInput {
  employee_id: string;
  amount: number;
  paid_from_account_id: string;
  note?: string;
  user_id: string;
  date?: string;
}

/** Admin only. Cash given to an employee as a loan or advance, outside of payroll deduction. */
export async function giveEmployeeLoan(input: GiveLoanInput) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.employeeLoan.create({
      data: {
        employee_id: input.employee_id,
        amount: input.amount,
        paid_from_account_id: input.paid_from_account_id,
        note: input.note,
        user_id: input.user_id,
        date: input.date ? new Date(input.date) : undefined,
      },
    });
    await applyAccountLedgerEntry(tx, {
      account_id: input.paid_from_account_id,
      type: "OUT",
      amount: input.amount,
      reference_type: "EMPLOYEE_LOAN",
      reference_id: loan.id,
    });
    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "EmployeeLoan", entity_id: loan.id });
    return loan;
  });
}

export interface ReceiveRepaymentInput {
  employee_id: string;
  amount: number;
  received_into_account_id: string;
  user_id: string;
  date?: string;
}

/** Admin only. Money received back from the employee against their outstanding loan/advance balance. */
export async function receiveLoanRepayment(input: ReceiveRepaymentInput) {
  const outstanding = await outstandingBalance(input.employee_id);
  if (input.amount > outstanding) {
    throw new Error(`Repayment (${input.amount}) exceeds the outstanding balance (${outstanding})`);
  }
  return prisma.$transaction(async (tx) => {
    const repayment = await tx.employeeLoanRepayment.create({
      data: {
        employee_id: input.employee_id,
        amount: input.amount,
        received_into_account_id: input.received_into_account_id,
        user_id: input.user_id,
        date: input.date ? new Date(input.date) : undefined,
      },
    });
    await applyAccountLedgerEntry(tx, {
      account_id: input.received_into_account_id,
      type: "IN",
      amount: input.amount,
      reference_type: "EMPLOYEE_LOAN_REPAYMENT",
      reference_id: repayment.id,
    });
    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "EmployeeLoanRepayment", entity_id: repayment.id });
    return repayment;
  });
}

async function outstandingBalance(employee_id: string): Promise<number> {
  const [loans, repayments] = await Promise.all([
    prisma.employeeLoan.aggregate({ where: { employee_id }, _sum: { amount: true } }),
    prisma.employeeLoanRepayment.aggregate({ where: { employee_id }, _sum: { amount: true } }),
  ]);
  return Number(loans._sum.amount ?? 0) - Number(repayments._sum.amount ?? 0);
}

export async function getEmployeeLoanSummary(employee_id: string) {
  const [loans, repayments] = await Promise.all([
    prisma.employeeLoan.findMany({ where: { employee_id }, orderBy: { date: "desc" } }),
    prisma.employeeLoanRepayment.findMany({ where: { employee_id }, orderBy: { date: "desc" } }),
  ]);
  const total_given = loans.reduce((s, l) => s + Number(l.amount), 0);
  const total_repaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  return { loans, repayments, total_given, total_repaid, outstanding_balance: total_given - total_repaid };
}

/**
 * All employees' loan/advance activity — the dedicated "Loans & Advances" report
 * (independent of payroll). Optional date range is inclusive of the whole "to" day.
 */
export async function loansAndAdvancesReport(from?: string, to?: string) {
  const dateFilter = inclusiveDateRange(from, to);
  const [loans, repayments] = await Promise.all([
    prisma.employeeLoan.findMany({ where: { date: dateFilter }, include: { employee: true, paid_from_account: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { date: "desc" } }),
    prisma.employeeLoanRepayment.findMany({ where: { date: dateFilter }, include: { employee: true, received_into_account: { select: { name: true } }, user: { select: { name: true } } }, orderBy: { date: "desc" } }),
  ]);

  // Outstanding balance per employee across ALL time (not just the filtered range) —
  // the range only affects which transactions are listed, not the running balance.
  const employees = await prisma.employee.findMany({ where: { is_active: true } });
  const balances = await Promise.all(
    employees.map(async (e) => ({ employee: e, outstanding_balance: await outstandingBalance(e.id) }))
  );

  const total_given = loans.reduce((s, l) => s + Number(l.amount), 0);
  const total_repaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const total_outstanding = balances.reduce((s, b) => s + b.outstanding_balance, 0);

  return { loans, repayments, balances, total_given, total_repaid, total_outstanding };
}
