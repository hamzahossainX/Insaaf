import { Router } from "express";
import { z } from "zod";
import { login } from "../services/users.service";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({ phone: z.string().min(1), password: z.string().min(1) });

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { phone, password } = loginSchema.parse(req.body);
    try {
      const result = await login(phone, password);
      res.json(result);
    } catch {
      res.status(401).json({ error: "Invalid credentials" });
    }
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
