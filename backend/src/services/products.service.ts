import { StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyStockDelta } from "./sales.service";

export async function listProducts(wing_id?: string) {
  const products = await prisma.product.findMany({
    where: { wing_id, is_deleted: false },
    orderBy: [{ category: "asc" }, { size_variant: "asc" }],
  });
  // "Due count" — total cylinders of this SKU currently out on loan with customers,
  // expected back via Cylinder Returns. Computed, not stored, per the golden rule.
  const loanTotals = await prisma.cylinderLoan.groupBy({
    by: ["product_id"],
    where: { product_id: { in: products.map((p) => p.id) }, quantity_on_loan: { gt: 0 } },
    _sum: { quantity_on_loan: true },
  });
  const loanByProduct = new Map(loanTotals.map((l) => [l.product_id, l._sum.quantity_on_loan ?? 0]));
  return products.map((p) => ({ ...p, cylinders_due_back: loanByProduct.get(p.id) ?? 0 }));
}

export async function getProductLedger(product_id: string) {
  return prisma.stockLedgerEntry.findMany({ where: { product_id }, orderBy: { date: "desc" } });
}

export interface CreateProductInput {
  wing_id: string;
  category: string;
  brand?: string;
  size_variant: string;
  unit_cost_price: number;
  unit_sale_price: number;
  reorder_level?: number;
  opening_stock_qty?: number;
  is_returnable?: boolean; // false for non-cylinder items (e.g. a stove) sold via OTHER_ITEM
  user_id: string;
}

/** Admin-only. Creates the SKU and, if given, an opening-stock ledger entry. */
export async function createProduct(input: CreateProductInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        wing_id: input.wing_id,
        category: input.category,
        brand: input.brand,
        size_variant: input.size_variant,
        unit_cost_price: input.unit_cost_price,
        unit_sale_price: input.unit_sale_price,
        reorder_level: input.reorder_level ?? 0,
        is_returnable: input.is_returnable ?? true,
        current_stock_qty: 0,
      },
    });

    if (input.opening_stock_qty && input.opening_stock_qty > 0) {
      await applyStockDelta(tx, {
        product_id: product.id,
        quantity: input.opening_stock_qty,
        movement_type: StockMovementType.PURCHASE_IN,
        reference_type: "OPENING_STOCK",
        reference_id: product.id,
      });
    }

    await writeAuditLog(tx, { user_id: input.user_id, action: "CREATE", entity: "Product", entity_id: product.id });
    return product;
  });
}

export interface StockInInput {
  product_id: string;
  quantity: number;
  user_id: string;
  note?: string;
}

/** "Stock In" form (Screen 6). */
export async function stockIn(input: StockInInput) {
  return prisma.$transaction(async (tx) => {
    await applyStockDelta(tx, {
      product_id: input.product_id,
      quantity: input.quantity,
      movement_type: StockMovementType.PURCHASE_IN,
      reference_type: "PURCHASE",
      reference_id: input.product_id,
    });
    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "StockLedgerEntry",
      entity_id: input.product_id,
      diff: { quantity: input.quantity, note: input.note },
    });
  });
}

export async function updateProduct(product_id: string, user_id: string, data: Partial<{
  category: string; brand: string; size_variant: string; unit_cost_price: number; unit_sale_price: number; reorder_level: number;
}>) {
  const product = await prisma.product.update({ where: { id: product_id }, data });
  await prisma.auditLog.create({ data: { user_id, action: "UPDATE", entity: "Product", entity_id: product_id, diff: data } });
  return product;
}

/**
 * Soft-delete only, per the shared rule: deletes on financial/stock records never hard-delete.
 * Refuses to delete a SKU that still has stock on hand or cylinders out on loan, since that
 * would silently orphan inventory that's still real and owed back.
 */
export async function softDeleteProduct(product_id: string, user_id: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: product_id } });
  if (product.current_stock_qty > 0) {
    throw new Error("Cannot delete a product that still has stock on hand. Adjust stock to zero first.");
  }
  const openLoans = await prisma.cylinderLoan.count({ where: { product_id, quantity_on_loan: { gt: 0 } } });
  if (openLoans > 0) {
    throw new Error("Cannot delete a product with cylinders still on loan to customers.");
  }
  const updated = await prisma.product.update({ where: { id: product_id }, data: { is_deleted: true } });
  await prisma.auditLog.create({ data: { user_id, action: "DELETE", entity: "Product", entity_id: product_id, diff: { soft_deleted: true } } });
  return updated;
}
