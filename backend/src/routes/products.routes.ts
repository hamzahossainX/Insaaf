import { Router } from "express";
import { z } from "zod";
import { listProducts, getProductLedger, createProduct, stockIn, updateProduct, softDeleteProduct } from "../services/products.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const wing_id = req.user!.role === "MEMBER" ? req.user!.wing_id ?? undefined : (req.query.wing_id as string | undefined);
    res.json(await listProducts(wing_id));
  })
);

productsRouter.get(
  "/:id/ledger",
  asyncHandler(async (req, res) => {
    res.json(await getProductLedger(req.params.id));
  })
);

const createProductSchema = z.object({
  wing_id: z.string(),
  category: z.string().min(1),
  brand: z.string().optional(),
  size_variant: z.string().min(1),
  unit_cost_price: z.number().nonnegative(),
  unit_sale_price: z.number().nonnegative(),
  reorder_level: z.number().int().nonnegative().optional(),
  opening_stock_qty: z.number().int().nonnegative().optional(),
  is_returnable: z.boolean().optional(),
  note: z.string().optional(),
});

// Admin-only create/edit/delete of gas type/size definitions (Screen 6).
productsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createProductSchema.parse(req.body);
    res.status(201).json(await createProduct({ ...body, user_id: req.user!.sub }));
  })
);

productsRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await updateProduct(req.params.id, req.user!.sub, req.body));
  })
);

productsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await softDeleteProduct(req.params.id, req.user!.sub));
  })
);

const stockInSchema = z.object({ product_id: z.string(), quantity: z.number().int().positive(), note: z.string().optional() });

// Stock In — any authenticated user can log a stock-in (Create-only for Members).
productsRouter.post(
  "/stock-in",
  asyncHandler(async (req, res) => {
    const body = stockInSchema.parse(req.body);
    await stockIn({ ...body, user_id: req.user!.sub });
    res.status(201).json({ ok: true });
  })
);
