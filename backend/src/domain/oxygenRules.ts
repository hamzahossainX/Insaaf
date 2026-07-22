/**
 * Pure, DB-independent implementations of Insaaf Oxygen business rules
 * (Build Prompt Section 3). Kept side-effect-free and unit-testable;
 * the service layer (src/services/*) wraps these in Prisma transactions
 * and persists the resulting ledger entries / derived balances.
 */

export type SaleType = "GAS_ONLY" | "GAS_PLUS_CYLINDER" | "CYLINDER_EXCHANGE" | "OTHER_ITEM";

export interface SaleLineItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export class BusinessRuleError extends Error {}

/** Rule 6: paid_now_amount + due_amount must equal total_amount. */
export function validatePaymentSplit(
  totalAmount: number,
  paidNowAmount: number,
  dueAmount: number
): void {
  // use integer cents to avoid floating point drift
  const total = Math.round(totalAmount * 100);
  const paid = Math.round(paidNowAmount * 100);
  const due = Math.round(dueAmount * 100);
  if (paid + due !== total) {
    throw new BusinessRuleError(
      `paid_now_amount (${paidNowAmount}) + due_amount (${dueAmount}) must equal total_amount (${totalAmount})`
    );
  }
  if (paid < 0 || due < 0) {
    throw new BusinessRuleError("paid_now_amount and due_amount must be non-negative");
  }
}

export function sumLineItems(lineItems: SaleLineItemInput[]): number {
  return round2(lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0));
}

export interface SaleEffects {
<<<<<<< HEAD
  /** Per-product stock deltas (negative = deducted from stock). Every sale type deducts stock
   * the moment the cylinder/item leaves the premises — including GAS_ONLY, since the cylinder
   * is physically gone from stock even though it's expected back. */
  stockDeltas: { product_id: string; quantity: number }[];
  /** Per-product cylinder-loan increments to apply for this customer. Only set for GAS_ONLY. */
=======
  /** Per-product stock deltas (negative = deducted from stock). Empty for GAS_ONLY. */
  stockDeltas: { product_id: string; quantity: number }[];
  /** Per-product cylinder-loan increments to apply for this customer. Empty unless GAS_ONLY. */
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
  cylinderLoanDeltas: { product_id: string; quantity: number }[];
}

/**
 * Rules 1 & 2:
<<<<<<< HEAD
 *  - GAS_ONLY: deducts stock per SKU (the cylinder leaves the premises), AND increments
 *    CylinderLoan by qty delivered — e.g. 20 in stock, order 1 gas-only → stock 19, on-loan 1.
 *    Returning it later (Rule 3) adds stock back and clears the loan — e.g. stock 19 + 1 = 20,
 *    on-loan 1 - 1 = 0.
=======
 *  - GAS_ONLY: no stock deduction; increments CylinderLoan by qty delivered per SKU.
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
 *  - GAS_PLUS_CYLINDER: permanently deducts stock per SKU; no CylinderLoan created.
 *  - CYLINDER_EXCHANGE: treated like GAS_PLUS_CYLINDER for stock purposes (cylinder
 *    changes hands permanently as part of the exchange transaction) — no loan.
 *  - OTHER_ITEM: non-cylinder products (e.g. a stove), selected from the Product catalog
 *    just like gas items. Behaves exactly like GAS_PLUS_CYLINDER — permanent stock
 *    deduction, no cylinder loan — since these items never come back once sold.
 */
export function computeSaleEffects(
  saleType: SaleType,
  lineItems: SaleLineItemInput[]
): SaleEffects {
<<<<<<< HEAD
  // Every sale type deducts stock the moment the item leaves the premises.
  const stockDeltas = lineItems.map((li) => ({
    product_id: li.product_id,
    quantity: -li.quantity,
  }));

  if (saleType === "GAS_ONLY") {
    return {
      stockDeltas,
=======
  if (saleType === "GAS_ONLY") {
    return {
      stockDeltas: [],
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
      cylinderLoanDeltas: lineItems.map((li) => ({
        product_id: li.product_id,
        quantity: li.quantity,
      })),
    };
  }
<<<<<<< HEAD
  // GAS_PLUS_CYLINDER / CYLINDER_EXCHANGE / OTHER_ITEM — no loan, cylinder never expected back.
  return { stockDeltas, cylinderLoanDeltas: [] };
=======
  // GAS_PLUS_CYLINDER / CYLINDER_EXCHANGE / OTHER_ITEM
  return {
    stockDeltas: lineItems.map((li) => ({
      product_id: li.product_id,
      quantity: -li.quantity,
    })),
    cylinderLoanDeltas: [],
  };
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
}

/**
 * Rule 3: Cylinder return increases stock and decreases the customer's loan balance
 * by the same quantity. Worked example: loan 10 -> return 5 -> stock +5, loan 5.
 */
export function applyCylinderReturn(
  currentLoanQty: number,
  returnQty: number
): { newLoanQty: number; stockDelta: number } {
  if (returnQty <= 0) {
    throw new BusinessRuleError("returnQty must be positive");
  }
  if (returnQty > currentLoanQty) {
    throw new BusinessRuleError(
      `Cannot return ${returnQty} cylinders; only ${currentLoanQty} are on loan`
    );
  }
  return { newLoanQty: currentLoanQty - returnQty, stockDelta: returnQty };
}

/**
 * Rule 4: any sale with due_amount > 0 increases Customer.current_due_balance by that amount.
 */
export function applyDueCreation(currentDueBalance: number, dueAmount: number): number {
  if (dueAmount < 0) throw new BusinessRuleError("dueAmount must be non-negative");
  return round2(currentDueBalance + dueAmount);
}

/**
 * Rule 5: Due payment decreases due balance and increases account balance by the same
 * amount. Worked example: due 10 -> pay 5 -> due 5.
 */
export function applyDuePayment(
  currentDueBalance: number,
  paymentAmount: number
): { newDueBalance: number; accountDelta: number } {
  if (paymentAmount <= 0) {
    throw new BusinessRuleError("paymentAmount must be positive");
  }
  if (paymentAmount > currentDueBalance) {
    throw new BusinessRuleError(
      `Payment (${paymentAmount}) exceeds current due balance (${currentDueBalance})`
    );
  }
  return {
    newDueBalance: round2(currentDueBalance - paymentAmount),
    accountDelta: paymentAmount,
  };
}

/**
 * Payroll month-end computation.
 * Worked example: base 10,000 + advance 5,000 taken mid-month -> net payable 5,000.
 */
export function computePayroll(
  baseSalary: number,
  incrementAmount: number,
  totalAdvances: number
): number {
  const net = round2(baseSalary + incrementAmount - totalAdvances);
  if (net < 0) {
    throw new BusinessRuleError(
      `Computed net payable (${net}) is negative — advances exceed salary + increment`
    );
  }
  return net;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
