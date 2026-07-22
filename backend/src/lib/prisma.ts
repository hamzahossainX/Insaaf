import { PrismaClient } from "@prisma/client";

// Reuse PrismaClient during hot reloads and across warm serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

globalThis.__prisma = prisma;
