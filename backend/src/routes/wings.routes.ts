import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const wingsRouter = Router();
wingsRouter.use(requireAuth);

wingsRouter.get("/", asyncHandler(async (_req, res) => res.json(await prisma.wing.findMany({ orderBy: { name: "asc" } }))));
