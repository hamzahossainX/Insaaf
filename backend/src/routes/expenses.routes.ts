import { Router } from "express";
import { z } from "zod";
import { createExpense, listExpenses, softDeleteExpense } from "../services/expenses.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin, scopeToOwnWing } from "../middleware/auth";

export const expensesRouter = Router();
expensesRouter.use(requireAuth);

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { wing_id, category, from, to } = req.query as Record<string, string | undefined>;
    const effectiveWing = req.user!.role === "MEMBER" ? req.user!.wing_id ?? undefined : wing_id;
    res.json(await listExpenses({ wing_id: effectiveWing, category, from, to }));
  })
);

const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  paid_from_account_id: z.string(),
  wing_id: z.string().optional(),
  note: z.string().optional(),
  attachment_url: z.string().optional(),
  date: z.string().optional(),
});

expensesRouter.post(
  "/",
  scopeToOwnWing,
  asyncHandler(async (req, res) => {
    const body = createExpenseSchema.parse(req.body);
    res.status(201).json(await createExpense({ ...body, user_id: req.user!.sub }));
  })
);

expensesRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await softDeleteExpense(req.params.id, req.user!.sub));
  })
);
