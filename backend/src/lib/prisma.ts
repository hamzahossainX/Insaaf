import { PrismaClient } from "@prisma/client";

<<<<<<< HEAD
// Singleton PrismaClient (avoids exhausting connections in dev with hot reload).
=======
// Singleton PrismaClient. In Vercel serverless, a warm function runtime can
// reuse globalThis between invocations, which helps avoid connection churn.
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

<<<<<<< HEAD
export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
=======
export const prisma = globalThis.__prisma ?? new PrismaClient();

globalThis.__prisma = prisma;
>>>>>>> c79828a843ea31b95a185f8d1b10f9418bdc3cac
