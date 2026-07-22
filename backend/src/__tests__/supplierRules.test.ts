import {
  computeSupplierReceiptEffects,
  applySupplierRefillReturn,
  applySupplierCylinderSend,
  applySupplierReceiptDue,
  applySupplierPayment,
} from "../domain/supplierRules";
import { BusinessRuleError } from "../domain/oxygenRules";

describe("Supplier receipt effects — refill + new cylinders in one delivery", () => {
  it("refill only: adds to stock, reduces the hold by the same amount", () => {
    const effects = computeSupplierReceiptEffects(6, 0);
    expect(effects.stockDelta).toBe(6);
    expect(effects.holdReduction).toBe(6);
  });

  it("new only: adds to stock, does not touch the hold", () => {
    const effects = computeSupplierReceiptEffects(0, 10);
    expect(effects.stockDelta).toBe(10);
    expect(effects.holdReduction).toBe(0);
  });

  it("refill AND new together (client's exact scenario): both add to stock, only refill reduces the hold", () => {
    const effects = computeSupplierReceiptEffects(6, 4);
    expect(effects.stockDelta).toBe(10);
    expect(effects.holdReduction).toBe(6);
  });

  it("rejects a receipt with nothing in it", () => {
    expect(() => computeSupplierReceiptEffects(0, 0)).toThrow(BusinessRuleError);
  });
});

describe("Supplier cylinder hold — send empties out, receive refills back", () => {
  it("worked example: send 10 empties -> hold 10; receive 6 refilled -> hold 4", () => {
    const { newHoldQty: afterSend } = applySupplierCylinderSend(0, 10);
    expect(afterSend).toBe(10);

    const { newHoldQty: afterRefill } = applySupplierRefillReturn(afterSend, 6);
    expect(afterRefill).toBe(4);
  });

  it("rejects receiving more refilled cylinders than are on hold", () => {
    expect(() => applySupplierRefillReturn(4, 5)).toThrow(BusinessRuleError);
  });
});

describe("Supplier payable balance — advances and month-by-month installments", () => {
  it("client's worked example: 10 lac owed, pay 1 lac then 2 lac", () => {
    const afterReceipt = applySupplierReceiptDue(0, 1000000);
    expect(afterReceipt).toBe(1000000);

    const afterMonth1 = applySupplierPayment(afterReceipt, 100000);
    expect(afterMonth1).toBe(900000);

    const afterMonth2 = applySupplierPayment(afterMonth1, 200000);
    expect(afterMonth2).toBe(700000);
  });

  it("an advance paid before any receipt exists pushes the balance negative (prepaid credit)", () => {
    const afterAdvance = applySupplierPayment(0, 50000);
    expect(afterAdvance).toBe(-50000);

    // A later receipt's due draws the prepaid credit back down toward zero.
    const afterReceipt = applySupplierReceiptDue(afterAdvance, 30000);
    expect(afterReceipt).toBe(-20000);
  });

  it("rejects a non-positive payment amount", () => {
    expect(() => applySupplierPayment(1000, 0)).toThrow(BusinessRuleError);
    expect(() => applySupplierPayment(1000, -5)).toThrow(BusinessRuleError);
  });
});
