/**
 * Pure, DB-independent business rules for the Supplier module — the mirror image of
 * the Customer/CylinderLoan/DuePayment rules in oxygenRules.ts, but for what the
 * business owes a supplier rather than what a customer owes the business.
 */
import { BusinessRuleError } from "./oxygenRules";

export interface SupplierReceiptEffects {
  /** Total stock added — refilled returns AND brand-new units both add to sellable stock. */
  stockDelta: number;
  /** How much to reduce the SupplierCylinderHold by (only the refilled portion). */
  holdReduction: number;
}

/**
 * A supplier receipt can carry refilled cylinders coming back, brand-new cylinders,
 * or both in the same delivery. Both quantities add to stock; only the refill
 * portion reduces what's on hold at the supplier.
 */
export function computeSupplierReceiptEffects(
  refillQuantity: number,
  newQuantity: number
): SupplierReceiptEffects {
  if (refillQuantity < 0 || newQuantity < 0) {
    throw new BusinessRuleError("refill_quantity and new_quantity must be non-negative");
  }
  if (refillQuantity === 0 && newQuantity === 0) {
    throw new BusinessRuleError("A supplier receipt needs at least one refilled or new cylinder");
  }
  return { stockDelta: refillQuantity + newQuantity, holdReduction: refillQuantity };
}

/**
 * Rule: refilled quantity on a receipt can't exceed what's actually on hold at that
 * supplier for that product — mirrors applyCylinderReturn's guard against
 * over-returning. Worked example: 10 empties sent to supplier, 6 come back refilled
 * -> hold goes 10 -> 4.
 */
export function applySupplierRefillReturn(
  currentHoldQty: number,
  refillQuantity: number
): { newHoldQty: number } {
  if (refillQuantity > currentHoldQty) {
    throw new BusinessRuleError(
      `Cannot receive ${refillQuantity} refilled cylinders; only ${currentHoldQty} are on hold at this supplier`
    );
  }
  return { newHoldQty: currentHoldQty - refillQuantity };
}

/** Sending empty cylinders to a supplier increases what's on hold there. */
export function applySupplierCylinderSend(currentHoldQty: number, sendQuantity: number): { newHoldQty: number } {
  if (sendQuantity <= 0) {
    throw new BusinessRuleError("sendQuantity must be positive");
  }
  return { newHoldQty: currentHoldQty + sendQuantity };
}

/** A receipt's due_amount increases what the business owes the supplier — same
 * shape as applyDueCreation, but for the payable side. */
export function applySupplierReceiptDue(currentPayableBalance: number, dueAmount: number): number {
  if (dueAmount < 0) throw new BusinessRuleError("dueAmount must be non-negative");
  return round2(currentPayableBalance + dueAmount);
}

/**
 * Paying a supplier (advance or installment) always reduces the payable balance —
 * unlike a customer due payment, this is intentionally NOT capped at the current
 * balance: an advance paid before any receipt exists is expected to push the
 * balance negative (a prepaid credit that future receipts draw down first).
 * Worked example: supplier owed 10,00,000 (10 lac); pay 1,00,000 (1 lac) this
 * month -> payable 9,00,000; pay 2,00,000 next month -> payable 7,00,000.
 */
export function applySupplierPayment(currentPayableBalance: number, amount: number): number {
  if (amount <= 0) {
    throw new BusinessRuleError("amount must be positive");
  }
  return round2(currentPayableBalance - amount);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
