import { Router } from "express";
import { z } from "zod";
import { listAccounts, getAccountLedger, createAccount, transferBetweenAccounts, deactivateAccount } from "../services/accounts.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

accountsRouter.get("/", asyncHandler(async (_req, res) => res.json(await listAccounts())));

accountsRouter.get(
  "/:id/ledger",
  asyncHandler(async (req, res) => res.json(await getAccountLedger(req.params.id)))
);

const createAccountSchema = z.object({ name: z.string().min(1), type: z.string().min(1), opening_balance: z.number().nonnegative().default(0) });

accountsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createAccountSchema.parse(req.body);
    res.status(201).json(await createAccount(body.name, body.type, body.opening_balance, req.user!.sub));
  })
);

accountsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await deactivateAccount(req.params.id, req.user!.sub));
  })
);

const transferSchema = z.object({ from_account_id: z.string(), to_account_id: z.string(), amount: z.number().positive() });

accountsRouter.post(
  "/transfer",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = transferSchema.parse(req.body);
    await transferBetweenAccounts({ ...body, user_id: req.user!.sub });
    res.status(201).json({ ok: true });
  })
);
