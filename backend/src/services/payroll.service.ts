import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { computePayroll } from "../domain/oxygenRules";
import { applyAccountLedgerEntry } from "./sales.service";

export async function listEmployees(wing_id?: string) {
  return prisma.employee.findMany({ where: { wing_id, is_active: true }, orderBy: { name: "asc" } });
}

/** Admin-only deactivate (soft delete) — payroll/advance history is preserved, never hard-deleted. */
export async function deactivateEmployee(employee_id: string, user_id: string) {
  const employee = await prisma.employee.update({ where: { id: employee_id }, data: { is_active: false } });
  await prisma.auditLog.create({ data: { user_id, action: "DELETE", entity: "Employee", entity_id: employee_id, diff: { deactivated: true } } });
  return employee;
}

export async function getEmployeeProfile(employee_id: string) {
  const [employee, advances, increments, payroll, deliveries] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: employee_id } }),
    prisma.salaryAdvance.findMany({ where: { employee_id }, orderBy: { date: "desc" } }),
    prisma.salaryIncrement.findMany({ where: { employee_id }, orderBy: { effective_month: "desc" } }),
    prisma.payrollPayment.findMany({ where: { employee_id }, orderBy: { month: "desc" } }),
    // "who delivered what, when, and where" — every sale this employee was assigned to deliver.
    prisma.sale.findMany({
      where: { delivery_employee_id: employee_id },
      include: { customer: true, line_items: { include: { product: true } } },
      orderBy: { date: "desc" },
    }),
  ]);
  return { employee, advances, increments, payroll, deliveries };
}

export interface AddAdvanceInput {
  employee_id: string;
  amount: number;
  paid_from_account_id: string;
  month_applied_to: string; // "YYYY-MM"
  user_id: string;
  note?: string;
}

/** Admin only. */
export async function addSalaryAdvance(input: AddAdvanceInput) {
  return prisma.$transaction(async (tx) => {
    const advance = await tx.salaryAdvance.create({
      data: {
        employee_id: input.employee_id,
        amount: input.amount,
        paid_from_account_id: input.paid_from_account_id,
        month_applied_to: input.month_applied_to,
        note: input.note || undefined,
      },
    });
    await applyAccountLedgerEntry(tx, {
      account_id: input.paid_from_account_id,
      type: "OUT",
      amount: input.amount,
      reference_type: "SALARY_ADVANCE",
      reference_id: advance.id,
    });
    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "SalaryAdvance", entity_id: advance.id });
    return advance;
  });
}

export interface AddIncrementInput {
  employee_id: string;
  type: "ONE_TIME_BONUS" | "PERMANENT_RAISE";
  amount_or_new_base: number;
  effective_month: string;
  note?: string;
  user_id: string;
}

/** Admin only. */
export async function addSalaryIncrement(input: AddIncrementInput) {
  return prisma.$transaction(async (tx) => {
    const increment = await tx.salaryIncrement.create({
      data: {
        employee_id: input.employee_id,
        type: input.type,
        amount_or_new_base: input.amount_or_new_base,
        effective_month: input.effective_month,
        note: input.note,
      },
    });
    if (input.type === "PERMANENT_RAISE") {
      await tx.employee.update({ where: { id: input.employee_id }, data: { base_salary: input.amount_or_new_base } });
    }
    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "SalaryIncrement", entity_id: increment.id });
    return increment;
  });
}

export interface PreviewPayrollResult {
  employee_id: string;
  base_salary: number;
  increment_amount: number;
  total_advances: number;
  net_paid: number;
}

/** Computes net payable for the month WITHOUT persisting — used to show "before confirming". */
export async function previewMonthEndPayroll(employee_id: string, month: string): Promise<PreviewPayrollResult> {
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: employee_id } });
  const [bonusIncrements, advances] = await Promise.all([
    prisma.salaryIncrement.findMany({
      where: { employee_id, effective_month: month, type: "ONE_TIME_BONUS" },
    }),
    prisma.salaryAdvance.findMany({ where: { employee_id, month_applied_to: month } }),
  ]);
  const incrementAmount = bonusIncrements.reduce((sum, i) => sum + Number(i.amount_or_new_base), 0);
  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);
  const netPaid = computePayroll(Number(employee.base_salary), incrementAmount, totalAdvances);
  return {
    employee_id,
    base_salary: Number(employee.base_salary),
    increment_amount: incrementAmount,
    total_advances: totalAdvances,
    net_paid: netPaid,
  };
}

export interface RunPayrollInput {
  employee_id: string;
  month: string;
  paid_from_account_id: string;
  user_id: string;
  note?: string;
}

/** "Run Month-End Payroll" (Screen 9) — persists after Admin confirms the preview. */
export async function runMonthEndPayroll(input: RunPayrollInput) {
  const preview = await previewMonthEndPayroll(input.employee_id, input.month);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payrollPayment.create({
      data: {
        employee_id: input.employee_id,
        month: input.month,
        base_salary: preview.base_salary,
        increment_amount: preview.increment_amount,
        total_advances: preview.total_advances,
        net_paid: preview.net_paid,
        paid_from_account_id: input.paid_from_account_id,
        note: input.note || undefined,
      },
    });

    await applyAccountLedgerEntry(tx, {
      account_id: input.paid_from_account_id,
      type: "OUT",
      amount: preview.net_paid,
      reference_type: "PAYROLL",
      reference_id: payment.id,
    });

    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "PayrollPayment", entity_id: payment.id, diff: { ...preview } });
    return payment;
  });
}
