import { Router } from "express";
import { z } from "zod";
import { recordCylinderReturn, listLoansForCustomer, listAllOutstandingLoans } from "../services/cylinders.service";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const cylindersRouter = Router();
cylindersRouter.use(requireAuth);

const returnSchema = z.object({
  customer_id: z.string(),
  product_id: z.string(),
  quantity_returned: z.number().int().positive(),
  date: z.string().optional(),
});

cylindersRouter.post(
  "/returns",
  asyncHandler(async (req, res) => {
    const body = returnSchema.parse(req.body);
    const result = await recordCylinderReturn({ ...body, user_id: req.user!.sub });
    res.status(201).json(result);
  })
);

cylindersRouter.get(
  "/loans",
  asyncHandler(async (_req, res) => {
    res.json(await listAllOutstandingLoans());
  })
);

cylindersRouter.get(
  "/loans/:customer_id",
  asyncHandler(async (req, res) => {
    res.json(await listLoansForCustomer(req.params.customer_id));
  })
);
