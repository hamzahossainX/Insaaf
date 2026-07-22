import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyDuePayment } from "../domain/oxygenRules";
import { applyAccountLedgerEntry } from "./sales.service";

export async function listCustomers(search?: string, hasDueOnly?: boolean) {
  return prisma.customer.findMany({
    where: {
      AND: [
        { is_deleted: false },
        search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {},
        hasDueOnly ? { current_due_balance: { gt: 0 } } : {},
      ],
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomerProfile(customer_id: string) {
  const [customer, loans, sales, duePayments] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customer_id } }),
    prisma.cylinderLoan.findMany({ where: { customer_id, quantity_on_loan: { gt: 0 } }, include: { product: true } }),
    // include product on every line item so the UI can show exactly WHAT was bought
    // behind any due balance, not just the sale total.
    prisma.sale.findMany({
      where: { customer_id },
      include: { line_items: { include: { product: true } }, user: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.duePayment.findMany({ where: { customer_id }, orderBy: { date: "desc" }, include: { user: { select: { name: true } }, received_into_account: { select: { name: true } } } }),
  ]);
  return { customer, cylinders_on_loan: loans, sales, due_payments: duePayments };
}

/** Admin-only soft delete. Refuses to delete a customer who still has an outstanding due
 * or cylinders on loan, since that would silently erase money/inventory owed to the business. */
export async function softDeleteCustomer(customer_id: string, user_id: string) {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customer_id } });
  if (Number(customer.current_due_balance) > 0) {
    throw new Error("Cannot delete a customer with an outstanding due balance. Settle the due first.");
  }
  const openLoans = await prisma.cylinderLoan.count({ where: { customer_id, quantity_on_loan: { gt: 0 } } });
  if (openLoans > 0) {
    throw new Error("Cannot delete a customer with cylinders still on loan. Record the returns first.");
  }
  const updated = await prisma.customer.update({ where: { id: customer_id }, data: { is_deleted: true } });
  await prisma.auditLog.create({ data: { user_id, action: "DELETE", entity: "Customer", entity_id: customer_id, diff: { soft_deleted: true } } });
  return updated;
}

export interface RecordDuePaymentInput {
  customer_id: string;
  amount: number;
  received_into_account_id: string;
  user_id: string;
  date?: string;
  note?: string;
}

/** Rule 5: decreases Customer.current_due_balance and increases the account balance. */
export async function recordDuePayment(input: RecordDuePaymentInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customer_id } });
    const { newDueBalance } = applyDuePayment(Number(customer.current_due_balance), input.amount);

    const payment = await tx.duePayment.create({
      data: {
        customer_id: input.customer_id,
        amount: input.amount,
        received_into_account_id: input.received_into_account_id,
        user_id: input.user_id,
        date: input.date ? new Date(input.date) : undefined,
        note: input.note || undefined,
      },
    });

    await tx.customer.update({ where: { id: input.customer_id }, data: { current_due_balance: newDueBalance } });

    await applyAccountLedgerEntry(tx, {
      account_id: input.received_into_account_id,
      type: "IN",
      amount: input.amount,
      reference_type: "DUE_PAYMENT",
      reference_id: payment.id,
    });

    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "DuePayment",
      entity_id: payment.id,
      diff: { amount: input.amount, new_due_balance: newDueBalance },
    });

    return payment;
  });
}
