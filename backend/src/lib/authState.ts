import { prisma } from "./prisma";

const AUTH_STATE_TTL_MS = 30_000;

export interface CurrentUserState {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  wing_id: string | null;
  is_active: boolean;
  token_version: number;
}

interface CacheEntry {
  expiresAt: number;
  value: Promise<CurrentUserState | null>;
}

const authStateCache = new Map<string, CacheEntry>();

/**
 * Coalesces concurrent auth lookups (the dashboard starts several requests at
 * once) and keeps revocation latency bounded. Local user mutations invalidate
 * immediately; other serverless instances refresh within 30 seconds.
 */
export function getCurrentUserState(userId: string): Promise<CurrentUserState | null> {
  const now = Date.now();
  const cached = authStateCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, wing_id: true, is_active: true, token_version: true },
  }) as Promise<CurrentUserState | null>;
  authStateCache.set(userId, { expiresAt: now + AUTH_STATE_TTL_MS, value });
  value.catch(() => authStateCache.delete(userId));

  if (authStateCache.size > 10_000) {
    for (const [cachedUserId, entry] of authStateCache) {
      if (entry.expiresAt <= now) authStateCache.delete(cachedUserId);
    }
  }
  return value;
}

export function invalidateCurrentUserState(userId: string): void {
  authStateCache.delete(userId);
}
