import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { salesRouter } from "./routes/sales.routes";
import { cylindersRouter } from "./routes/cylinders.routes";
import { customersRouter } from "./routes/customers.routes";
import { productsRouter } from "./routes/products.routes";
import { accountsRouter } from "./routes/accounts.routes";
import { expensesRouter } from "./routes/expenses.routes";
import { payrollRouter } from "./routes/payroll.routes";
import { employeeLoansRouter } from "./routes/employeeLoans.routes";
import { suppliersRouter } from "./routes/suppliers.routes";
import { usersRouter } from "./routes/users.routes";
import { wingsRouter } from "./routes/wings.routes";
import { reportsRouter } from "./routes/reports.routes";
import { errorMiddleware, HttpError } from "./lib/http";
import { prisma } from "./lib/prisma";
import { parseConfiguredOrigins, validateProductionEnvironment } from "./lib/config";

validateProductionEnvironment();
const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const allowedOrigins = parseConfiguredOrigins();

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new HttpError(403, "Origin not allowed"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// NOTE: Members are Create-only. This is enforced per-route via requireAdmin on
// every UPDATE/DELETE endpoint (see middleware/auth.ts), applied AFTER requireAuth
// so req.user is populated by then. There is intentionally no global create-only
// middleware ahead of auth, since req.user wouldn't exist yet at that point.

app.get("/", (_req, res) => res.json({ message: "Live" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/sales", salesRouter);
app.use("/api/cylinders", cylindersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/employee-loans", employeeLoansRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/users", usersRouter);
app.use("/api/wings", wingsRouter);
app.use("/api/reports", reportsRouter);

app.use(errorMiddleware);

export default app;
