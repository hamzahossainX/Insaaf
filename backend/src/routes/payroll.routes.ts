import { Router } from "express";
import { z } from "zod";
import {
  listEmployees,
  getEmployeeProfile,
  addSalaryAdvance,
  addSalaryIncrement,
  previewMonthEndPayroll,
  runMonthEndPayroll,
  deactivateEmployee,
} from "../services/payroll.service";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../lib/audit";

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

payrollRouter.get(
  "/employees",
  asyncHandler(async (req, res) => {
    const wing_id = req.user!.role === "MEMBER" ? req.user!.wing_id ?? undefined : (req.query.wing_id as string | undefined);
    res.json(await listEmployees(wing_id));
  })
);

payrollRouter.get(
  "/employees/:id",
  asyncHandler(async (req, res) => res.json(await getEmployeeProfile(req.params.id)))
);

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  wing_id: z.string(),
  base_salary: z.number().nonnegative(),
  join_date: z.string(),
<<<<<<< HEAD
  note: z.string().optional(),
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
});

payrollRouter.post(
  "/employees",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createEmployeeSchema.parse(req.body);
    const employee = await prisma.$transaction(async (tx) => {
      const e = await tx.employee.create({ data: { ...body, join_date: new Date(body.join_date) } });
      await writeAuditLog(tx, { user_id: req.user!.sub, action: "CREATE", entity: "Employee", entity_id: e.id });
      return e;
    });
    res.status(201).json(employee);
  })
);

payrollRouter.delete(
  "/employees/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await deactivateEmployee(req.params.id, req.user!.sub));
  })
);

const advanceSchema = z.object({
  employee_id: z.string(),
  amount: z.number().positive(),
  paid_from_account_id: z.string(),
  month_applied_to: z.string(),
<<<<<<< HEAD
  note: z.string().optional(),
=======
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
});

// Admin only, per Screen 9 ("Add Advance", "Add Increment" — Admin only).
payrollRouter.post(
  "/advances",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = advanceSchema.parse(req.body);
    res.status(201).json(await addSalaryAdvance({ ...body, user_id: req.user!.sub }));
  })
);

const incrementSchema = z.object({
  employee_id: z.string(),
  type: z.enum(["ONE_TIME_BONUS", "PERMANENT_RAISE"]),
  amount_or_new_base: z.number().nonnegative(),
  effective_month: z.string(),
  note: z.string().optional(),
});

payrollRouter.post(
  "/increments",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = incrementSchema.parse(req.body);
    res.status(201).json(await addSalaryIncrement({ ...body, user_id: req.user!.sub }));
  })
);

payrollRouter.get(
  "/preview",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { employee_id, month } = req.query as Record<string, string>;
    res.json(await previewMonthEndPayroll(employee_id, month));
  })
);

<<<<<<< HEAD
const runPayrollSchema = z.object({ employee_id: z.string(), month: z.string(), paid_from_account_id: z.string(), note: z.string().optional() });
=======
const runPayrollSchema = z.object({ employee_id: z.string(), month: z.string(), paid_from_account_id: z.string() });
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac

payrollRouter.post(
  "/run",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = runPayrollSchema.parse(req.body);
    res.status(201).json(await runMonthEndPayroll({ ...body, user_id: req.user!.sub }));
  })
);
