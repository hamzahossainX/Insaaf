import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient. In Vercel serverless, a warm function runtime can
// reuse globalThis between invocations, which helps avoid connection churn.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

globalThis.__prisma = prisma;
