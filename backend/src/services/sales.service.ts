import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { inclusiveDateRange } from "../lib/dateRange";
import {
  computeSaleEffects,
  sumLineItems,
  validatePaymentSplit,
  applyDueCreation,
  SaleLineItemInput,
  SaleType,
} from "../domain/oxygenRules";

export interface CreateSaleInput {
  wing_id: string;
  customer_id: string;
  user_id: string;
  sale_type: SaleType;
  line_items: SaleLineItemInput[];
  paid_now_amount: number;
  paid_into_account_id?: string;
  due_amount: number;
  date?: string;
  delivery_employee_id?: string;
}

export async function createSale(input: CreateSaleInput) {
  const totalAmount = sumLineItems(input.line_items);
  validatePaymentSplit(totalAmount, input.paid_now_amount, input.due_amount);

  if (input.paid_now_amount > 0 && !input.paid_into_account_id) {
    throw new Error("paid_into_account_id is required when paid_now_amount > 0");
  }

  const effects = computeSaleEffects(input.sale_type, input.line_items);

  return prisma.$transaction(async (tx) => {
    // 1. Create the sale + line items
    const sale = await tx.sale.create({
      data: {
        wing_id: input.wing_id,
        customer_id: input.customer_id,
        user_id: input.user_id,
        sale_type: input.sale_type,
        total_amount: totalAmount,
        paid_now_amount: input.paid_now_amount,
        paid_into_account_id: input.paid_into_account_id,
        due_amount: input.due_amount,
        stock_deducted: effects.stockDeltas.length > 0,
        date: input.date ? new Date(input.date) : undefined,
        delivery_employee_id: input.delivery_employee_id || undefined,
        line_items: {
          create: input.line_items.map((li) => ({
            product_id: li.product_id,
            quantity: li.quantity,
            unit_price: li.unit_price,
            subtotal: li.quantity * li.unit_price,
          })),
        },
      },
      include: { line_items: true },
    });

    // 2. Stock ledger for sold/delivered items, including gas-only cylinders held by customers
    for (const delta of effects.stockDeltas) {
      await applyStockDelta(tx, {
        product_id: delta.product_id,
        quantity: delta.quantity,
        movement_type: StockMovementType.SALE_OUT,
        reference_type: "SALE",
        reference_id: sale.id,
      });
    }

    // 3. Cylinder loans/on-hold quantities for gas-only deliveries (Rule 1)
    for (const delta of effects.cylinderLoanDeltas) {
      const existing = await tx.cylinderLoan.findUnique({
        where: { customer_id_product_id: { customer_id: input.customer_id, product_id: delta.product_id } },
      });
      if (existing) {
        await tx.cylinderLoan.update({
          where: { id: existing.id },
          data: { quantity_on_loan: existing.quantity_on_loan + delta.quantity, linked_sale_id: sale.id },
        });
      } else {
        await tx.cylinderLoan.create({
          data: {
            customer_id: input.customer_id,
            product_id: delta.product_id,
            quantity_on_loan: delta.quantity,
            linked_sale_id: sale.id,
          },
        });
      }
    }

    // 4. Due creation (Rule 4) — derived Customer.current_due_balance
    if (input.due_amount > 0) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customer_id } });
      const newDue = applyDueCreation(Number(customer.current_due_balance), input.due_amount);
      await tx.customer.update({ where: { id: input.customer_id }, data: { current_due_balance: newDue } });
    }

    // 5. Cash/bank/bKash ledger + derived Account.current_balance for the amount paid now
    if (input.paid_now_amount > 0 && input.paid_into_account_id) {
      await applyAccountLedgerEntry(tx, {
        account_id: input.paid_into_account_id,
        type: "IN",
        amount: input.paid_now_amount,
        reference_type: "SALE",
        reference_id: sale.id,
      });
    }

    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "Sale",
      entity_id: sale.id,
      diff: { total_amount: totalAmount, sale_type: input.sale_type },
    });

    return sale;
  });
}

/** Shared helper: appends a StockLedgerEntry and updates Product.current_stock_qty (derived). */
export async function applyStockDelta(
  tx: Prisma.TransactionClient,
  params: {
    product_id: string;
    quantity: number; // signed
    movement_type: StockMovementType;
    reference_type: string;
    reference_id: string;
  }
) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: params.product_id } });
  const resultingBalance = product.current_stock_qty + params.quantity;
  if (resultingBalance < 0) {
    throw new Error(`Insufficient stock for product ${params.product_id}`);
  }
  await tx.stockLedgerEntry.create({
    data: {
      product_id: params.product_id,
      movement_type: params.movement_type,
      quantity: params.quantity,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      resulting_balance: resultingBalance,
    },
  });
  await tx.product.update({ where: { id: params.product_id }, data: { current_stock_qty: resultingBalance } });
}

/** Shared helper: appends an AccountLedgerEntry and updates Account.current_balance (derived). */
export async function applyAccountLedgerEntry(
  tx: Prisma.TransactionClient,
  params: {
    account_id: string;
    type: "IN" | "OUT" | "TRANSFER";
    amount: number;
    reference_type: string;
    reference_id: string;
  }
) {
  const account = await tx.account.findUniqueOrThrow({ where: { id: params.account_id } });
  const signedAmount = params.type === "OUT" ? -params.amount : params.amount;
  const resultingBalance = Number(account.current_balance) + signedAmount;
  if (resultingBalance < 0) {
    throw new Error(`Insufficient balance in account ${params.account_id}`);
  }
  await tx.accountLedgerEntry.create({
    data: {
      account_id: params.account_id,
      type: params.type,
      amount: params.amount,
      reference_type: params.reference_type,
      reference_id: params.reference_id,
      resulting_balance: resultingBalance,
    },
  });
  await tx.account.update({ where: { id: params.account_id }, data: { current_balance: resultingBalance } });
}

export async function listSales(filters: { wing_id?: string; customer_id?: string; from?: string; to?: string }) {
  return prisma.sale.findMany({
    where: {
      wing_id: filters.wing_id,
      customer_id: filters.customer_id,
      date: inclusiveDateRange(filters.from, filters.to),
    },
    include: { line_items: { include: { product: true } }, customer: true, delivery_employee: true },
    orderBy: { date: "desc" },
  });
}
