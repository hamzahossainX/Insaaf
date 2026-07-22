import { Router } from "express";
import { z } from "zod";
import { giveEmployeeLoan, receiveLoanRepayment, getEmployeeLoanSummary, loansAndAdvancesReport } from "../services/employeeLoans.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const employeeLoansRouter = Router();
employeeLoansRouter.use(requireAuth);

const giveLoanSchema = z.object({
  employee_id: z.string(),
  amount: z.number().positive(),
  paid_from_account_id: z.string(),
  note: z.string().optional(),
  date: z.string().optional(),
});

// Giving money to an employee is sensitive — Admin only, same as Advance/Increment.
employeeLoansRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = giveLoanSchema.parse(req.body);
    res.status(201).json(await giveEmployeeLoan({ ...body, user_id: req.user!.sub }));
  })
);

const repaymentSchema = z.object({
  employee_id: z.string(),
  amount: z.number().positive(),
  received_into_account_id: z.string(),
  date: z.string().optional(),
<<<<<<< HEAD
  note: z.string().optional(),
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
});

employeeLoansRouter.post(
  "/repayments",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = repaymentSchema.parse(req.body);
    res.status(201).json(await receiveLoanRepayment({ ...body, user_id: req.user!.sub }));
  })
);

employeeLoansRouter.get(
  "/employee/:employee_id",
  asyncHandler(async (req, res) => {
    res.json(await getEmployeeLoanSummary(req.params.employee_id));
  })
);

employeeLoansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string | undefined>;
    res.json(await loansAndAdvancesReport(from, to));
  })
);
