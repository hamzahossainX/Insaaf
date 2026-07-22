import { prisma } from "../lib/prisma";
import { writeAuditLog } from "../lib/audit";
import { applyAccountLedgerEntry } from "./sales.service";

export async function listAccounts() {
  return prisma.account.findMany({ where: { is_active: true }, orderBy: { name: "asc" } });
}

/** Admin-only deactivate. Refuses if the account still holds a balance, since that money
 * needs to be transferred out first rather than silently hidden. */
export async function deactivateAccount(account_id: string, user_id: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: account_id } });
  if (Number(account.current_balance) !== 0) {
    throw new Error("Cannot remove an account with a non-zero balance. Transfer the balance out first.");
  }
  const updated = await prisma.account.update({ where: { id: account_id }, data: { is_active: false } });
  await prisma.auditLog.create({ data: { user_id, action: "DELETE", entity: "Account", entity_id: account_id, diff: { deactivated: true } } });
  return updated;
}

export async function getAccountLedger(account_id: string) {
  return prisma.accountLedgerEntry.findMany({ where: { account_id }, orderBy: { date: "desc" } });
}

export async function createAccount(name: string, type: string, opening_balance: number, user_id: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({ data: { name, type, current_balance: opening_balance, note: note || undefined } });
    if (opening_balance > 0) {
      await tx.accountLedgerEntry.create({
        data: {
          account_id: account.id,
          type: "IN",
          amount: opening_balance,
          reference_type: "OPENING_BALANCE",
          reference_id: account.id,
          resulting_balance: opening_balance,
        },
      });
    }
    await writeAuditLog(tx, { user_id, action: "CREATE", entity: "Account", entity_id: account.id });
    return account;
  });
}

export interface TransferInput {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  user_id: string;
}

/** Internal transfer between two accounts (Screen 7). */
export async function transferBetweenAccounts(input: TransferInput) {
  if (input.from_account_id === input.to_account_id) {
    throw new Error("Cannot transfer to the same account");
  }
  return prisma.$transaction(async (tx) => {
    await applyAccountLedgerEntry(tx, {
      account_id: input.from_account_id,
      type: "OUT",
      amount: input.amount,
      reference_type: "TRANSFER_OUT",
      reference_id: input.to_account_id,
    });
    await applyAccountLedgerEntry(tx, {
      account_id: input.to_account_id,
      type: "IN",
      amount: input.amount,
      reference_type: "TRANSFER_IN",
      reference_id: input.from_account_id,
    });

    await writeAuditLog(tx, {
      user_id: input.user_id,
      action: "CREATE",
      entity: "AccountTransfer",
      entity_id: `${input.from_account_id}->${input.to_account_id}`,
      diff: { amount: input.amount },
    });
  });
}
