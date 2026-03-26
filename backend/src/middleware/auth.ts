import { NextFunction, Request, Response } from "express";
import { JwtPayload, verifyToken } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Requires a valid JWT. Attaches decoded payload to req.user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  try {
    req.user = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Enforces the two-role model server-side (never trust the client):
 * Members are Create-only — any UPDATE or DELETE is rejected outright,
 * even if called directly against the API.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin role required for this action" });
  }
  next();
}

/** Blocks Members from UPDATE/DELETE verbs; Admins pass through unrestricted. */
export function enforceCreateOnlyForMembers(req: Request, res: Response, next: NextFunction) {
  const isMutatingUpdateOrDelete = req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
  if (isMutatingUpdateOrDelete && req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Members can only create records, not update or delete" });
  }
  next();
}

/** Restricts a Member to their own wing_id; Admins may pass any wing. */
export function scopeToOwnWing(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "MEMBER") {
    const requestedWing = (req.body?.wing_id as string | undefined) ?? (req.query?.wing_id as string | undefined);
    if (requestedWing && requestedWing !== req.user.wing_id) {
      return res.status(403).json({ error: "Members may only operate within their assigned wing" });
    }
    // Force the member's own wing if not explicitly provided
    if (!requestedWing && req.body) {
      req.body.wing_id = req.user.wing_id;
    }
  }
  next();
}
