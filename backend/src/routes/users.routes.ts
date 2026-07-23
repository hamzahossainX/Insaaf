import { Router } from "express";
import { z } from "zod";
import { createUser, listUsers, updateUser, deactivateUser } from "../services/users.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin); // Only Admin creates/edits users, and only Admin should list them.

usersRouter.get("/", asyncHandler(async (_req, res) => res.json(await listUsers())));

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  email: z.string().email().optional(),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "MEMBER"]),
  wing_id: z.string().optional(),
  note: z.string().trim().max(2000).optional(),
}).strict().superRefine((user, context) => {
  if (user.role === "MEMBER" && !user.wing_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["wing_id"], message: "A member must be assigned to a wing" });
  }
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  wing_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
}).strict().refine((body) => Object.keys(body).length > 0, "At least one field is required");

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);
    const user = await createUser({ ...body, created_by: req.user!.sub });
    res.status(201).json({ id: user.id, name: user.name, phone: user.phone, role: user.role });
  })
);

usersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateUserSchema.parse(req.body);
    res.json(await updateUser(req.params.id, req.user!.sub, body));
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await deactivateUser(req.params.id, req.user!.sub));
  })
);
