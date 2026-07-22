import { Request, RequestHandler } from "express";

interface AttemptWindow {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
}

function requestKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Lightweight per-instance protection for the login endpoint. Vercel instances do
 * not share memory, so a distributed store should replace this if attack volume
 * grows, but this still stops rapid retries against each warm instance.
 */
export function createLoginRateLimit({ windowMs, maxAttempts }: RateLimitOptions): RequestHandler {
  const attempts = new Map<string, AttemptWindow>();

  return (req, res, next) => {
    const now = Date.now();
    const key = requestKey(req);
    const current = attempts.get(key);
    const window = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    window.count += 1;
    attempts.set(key, window);

    if (attempts.size > 10_000) {
      for (const [attemptKey, entry] of attempts) {
        if (entry.resetAt <= now) attempts.delete(attemptKey);
      }
    }

    const remaining = Math.max(0, maxAttempts - window.count);
    res.setHeader("RateLimit-Limit", String(maxAttempts));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(window.resetAt / 1000)));

    if (window.count > maxAttempts) {
      res.setHeader("Retry-After", String(Math.ceil((window.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many login attempts. Please try again later." });
    }

    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) attempts.delete(key);
    });
    next();
  };
}

export const loginRateLimit = createLoginRateLimit({ windowMs: 15 * 60 * 1000, maxAttempts: 10 });
