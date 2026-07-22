import { Router } from "express";
import { z } from "zod";
import {
  listSuppliers,
  getSupplierProfile,
  createSupplier,
  softDeleteSupplier,
  sendCylindersToSupplier,
  listHoldsForSupplier,
  listAllSupplierHolds,
  recordSupplierReceipt,
  recordSupplierPayment,
} from "../services/suppliers.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, has_payable } = req.query as Record<string, string | undefined>;
    res.json(await listSuppliers(search, has_payable === "true"));
  })
);

const createSupplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Any authenticated user (Admin or Member) may add a supplier — Create-only for Members.
suppliersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSupplierSchema.parse(req.body);
    res.status(201).json(await createSupplier({ ...body, user_id: req.user!.sub }));
  })
);

suppliersRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await softDeleteSupplier(req.params.id, req.user!.sub));
  })
);

suppliersRouter.get(
  "/:id/holds",
  asyncHandler(async (req, res) => {
    res.json(await listHoldsForSupplier(req.params.id));
  })
);

suppliersRouter.get(
  "/holds/all",
  asyncHandler(async (_req, res) => {
    res.json(await listAllSupplierHolds());
  })
);

suppliersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getSupplierProfile(req.params.id));
  })
);

const sendSchema = z.object({
  supplier_id: z.string(),
  product_id: z.string(),
  quantity_sent: z.number().int().positive(),
  date: z.string().optional(),
  note: z.string().optional(),
});

suppliersRouter.post(
  "/sends",
  asyncHandler(async (req, res) => {
    const body = sendSchema.parse(req.body);
    res.status(201).json(await sendCylindersToSupplier({ ...body, user_id: req.user!.sub }));
  })
);

const receiptSchema = z.object({
  supplier_id: z.string(),
  product_id: z.string(),
  refill_quantity: z.number().int().nonnegative().default(0),
  new_quantity: z.number().int().nonnegative().default(0),
  total_amount: z.number().nonnegative(),
  paid_now_amount: z.number().nonnegative(),
  paid_from_account_id: z.string().optional(),
  due_amount: z.number().nonnegative(),
  date: z.string().optional(),
  note: z.string().optional(),
});

suppliersRouter.post(
  "/receipts",
  asyncHandler(async (req, res) => {
    const body = receiptSchema.parse(req.body);
    res.status(201).json(await recordSupplierReceipt({ ...body, user_id: req.user!.sub }));
  })
);

const paymentSchema = z.object({
  supplier_id: z.string(),
  amount: z.number().positive(),
  type: z.enum(["ADVANCE", "INSTALLMENT"]),
  paid_from_account_id: z.string(),
  date: z.string().optional(),
  note: z.string().optional(),
});

// Paying a supplier is sensitive — Admin only, same as other outbound-money actions.
suppliersRouter.post(
  "/payments",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = paymentSchema.parse(req.body);
    res.status(201).json(await recordSupplierPayment({ ...body, user_id: req.user!.sub }));
  })
);
