import { Router } from "express";
import { z } from "zod";
import { changeOwnPassword, login } from "../services/users.service";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { loginRateLimit } from "../middleware/rateLimit";

export const authRouter = Router();

const loginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) });
const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(72),
}).strict();

authRouter.post(
  "/login",
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const { phone, password } = loginSchema.parse(req.body);
    const result = await login(phone, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    res.json(result);
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);
    await changeOwnPassword(req.user!.sub, body.current_password, body.new_password);
    res.status(204).end();
  })
);
