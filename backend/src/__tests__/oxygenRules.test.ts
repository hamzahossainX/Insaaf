import {
  applyCylinderReturn,
  applyDuePayment,
  applyDueCreation,
  validatePaymentSplit,
  computeSaleEffects,
  computePayroll,
  sumLineItems,
  BusinessRuleError,
} from "../domain/oxygenRules";

describe("Rule 3 — Cylinder return (worked example)", () => {
  it("10 on loan, return 5 -> stock +5, loan balance 10 -> 5", () => {
    const { newLoanQty, stockDelta } = applyCylinderReturn(10, 5);
    expect(newLoanQty).toBe(5);
    expect(stockDelta).toBe(5);
  });

  it("rejects returning more than what's on loan", () => {
    expect(() => applyCylinderReturn(10, 11)).toThrow(BusinessRuleError);
  });
});

describe("Rule 5 — Due payment (worked example)", () => {
  it("due 10, pay 5 -> due becomes 5", () => {
    const { newDueBalance, accountDelta } = applyDuePayment(10, 5);
    expect(newDueBalance).toBe(5);
    expect(accountDelta).toBe(5);
  });

  it("rejects payment greater than the due balance", () => {
    expect(() => applyDuePayment(10, 15)).toThrow(BusinessRuleError);
  });
});

describe("Rule 4 — Due creation", () => {
  it("increases customer due balance by due_amount", () => {
    expect(applyDueCreation(100, 50)).toBe(150);
  });
});

describe("Rule 6 — Payment split validation", () => {
  it("accepts a split that sums correctly", () => {
    expect(() => validatePaymentSplit(1000, 600, 400)).not.toThrow();
  });

  it("rejects a split that does not sum to total", () => {
    expect(() => validatePaymentSplit(1000, 600, 300)).toThrow(BusinessRuleError);
  });
});

describe("Rule 1 — Gas-only sale", () => {
  it("deducts stock AND increments a cylinder loan by quantity delivered", () => {
    const effects = computeSaleEffects("GAS_ONLY", [
      { product_id: "prod-o2-40l", quantity: 3, unit_price: 500 },
    ]);
    expect(effects.stockDeltas).toEqual([
      { product_id: "prod-o2-40l", quantity: -3 },
    ]);
    expect(effects.cylinderLoanDeltas).toEqual([
      { product_id: "prod-o2-40l", quantity: 3 },
    ]);
  });

  it("worked example: 20 in stock, order 1 gas-only -> stock 19, on-loan 1; return it -> stock 20, on-loan 0", () => {
    const saleEffects = computeSaleEffects("GAS_ONLY", [
      { product_id: "prod-o2-40l", quantity: 1, unit_price: 500 },
    ]);
    const stockAfterSale = 20 + saleEffects.stockDeltas[0].quantity;
    const loanAfterSale = 0 + saleEffects.cylinderLoanDeltas[0].quantity;
    expect(stockAfterSale).toBe(19);
    expect(loanAfterSale).toBe(1);

    const { newLoanQty, stockDelta } = applyCylinderReturn(loanAfterSale, 1);
    expect(stockAfterSale + stockDelta).toBe(20);
    expect(newLoanQty).toBe(0);
  });
});

describe("Rule 2 — Gas + cylinder sale", () => {
  it("permanently deducts stock and creates no cylinder loan", () => {
    const effects = computeSaleEffects("GAS_PLUS_CYLINDER", [
      { product_id: "prod-o2-40l", quantity: 2, unit_price: 3000 },
    ]);
    expect(effects.stockDeltas).toEqual([
      { product_id: "prod-o2-40l", quantity: -2 },
    ]);
    expect(effects.cylinderLoanDeltas).toEqual([]);
  });
});

describe("OTHER_ITEM — non-cylinder products sold from the catalog (e.g. a stove)", () => {
  it("permanently deducts stock, same as GAS_PLUS_CYLINDER, and never creates a cylinder loan", () => {
    const effects = computeSaleEffects("OTHER_ITEM", [
      { product_id: "prod-stove-1", quantity: 1, unit_price: 4500 },
    ]);
    expect(effects.stockDeltas).toEqual([
      { product_id: "prod-stove-1", quantity: -1 },
    ]);
    expect(effects.cylinderLoanDeltas).toEqual([]);
  });
});

describe("sumLineItems", () => {
  it("sums quantity * unit_price across line items", () => {
    expect(
      sumLineItems([
        { product_id: "a", quantity: 2, unit_price: 500 },
        { product_id: "b", quantity: 1, unit_price: 300 },
      ])
    ).toBe(1300);
  });
});

describe("Payroll — month-end computation (worked example)", () => {
  it("base 10,000, advance 5,000 mid-month -> net payable 5,000", () => {
    expect(computePayroll(10000, 0, 5000)).toBe(5000);
  });

  it("includes increments in the net payable", () => {
    expect(computePayroll(10000, 1000, 5000)).toBe(6000);
  });

  it("rejects a negative net payable", () => {
    expect(() => computePayroll(10000, 0, 15000)).toThrow(BusinessRuleError);
  });
});
