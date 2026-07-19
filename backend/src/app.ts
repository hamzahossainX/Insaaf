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
import { usersRouter } from "./routes/users.routes";
import { wingsRouter } from "./routes/wings.routes";
import { reportsRouter } from "./routes/reports.routes";
import { errorMiddleware } from "./lib/http";

const app = express();

// Allow the deployed frontend origin + localhost for dev.
const allowedOrigins = [
  "https://insaaf-two.vercel.app",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server calls (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// NOTE: Members are Create-only. This is enforced per-route via requireAdmin on
// every UPDATE/DELETE endpoint (see middleware/auth.ts), applied AFTER requireAuth
// so req.user is populated by then. There is intentionally no global create-only
// middleware ahead of auth, since req.user wouldn't exist yet at that point.

app.get("/", (_req, res) => res.json({ message: "Live" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/sales", salesRouter);
app.use("/api/cylinders", cylindersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/employee-loans", employeeLoansRouter);
app.use("/api/users", usersRouter);
app.use("/api/wings", wingsRouter);
app.use("/api/reports", reportsRouter);

app.use(errorMiddleware);

export default app;
