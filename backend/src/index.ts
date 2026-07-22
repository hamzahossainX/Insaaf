import "dotenv/config";
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
import { errorMiddleware } from "./lib/http";

const app = express();
app.use(cors());
app.use(express.json());

// NOTE: Members are Create-only. This is enforced per-route via requireAdmin on
// every UPDATE/DELETE endpoint (see middleware/auth.ts), applied AFTER requireAuth
// so req.user is populated by then. There is intentionally no global create-only
// middleware ahead of auth, since req.user wouldn't exist yet at that point.

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
app.use("/api/suppliers", suppliersRouter);
app.use("/api/users", usersRouter);
app.use("/api/wings", wingsRouter);
app.use("/api/reports", reportsRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Insaaf ERP (Oxygen wing) backend listening on port ${PORT}`);
});
