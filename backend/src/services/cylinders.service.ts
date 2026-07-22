import { StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyCylinderReturn } from "../domain/oxygenRules";
import { applyStockDelta } from "./sales.service";

export interface RecordCylinderReturnInput {
  customer_id: string;
  product_id: string;
  quantity_returned: number;
  user_id: string;
  date?: string;
  note?: string;
}

/**
 * Rule 3: increases stock via StockLedgerEntry(CYLINDER_RETURN_IN) by the returned
 * quantity, and decreases the customer's CylinderLoan balance by the same quantity.
 */
export async function recordCylinderReturn(input: RecordCylinderReturnInput) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.cylinderLoan.findUnique({
      where: { customer_id_product_id: { customer_id: input.customer_id, product_id: input.product_id } },
    });
    if (!loan) {
      throw new Error("No cylinder loan found for this customer/product");
    }

    const { newLoanQty, stockDelta } = applyCylinderReturn(loan.quantity_on_loan, input.quantity_returned);

    const cylinderReturn = await tx.cylinderReturn.create({
      data: {
        customer_id: input.customer_id,
        product_id: input.product_id,
        quantity_returned: input.quantity_returned,
        linked_loan_id: loan.id,
        date: input.date ? new Date(input.date) : undefined,
        note: input.note || undefined,
      },
    });

    await tx.cylinderLoan.update({ where: { id: loan.id }, data: { quantity_on_loan: newLoanQty } });

    await applyStockDelta(tx, {
      product_id: input.product_id,
      quantity: stockDelta,
      movement_type: StockMovementType.CYLINDER_RETURN_IN,
      reference_type: "CYLINDER_RETURN",
      reference_id: cylinderReturn.id,
    });

    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "CylinderReturn",
      entity_id: cylinderReturn.id,
      diff: { quantity_returned: input.quantity_returned, new_loan_qty: newLoanQty },
    });

    return cylinderReturn;
  });
}

export async function listLoansForCustomer(customer_id: string) {
  return prisma.cylinderLoan.findMany({
    where: { customer_id, quantity_on_loan: { gt: 0 } },
    include: { product: true },
  });
}

/**
 * All outstanding cylinder loans across every customer — who took what, when, how much is
 * still out, how much has already been returned against that loan, and whether that
 * customer's account is settled (due balance) or not. Powers the Cylinder Returns overview.
 */
export async function listAllOutstandingLoans() {
  const loans = await prisma.cylinderLoan.findMany({
    where: { quantity_on_loan: { gt: 0 } },
    include: { customer: true, product: true },
    orderBy: { date_issued: "desc" },
  });

  const loanIds = loans.map((l) => l.id);
  const returns = await prisma.cylinderReturn.groupBy({
    by: ["linked_loan_id"],
    where: { linked_loan_id: { in: loanIds } },
    _sum: { quantity_returned: true },
  });
  const returnedByLoan = new Map(returns.map((r) => [r.linked_loan_id, r._sum.quantity_returned ?? 0]));

  return loans.map((l) => {
    const returnedSoFar = returnedByLoan.get(l.id) ?? 0;
    return {
      ...l,
      quantity_returned_so_far: returnedSoFar,
      quantity_originally_taken: l.quantity_on_loan + returnedSoFar,
    };
  });
}
