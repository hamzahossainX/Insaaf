# Changelog

All notable changes to **Insaaf ERP** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-07-19

### 🎉 Initial Production Release — Insaaf Oxygen Wing

#### Added
- **Authentication** — JWT-based login with role-based access control (Admin / Member)
- **Multi-wing architecture** — shared foundation supports Insaaf LPG, Oxygen, and Retail wings
- **Dashboard** — live stats (today's sales, due collected, expenses, accounts summary) with Recharts charts
- **Sales (POS)** — four sale types: Gas Only, Gas + Cylinder, Cylinder Exchange, Other Item
- **Customers** — full profile with itemized due breakdown, due payment panel, cylinder loan history
- **Products** — catalog with stock tracking, reorder alerts, "cylinders due back" column
- **Cylinder Returns** — outstanding loans overview + per-customer return form
- **Accounts** — Cash / Bank / bKash accounts with full double-entry ledger
- **Expenses** — categorised expenses with soft-delete reversal ledger
- **Payroll** — salary advance, salary increment (one-time / permanent), run monthly payroll
- **Employee Loans** — long-term cash loans with repayment tracking
- **Reports** — Sales ledger, Stock, Customer Due, Payroll, Loans & Advances — all with CSV export and Print/PDF
- **Audit Log** — every mutation is recorded with actor, entity, and diff
- **Dark mode** — OS-preference default + manual toggle, persisted in localStorage
- **Fully responsive** — mobile drawer nav, stacked forms, scrollable tables on all screen sizes
- **Neon PostgreSQL** — serverless PostgreSQL with connection pooling
- **Vercel deployment** — frontend (Vite static) + backend (Express serverless) on Vercel

#### Security
- All `PUT`/`DELETE` endpoints require `ADMIN` role (server-enforced, not just UI-hidden)
- JWT tokens stored in `sessionStorage` (cleared on tab close)
- Session verified against `GET /auth/me` on load — stale tokens never auto-login
- Passwords hashed with bcrypt (rounds = 10)
- CORS locked to `FRONTEND_URL` environment variable in production
- Soft-delete everywhere — financial and stock records are never hard-deleted

#### Architecture
- Ledger-based derived balances (`current_stock_qty`, `current_due_balance`, `current_balance`) — never written directly, always computed from ledger entries inside a DB transaction
- Domain layer (`src/domain/oxygenRules.ts`) is pure-function, DB-independent, and fully unit-tested (17 tests passing)
- Service layer wraps domain functions in Prisma `$transaction` calls

---

## [0.9.0] — 2026-07-10

### Added
- Responsive layout overhaul — mobile sidebar drawer, iPad-width decrowding
- Print stylesheet for Reports (plain white, hides nav/buttons)
- Dark-mode `color-scheme: dark` fix for native `<select>`, date pickers, and autofill

### Fixed
- Submit button `col-span-N` mismatch on mobile quick-add forms
- Desktop sidebar switching too early at 768px (now stays mobile through 1023px)

---

## [0.8.0] — 2026-07-01

### Added
- Delivery employee field on New Sale
- Delivery history panel on Payroll employee profile
- "Delivery man" column on Sales report

### Fixed
- "Other Item" sale type switched from free-text to product-catalog based (consistent with Gas flow)

---

## [0.7.0] — 2026-06-20

### Added
- Date range "to" is now fully inclusive (midnight fix in `dateRange.ts`)
- "Show all (clear dates)" button on Reports
- Total row at the bottom of every report table
- Employee loan/advance repayment — "Loans & Advances" panel on Payroll page
- "Loans & Advances" report tab with CSV export
- "Other Item" sale type (free-text item, no stock/cylinder tracking)

### Fixed
- Prisma schema block-comment syntax error (switched `/** */` to `//`)

---

## [0.6.0] — 2026-06-05

### Added
- Customer type-to-search autocomplete (`CustomerAutocomplete.tsx`) on New Sale and Cylinder Returns
- Itemized "Why is this customer in due?" breakdown on customer profile
- "Receive due payment" panel always visible on customer profile
- "+ Add employee" button on Payroll page (API existed, UI was missing)
- Reports CSV export (`src/lib/csv.ts`) and Print/PDF buttons
- Admin delete for Products, Customers, Expenses, Accounts, Employees, Users (all soft-delete)
- "Cylinders due back" column on Products page

---

## [0.5.0] — 2026-05-20

### Added
- Visual redesign — teal color theme, refined shadows and spacing
- Dark mode with sun/moon toggle and localStorage persistence
- Full mobile responsiveness — drawer sidebar, stacked forms, scrollable tables
- Lucide React icons in navigation

---

## [0.4.0] — 2026-05-05

### Added
- Cylinder Returns page with outstanding loan overview
- Due payment recording on Customers page
- Reports page — Sales, Stock, Customer Due, Payroll tabs
- Settings page

### Fixed
- Number fields (Paid Now, quantity, price) allow temporary empty state while typing
- "Due Collected" on Dashboard now uses actual DuePayment records (was using paid_now_amount)

---

## [0.3.0] — 2026-04-20

### Added
- Payroll module — advances, increments, run payroll, per-employee profile
- Accounts module with ledger entries and transfers
- Expenses module with categories

---

## [0.2.0] — 2026-04-05

### Added
- Sales POS (New Sale page) — Gas Only, Gas + Cylinder, Cylinder Exchange flows
- Products catalog with stock management
- Customers page with profile and cylinder loan history

---

## [0.1.0] — 2026-03-20

### Added
- Initial project scaffold (backend + frontend monorepo)
- Prisma schema — shared foundation models (User, Wing, Customer, Account, Employee, AuditLog)
- JWT authentication (login, me endpoint)
- Docker Compose for local PostgreSQL
