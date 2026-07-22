import { Router } from "express";
import { z } from "zod";
import { createSale, listSales } from "../services/sales.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, scopeToOwnWing } from "../middleware/auth";

export const salesRouter = Router();
salesRouter.use(requireAuth);

const saleSchema = z.object({
  wing_id: z.string(),
  customer_id: z.string(),
  sale_type: z.enum(["GAS_ONLY", "GAS_PLUS_CYLINDER", "CYLINDER_EXCHANGE", "OTHER_ITEM"]),
  line_items: z
    .array(z.object({ product_id: z.string(), quantity: z.number().int().positive(), unit_price: z.number().nonnegative() }))
    .min(1),
  paid_now_amount: z.number().nonnegative(),
  paid_into_account_id: z.string().optional(),
  due_amount: z.number().nonnegative(),
  date: z.string().optional(),
  delivery_employee_id: z.string().optional(),
  note: z.string().optional(),
});

// Members may create sales (Create-only role); no update/delete endpoints exist for Sale by design.
salesRouter.post(
  "/",
  scopeToOwnWing,
  asyncHandler(async (req, res) => {
    const body = saleSchema.parse(req.body);
    const sale = await createSale({ ...body, user_id: req.user!.sub });
    res.status(201).json(sale);
  })
);

salesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { wing_id, customer_id, from, to } = req.query as Record<string, string | undefined>;
    const effectiveWing = req.user!.role === "MEMBER" ? req.user!.wing_id ?? undefined : wing_id;
    const sales = await listSales({ wing_id: effectiveWing, customer_id, from, to });
    res.json(sales);
  })
);
