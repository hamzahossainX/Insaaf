import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { listCustomers, getCustomerProfile, recordDuePayment, softDeleteCustomer } from "../services/customers.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../lib/audit";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, has_due } = req.query as Record<string, string | undefined>;
    res.json(await listCustomers(search, has_due === "true"));
  })
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getCustomerProfile(req.params.id));
  })
);

const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

// Any authenticated user (Admin or Member) may create customers — Create-only for Members.
customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createCustomerSchema.parse(req.body);
    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({ data: body });
      await writeAuditLog(tx, { user_id: req.user!.sub, action: "CREATE", entity: "Customer", entity_id: c.id });
      return c;
    });
    res.status(201).json(customer);
  })
);

customersRouter.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = createCustomerSchema.partial().parse(req.body);
    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({ where: { id: req.params.id }, data: body });
      await writeAuditLog(tx, { user_id: req.user!.sub, action: "UPDATE", entity: "Customer", entity_id: req.params.id, diff: body });
      return updated;
    });
    res.json(customer);
  })
);

customersRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await softDeleteCustomer(req.params.id, req.user!.sub));
  })
);

const duePaymentSchema = z.object({
  customer_id: z.string(),
  amount: z.number().positive(),
  received_into_account_id: z.string(),
  date: z.string().optional(),
  note: z.string().optional(),
});

customersRouter.post(
  "/due-payments",
  asyncHandler(async (req, res) => {
    const body = duePaymentSchema.parse(req.body);
    const payment = await recordDuePayment({ ...body, user_id: req.user!.sub });
    res.status(201).json(payment);
  })
);
