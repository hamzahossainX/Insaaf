import { Router } from "express";
import {
  salesReport,
  receivablesAgingReport,
  stockMovementReport,
  expensesReport,
  payrollReport,
  profitSummary,
  duePaymentsCollectedReport,
  recentActivity,
} from "../services/reports.service";
import { supplierPayablesReport, supplierActivityReport } from "../services/suppliers.service";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

function effectiveWing(req: any): string | undefined {
  return req.user.role === "MEMBER" ? req.user.wing_id ?? undefined : (req.query.wing_id as string | undefined);
}

reportsRouter.get("/sales", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  res.json(await salesReport(effectiveWing(req), from, to));
}));

reportsRouter.get("/receivables", asyncHandler(async (_req, res) => res.json(await receivablesAgingReport())));

reportsRouter.get("/due-collected", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  res.json(await duePaymentsCollectedReport(from, to));
}));

reportsRouter.get("/recent-activity", asyncHandler(async (req, res) => {
  const { limit } = req.query as Record<string, string | undefined>;
  res.json(await recentActivity(limit ? Number(limit) : undefined));
}));

reportsRouter.get("/stock", asyncHandler(async (req, res) => res.json(await stockMovementReport(effectiveWing(req)))));

reportsRouter.get("/expenses", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  res.json(await expensesReport(effectiveWing(req), from, to));
}));

reportsRouter.get("/payroll", asyncHandler(async (req, res) => {
  const { month } = req.query as Record<string, string | undefined>;
  res.json(await payrollReport(effectiveWing(req), month));
}));

reportsRouter.get("/profit-summary", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  res.json(await profitSummary(effectiveWing(req), from, to));
}));

reportsRouter.get("/supplier-payables", asyncHandler(async (_req, res) => res.json(await supplierPayablesReport())));

reportsRouter.get("/supplier-activity", asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  res.json(await supplierActivityReport(from, to));
}));
