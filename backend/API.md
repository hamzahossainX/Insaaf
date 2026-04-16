# API Reference — Insaaf ERP (Oxygen wing)

Base URL: `http://localhost:4000/api`
Auth: `Authorization: Bearer <JWT>` on every route except `/auth/login`.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ phone, password }` → `{ token, user }` |
| GET | `/auth/me` | Returns decoded JWT payload |

## Sales (POS)
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/sales` | Admin/Member | Creates a sale; runs cylinder-loan / stock / due logic in one transaction. `sale_type` is one of `GAS_ONLY`, `GAS_PLUS_CYLINDER`, `CYLINDER_EXCHANGE`, `OTHER_ITEM`. `OTHER_ITEM` lines pick from the Product catalog exactly like gas lines do (`product_id` required) — just from non-cylinder products (`is_returnable: false`, e.g. a stove). Behaves like `GAS_PLUS_CYLINDER`: stock is permanently deducted, no cylinder loan. Optional `delivery_employee_id` assigns a delivery person from Employees. |
| GET | `/sales?wing_id=&customer_id=&from=&to=` | Admin/Member | Members are auto-scoped to their own wing. `to` is inclusive of the whole day. |

## Cylinders
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/cylinders/returns` | Admin/Member | `{ customer_id, product_id, quantity_returned }` |
| GET | `/cylinders/loans/:customer_id` | Admin/Member | Current loan balances by SKU |

## Customers
| Method | Path | Role |
|---|---|---|
| GET | `/customers?search=&has_due=true` | Admin/Member |
| GET | `/customers/:id` | Admin/Member — profile with due, loans, sales, due payments |
| POST | `/customers` | Admin/Member |
| PUT | `/customers/:id` | **Admin only** |
| POST | `/customers/due-payments` | Admin/Member — records a due payment |

## Products & Stock
| Method | Path | Role |
|---|---|---|
| GET | `/products?wing_id=` | Admin/Member |
| GET | `/products/:id/ledger` | Admin/Member |
| POST | `/products` | **Admin only** — create SKU (+ optional opening stock). `is_returnable` (default `true`) — set to `false` for non-cylinder items like a stove, which then appear under "Other Item" on New Sale and are never expected back. |
| PUT | `/products/:id` | **Admin only** |
| DELETE | `/products/:id` | **Admin only** — soft-delete |
| POST | `/products/stock-in` | Admin/Member |

## Accounts
| Method | Path | Role |
|---|---|---|
| GET | `/accounts` | Admin/Member |
| GET | `/accounts/:id/ledger` | Admin/Member |
| POST | `/accounts` | **Admin only** |
| POST | `/accounts/transfer` | **Admin only** |

## Expenses
| Method | Path | Role |
|---|---|---|
| GET | `/expenses?wing_id=&category=&from=&to=` | Admin/Member |
| POST | `/expenses` | Admin/Member |

## Employees & Payroll
| Method | Path | Role |
|---|---|---|
| GET | `/payroll/employees?wing_id=` | Admin/Member |
| GET | `/payroll/employees/:id` | Admin/Member — includes advances, increments, payroll history, and `deliveries` (every sale this employee was assigned to deliver: date, customer, address, items) |
| POST | `/payroll/employees` | **Admin only** |
| POST | `/payroll/advances` | **Admin only** |
| POST | `/payroll/increments` | **Admin only** |
| GET | `/payroll/preview?employee_id=&month=` | **Admin only** — net payable before confirming |
| POST | `/payroll/run` | **Admin only** — persists the payment |

## Employee Loans & Advances
Separate from Payroll's month-scoped SalaryAdvance (which auto-deducts at month-end payroll) —
this is cash given to an employee that they pay back directly, whenever it suits them.

| Method | Path | Role |
|---|---|---|
| POST | `/employee-loans` | **Admin only** — give a loan/advance: `{ employee_id, amount, paid_from_account_id, note? }` |
| POST | `/employee-loans/repayments` | **Admin only** — receive money back: `{ employee_id, amount, received_into_account_id }` |
| GET | `/employee-loans/employee/:employee_id` | Admin/Member — that employee's loans, repayments, and outstanding balance |
| GET | `/employee-loans?from=&to=` | Admin/Member — all employees' activity + outstanding balances (`to` inclusive of the whole day) |

## Users (Admin only, all routes)
| Method | Path |
|---|---|
| GET | `/users` |
| POST | `/users` |
| PUT | `/users/:id` |

## Wings
| Method | Path |
|---|---|
| GET | `/wings` |

## Reports
| Method | Path |
|---|---|
| GET | `/reports/sales?wing_id=&from=&to=` |
| GET | `/reports/due-collected?from=&to=` — sum of actual `DuePayment` records (not sale-time collections) |
| GET | `/reports/receivables` — aging buckets: 0-30 / 31-60 / 61-90 / 90+ |
| GET | `/reports/stock?wing_id=` |
| GET | `/reports/expenses?wing_id=&from=&to=` |
| GET | `/reports/payroll?wing_id=&month=` |
| GET | `/reports/profit-summary?wing_id=&from=&to=` — approximate: revenue − COGS − expenses − payroll |

All `from`/`to` date filters across the API are inclusive of the entire "to" day (up to 23:59:59.999), not just midnight.

## Role enforcement
- Every `PUT`/`DELETE` endpoint is gated with `requireAdmin` on the server, independent of the UI. A Member token hitting any of these gets `403`, even called directly.
- `scopeToOwnWing` middleware forces a Member's `wing_id` onto sale/expense creation and blocks cross-wing writes.
