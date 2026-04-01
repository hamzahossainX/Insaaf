import { Router } from "express";
import { z } from "zod";
import { createUser, listUsers, updateUser, deactivateUser } from "../services/users.service";
import { asyncHandler } from "../lib/http";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin); // Only Admin creates/edits users, and only Admin should list them.

usersRouter.get("/", asyncHandler(async (_req, res) => res.json(await listUsers())));

const createUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MEMBER"]),
  wing_id: z.string().optional(),
});

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
    res.json(await updateUser(req.params.id, req.user!.sub, req.body));
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await deactivateUser(req.params.id, req.user!.sub));
  })
);
