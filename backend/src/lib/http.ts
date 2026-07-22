import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { BusinessRuleError } from "../domain/oxygenRules";
import { Prisma } from "@prisma/client";

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/** Wraps an async Express handler so rejected promises reach the error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof BusinessRuleError) {
    return res.status(422).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2024") return res.status(503).json({ error: "Database is busy; please retry shortly" });
    if (err.code === "P2025") return res.status(404).json({ error: "Record not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "A record with these values already exists" });
    if (err.code === "P2003") return res.status(409).json({ error: "This record is referenced by another record" });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
