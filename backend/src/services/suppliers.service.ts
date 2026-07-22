import { StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { inclusiveDateRange } from "../lib/dateRange";
import { applyStockDelta, applyAccountLedgerEntry } from "./sales.service";
import { validatePaymentSplit } from "../domain/oxygenRules";
import {
  computeSupplierReceiptEffects,
  applySupplierRefillReturn,
  applySupplierCylinderSend,
  applySupplierReceiptDue,
  applySupplierPayment,
} from "../domain/supplierRules";

export async function listSuppliers(search?: string, hasPayableOnly?: boolean) {
  return prisma.supplier.findMany({
    where: {
      AND: [
        { is_deleted: false },
        search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] }
          : {},
        hasPayableOnly ? { current_payable_balance: { gt: 0 } } : {},
      ],
    },
    orderBy: { name: "asc" },
  });
}

export async function getSupplierProfile(supplier_id: string) {
  const [supplier, holds, receipts, payments] = await Promise.all([
    prisma.supplier.findUniqueOrThrow({ where: { id: supplier_id } }),
    prisma.supplierCylinderHold.findMany({ where: { supplier_id, quantity_with_supplier: { gt: 0 } }, include: { product: true } }),
    prisma.supplierReceipt.findMany({
      where: { supplier_id },
      include: { product: true, user: { select: { name: true } }, paid_from_account: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.supplierPayment.findMany({
      where: { supplier_id },
      include: { user: { select: { name: true } }, paid_from_account: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
  ]);
  return { supplier, cylinders_on_hold: holds, receipts, payments };
}

export interface CreateSupplierInput {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  user_id: string;
}

export async function createSupplier(input: CreateSupplierInput) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: { name: input.name, phone: input.phone, address: input.address, notes: input.notes },
    });
    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "Supplier", entity_id: supplier.id });
    return supplier;
  });
}

// Admin-only soft delete. Refuses if there's still an open payable balance or
// cylinders on hold, mirroring softDeleteCustomer's guard rails.
export async function softDeleteSupplier(supplier_id: string, user_id: string) {
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier_id } });
  if (Number(supplier.current_payable_balance) !== 0) {
    throw new Error("Cannot delete a supplier with an outstanding payable balance. Settle it first.");
  }
  const openHolds = await prisma.supplierCylinderHold.count({ where: { supplier_id, quantity_with_supplier: { gt: 0 } } });
  if (openHolds > 0) {
    throw new Error("Cannot delete a supplier with cylinders still on hold there.");
  }
  const updated = await prisma.supplier.update({ where: { id: supplier_id }, data: { is_deleted: true } });
  await prisma.auditLog.create({ data: { user_id, action: "DELETE", entity: "Supplier", entity_id: supplier_id, diff: { soft_deleted: true } } });
  return updated;
}

export interface SendCylindersToSupplierInput {
  supplier_id: string;
  product_id: string;
  quantity_sent: number;
  user_id: string;
  date?: string;
  note?: string;
}

// Client's own empty cylinders sent to a supplier for refill — stock leaves now,
// the hold at that supplier grows, and a later receipt reverses both.
export async function sendCylindersToSupplier(input: SendCylindersToSupplierInput) {
  return prisma.$transaction(async (tx) => {
    const hold = await tx.supplierCylinderHold.findUnique({
      where: { supplier_id_product_id: { supplier_id: input.supplier_id, product_id: input.product_id } },
    });
    const { newHoldQty } = applySupplierCylinderSend(hold?.quantity_with_supplier ?? 0, input.quantity_sent);

    const send = await tx.supplierCylinderSend.create({
      data: {
        supplier_id: input.supplier_id,
        product_id: input.product_id,
        quantity_sent: input.quantity_sent,
        date: input.date ? new Date(input.date) : undefined,
        note: input.note,
        user_id: input.user_id,
      },
    });

    if (hold) {
      await tx.supplierCylinderHold.update({ where: { id: hold.id }, data: { quantity_with_supplier: newHoldQty, date_last_sent: new Date() } });
    } else {
      await tx.supplierCylinderHold.create({
        data: { supplier_id: input.supplier_id, product_id: input.product_id, quantity_with_supplier: newHoldQty },
      });
    }

    await applyStockDelta(tx, {
      product_id: input.product_id,
      quantity: -input.quantity_sent,
      movement_type: StockMovementType.SUPPLIER_SEND_OUT,
      reference_type: "SUPPLIER_SEND",
      reference_id: send.id,
    });

    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "SupplierCylinderSend", entity_id: send.id, diff: { quantity_sent: input.quantity_sent } });
    return send;
  });
}

export async function listHoldsForSupplier(supplier_id: string) {
  return prisma.supplierCylinderHold.findMany({
    where: { supplier_id, quantity_with_supplier: { gt: 0 } },
    include: { product: true },
  });
}

// Every supplier's outstanding cylinder holds across the business — mirrors
// listAllOutstandingLoans() on the customer side.
export async function listAllSupplierHolds() {
  return prisma.supplierCylinderHold.findMany({
    where: { quantity_with_supplier: { gt: 0 } },
    include: { supplier: true, product: true },
    orderBy: { date_last_sent: "desc" },
  });
}

export interface RecordSupplierReceiptInput {
  supplier_id: string;
  product_id: string;
  refill_quantity: number;
  new_quantity: number;
  paid_now_amount: number;
  paid_from_account_id?: string;
  due_amount: number;
  total_amount: number;
  date?: string;
  note?: string;
  user_id: string;
}

// A delivery from a supplier — refilled cylinders coming back, brand-new cylinders,
// or both together. Both add to stock; only the refill portion draws down the
// cylinder hold. due_amount (if any) is "taking cylinders on credit" and adds to
// the supplier's payable balance.
export async function recordSupplierReceipt(input: RecordSupplierReceiptInput) {
  validatePaymentSplit(input.total_amount, input.paid_now_amount, input.due_amount);
  if (input.paid_now_amount > 0 && !input.paid_from_account_id) {
    throw new Error("paid_from_account_id is required when paid_now_amount > 0");
  }

  const effects = computeSupplierReceiptEffects(input.refill_quantity, input.new_quantity);

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.supplierReceipt.create({
      data: {
        supplier_id: input.supplier_id,
        product_id: input.product_id,
        refill_quantity: input.refill_quantity,
        new_quantity: input.new_quantity,
        total_amount: input.total_amount,
        paid_now_amount: input.paid_now_amount,
        paid_from_account_id: input.paid_from_account_id,
        due_amount: input.due_amount,
        note: input.note,
        date: input.date ? new Date(input.date) : undefined,
        user_id: input.user_id,
      },
    });

    // Stock: both refilled and new cylinders add to sellable stock.
    await applyStockDelta(tx, {
      product_id: input.product_id,
      quantity: effects.stockDelta,
      movement_type: StockMovementType.SUPPLIER_RECEIPT_IN,
      reference_type: "SUPPLIER_RECEIPT",
      reference_id: receipt.id,
    });

    // Hold: only the refilled portion reduces what's on hold at the supplier.
    if (effects.holdReduction > 0) {
      const hold = await tx.supplierCylinderHold.findUniqueOrThrow({
        where: { supplier_id_product_id: { supplier_id: input.supplier_id, product_id: input.product_id } },
      });
      const { newHoldQty } = applySupplierRefillReturn(hold.quantity_with_supplier, effects.holdReduction);
      await tx.supplierCylinderHold.update({ where: { id: hold.id }, data: { quantity_with_supplier: newHoldQty } });
    }

    // Payable: due_amount (if any) increases what the business owes this supplier.
    if (input.due_amount > 0) {
      const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplier_id } });
      const newBalance = applySupplierReceiptDue(Number(supplier.current_payable_balance), input.due_amount);
      await tx.supplier.update({ where: { id: input.supplier_id }, data: { current_payable_balance: newBalance } });
    }

    // Cash/bank ledger for whatever was paid to the supplier right now.
    if (input.paid_now_amount > 0 && input.paid_from_account_id) {
      await applyAccountLedgerEntry(tx, {
        account_id: input.paid_from_account_id,
        type: "OUT",
        amount: input.paid_now_amount,
        reference_type: "SUPPLIER_RECEIPT",
        reference_id: receipt.id,
      });
    }

    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "SupplierReceipt",
      entity_id: receipt.id,
      diff: { refill_quantity: input.refill_quantity, new_quantity: input.new_quantity, total_amount: input.total_amount },
    });

    return receipt;
  });
}

export interface RecordSupplierPaymentInput {
  supplier_id: string;
  amount: number;
  type: "ADVANCE" | "INSTALLMENT";
  paid_from_account_id: string;
  date?: string;
  note?: string;
  user_id: string;
}

// Money paid to a supplier — an advance or a month-by-month installment. Both
// reduce the payable balance the same way; `type` only affects the label.
export async function recordSupplierPayment(input: RecordSupplierPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: input.supplier_id } });
    const newBalance = applySupplierPayment(Number(supplier.current_payable_balance), input.amount);

    const payment = await tx.supplierPayment.create({
      data: {
        supplier_id: input.supplier_id,
        amount: input.amount,
        type: input.type,
        paid_from_account_id: input.paid_from_account_id,
        date: input.date ? new Date(input.date) : undefined,
        note: input.note,
        user_id: input.user_id,
      },
    });

    await tx.supplier.update({ where: { id: input.supplier_id }, data: { current_payable_balance: newBalance } });

    await applyAccountLedgerEntry(tx, {
      account_id: input.paid_from_account_id,
      type: "OUT",
      amount: input.amount,
      reference_type: "SUPPLIER_PAYMENT",
      reference_id: payment.id,
    });

    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "SupplierPayment", entity_id: payment.id, diff: { amount: input.amount, new_payable_balance: newBalance } });
    return payment;
  });
}

// Payable aging + totals report — mirrors receivablesAgingReport() on the customer side.
export async function supplierPayablesReport() {
  const suppliers = await prisma.supplier.findMany({ where: { current_payable_balance: { gt: 0 }, is_deleted: false } });
  const total_payable = suppliers.reduce((s, sup) => s + Number(sup.current_payable_balance), 0);
  return { total_payable, suppliers };
}

export async function supplierActivityReport(from?: string, to?: string) {
  const dateFilter = inclusiveDateRange(from, to);
  const [receipts, payments] = await Promise.all([
    prisma.supplierReceipt.findMany({ where: { date: dateFilter }, include: { supplier: true, product: true, user: { select: { name: true } } }, orderBy: { date: "desc" } }),
    prisma.supplierPayment.findMany({ where: { date: dateFilter }, include: { supplier: true, user: { select: { name: true } } }, orderBy: { date: "desc" } }),
  ]);
  const total_received_value = receipts.reduce((s, r) => s + Number(r.total_amount), 0);
  const total_paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  return { receipts, payments, total_received_value, total_paid };
}
