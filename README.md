# Insaaf ERP — Module 1: Insaaf Oxygen

This is the **Insaaf Oxygen** wing of the multi-wing Insaaf ERP system. It's built against the
Shared Foundation (roles, users, customers, accounts, expenses, employees/payroll, audit log)
so the upcoming **Insaaf LPG** and **Insaaf Retail** modules can merge in without schema rework —
see `backend/prisma/schema.prisma` for the shared models and `Wing` enum, which already includes
all three wings.

## Project structure

```
insaaf-erp/
├── backend/          Express + TypeScript + Prisma API
│   ├── prisma/        schema.prisma, seed.ts
│   ├── src/
│   │   ├── domain/     pure, DB-independent business rules (unit-tested)
│   │   ├── services/   Prisma-backed transactional service layer
│   │   ├── routes/     Express route handlers (auth + RBAC per route)
│   │   ├── middleware/ JWT auth, Admin/Member enforcement
│   │   └── __tests__/  Jest tests for Section 3's worked examples
│   └── API.md          Full route reference
├── frontend/         React (Vite) + TypeScript + Tailwind + TanStack Query
└── docker-compose.yml Local Postgres for development
```

## Tech stack

- Frontend: React (Vite), TypeScript, Tailwind CSS, React Router, TanStack Query, Recharts.
- Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT + bcrypt.
- Currency: Bangladeshi Taka, formatted `৳ X,XXX.XX` (see `frontend/src/api/client.ts#currency`).

## Setup

### 1. Start Postgres

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with user/password/db `insaaf`/`insaaf`/`insaaf_erp`
(matches `backend/.env.example`). Use your own Postgres instance instead if you prefer — just
point `DATABASE_URL` at it.

### 2. Backend

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET if needed
npm install
npx prisma generate         # requires normal internet access to binaries.prisma.sh
npx prisma migrate dev --name init
npm run seed                # loads wings, users, products, customers, ~2 weeks of sample data
npm run dev                 # http://localhost:4000
```

> **Migration note:** if you already have a working database from an earlier version of this
> project, this update adds five new tables (`suppliers`, `supplier_receipts`,
> `supplier_payments`, `supplier_cylinder_holds`, `supplier_cylinder_sends`) and two new
> `StockMovementType` values. Run `npx prisma migrate dev --name suppliers` to pick them up —
> existing data is unaffected. If this is a fresh database, just run
> `npx prisma migrate dev --name init` as shown above and everything comes in one migration.

> **Note on this build environment:** `prisma generate` downloads Prisma's query-engine binary
> from `binaries.prisma.sh`, which was not reachable from the sandbox this module was built in
> (network allowlist didn't include that domain). The schema, migrations config, and all service
> code are written and ready — running the two commands above on a normal machine (or CI) will
> generate the client and apply migrations with no code changes needed. The business-rule layer
> (`src/domain/oxygenRules.ts`) has no Prisma dependency and its tests already pass in this
> sandbox (`npm test`, 13/13 passing) — see below.

Seed logins:
- **Admin** — phone `01700000001`, password `admin123`
- **Member** (scoped to Oxygen wing) — phone `01700000002`, password `member123`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies /api to :4000
```

## Environment variables (`backend/.env`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signing secret for auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `12h`) |
| `PORT` | API port (default `4000`) |

## Tests

```bash
cd backend
npm test
```

Covers Section 3's business rules directly against the literal worked examples:
- Cylinder return: 10 on loan, return 5 → stock +5, loan balance 5.
- Due payment: due 10, pay 5 → due becomes 5.
- Payment-split validation (rejects mismatched `paid_now + due ≠ total`).
- Gas-only sale: stock deducted immediately (cylinder leaves the premises), cylinder loan created/incremented; stock returns and loan clears when the cylinder comes back.
- Gas + cylinder sale: stock permanently deducted, no loan created.
- Payroll: base 10,000 + advance 5,000 mid-month → net payable 5,000.

These are pure-function tests (`src/domain/oxygenRules.ts`) with no DB dependency, so they run
in any environment. The service layer (`src/services/*.ts`) wraps the same functions in Prisma
`$transaction` calls to persist ledger entries and derived balances — that layer is exercised via
the API once a real Postgres instance + generated client are available (`npx prisma studio` is a
quick way to eyeball the effects after running through the app).

## Business rules implemented (Section 3)

1. **Gas-only sale** — deducts stock immediately (the cylinder physically leaves the premises) and increments a `CylinderLoan`. Worked example: 20 in stock, order 1 gas-only → stock 19, on-loan 1. Returning it → stock 19 + 1 = 20, on-loan 1 - 1 = 0 (same mechanics as Rule 3 below).
2. **Gas + cylinder sale** — permanent stock deduction; no loan created.
3. **Cylinder return** — stock +qty, loan balance −qty (same transaction).
4. **Due creation** — `Customer.current_due_balance` derived from ledger, never written directly.
5. **Due payment** — decreases due balance, increases account balance.
6. **Payment split validation** — `paid_now_amount + due_amount` must equal `total_amount`, enforced
   server-side (422 on mismatch) regardless of what the client sends.
7. **No direct edits** — `current_stock_qty`, `current_due_balance`, `Account.current_balance` are
   only ever written inside the service-layer helpers (`applyStockDelta`, `applyAccountLedgerEntry`,
   the due-balance updates in `customers.service.ts`), each paired with a ledger entry in the same
   `$transaction`. No route accepts these fields directly.
8. Medical-grade gases are just distinct `category` values — no special workflow, per spec.

## Role model

- **Admin** — full CRUD everywhere, across wings; only Admin can create/edit users.
- **Member** — Create-only, scoped to their `wing_id`. Enforced in the UI (controls hidden) and,
  more importantly, on the server: every `PUT`/`DELETE` route is wrapped in `requireAdmin`
  middleware (see `backend/src/middleware/auth.ts`), so a Member's token gets a `403` even if the
  endpoint is called directly, bypassing the UI.
- All mutations are recorded to `AuditLog`. Product delete is a soft-delete (per the "soft-delete
  with reversal, never hard-delete on financial/stock records" rule); Sale/Expense/DuePayment
  intentionally have no update/delete endpoints in this module, matching the Create-only model —
  corrections should go through a reversal/adjustment entry in a future iteration rather than
  mutating history.

## Recent changes (new module — Suppliers)

A genuinely new feature, built as the mirror image of the existing Customer/CylinderLoan/
DuePayment system — same patterns, same rigor (transactions, audit log, soft-delete guards,
tested pure business rules), just for what the business owes a supplier instead of what a
customer owes the business.

**What it covers, per the request:**
- **Taking cylinders from a supplier on credit** — recorded as a `SupplierReceipt` with a
  `due_amount`; that due adds to the supplier's `current_payable_balance`, same shape as a
  customer's due balance but in reverse.
- **Advances and month-by-month payoffs** — `SupplierPayment` with `type: ADVANCE` or
  `INSTALLMENT`. Both just reduce the payable balance; unlike a customer due payment, this is
  intentionally *not* capped at the current balance, since an advance paid before any receipt
  exists is expected to push the balance negative (a prepaid credit future receipts draw down).
  Worked example, tested exactly as described: owe 10,00,000 -> pay 1,00,000 first month ->
  payable 9,00,000 -> pay 2,00,000 next month -> payable 7,00,000.
- **Empty cylinders sent to a supplier for refill** — `SupplierCylinderSend`: deducts stock
  immediately (mirrors how a Gas-only sale deducts stock) and grows a `SupplierCylinderHold` —
  the client's own cylinders sitting at the supplier, tracked the same way a customer's borrowed
  cylinder is tracked, just in the opposite direction.
- **Refilled cylinders coming back, sometimes alongside brand-new ones** — a single
  `SupplierReceipt` carries both `refill_quantity` and `new_quantity`. Both add to stock; only
  the refill portion clears the hold. Tested exactly as described (6 refilled + 4 new in one
  delivery).

**New nav item**: "Suppliers" — list + profile (payable balance, an itemized "why this balance"
trail, cylinders currently on hold, send/receive/payment forms, full history). Also added a
"Supplier Payables" tab on Reports, a "Payable to Suppliers" stat on the Dashboard, and supplier
receipts/payments now appear in the Dashboard's Recent Activity feed alongside everything else.

9 new tests (`supplierRules.test.ts`) cover the client's exact worked examples — 27/27 total pass.

## Recent changes (premium visual redesign — no logic changed)

Pure design-system upgrade, frontend only. Zero backend changes (18/18 tests still pass).

**Design plan:** paired "Sora" (display/headings — confident, geometric, technical) with "Inter"
(body/data — the standard for dense, legible UI). Kept the teal brand color (fits gas/oxygen,
already distinctive) but deepened it and gave dark mode proper elevation layers (slate-950 base,
slate-900 cards) instead of one flat dark tone. Signature touches: a gradient mark on the logo
and primary buttons, a colored left-bar indicator on the active nav item, icon-accented stat
cards, and tabular numbers on financial figures so they don't jitter as they update.

- **Typography** — Sora for page titles and card headers, Inter everywhere else, loaded via
  Google Fonts (`index.html`) and wired through `tailwind.config.js`.
- **Sidebar** — gradient flame-mark logo, active nav items get a colored left-bar indicator
  instead of just a background tint, user profile shows an avatar initial.
- **Login** — ambient soft gradient backdrop (quiet, not a spotlight), glowing gradient logo
  mark, glass-edged card.
- **Dashboard** — every stat card now has a color-coded icon chip (revenue in teal, collections
  in green, expenses in red, etc.), refined chart styling, section headers in the display font.
- **Buttons** — primary actions use a subtle brand gradient with a soft glow and lift on hover
  instead of a flat fill.
- **Cards & tables** — softer, deeper shadows (`shadow-card` / `shadow-premium-dark`), rounded-2xl
  corners, uppercase tracked table headers, hover row tint in the brand color.
- Still fully responsive and dark-mode aware at every breakpoint — this builds on, not replaces,
  the responsive/dark-mode work from earlier rounds.

## Recent changes (Rule 1 fix — gas-only sales now deduct stock)

A genuine business-rule correction, requested explicitly — every other rule is untouched.

**Before:** a Gas-only sale didn't touch `current_stock_qty` at all — only the cylinder loan was
tracked, on the assumption the cylinder was still "in the business's stock," just at the
customer's premises.

**Now:** a Gas-only sale deducts stock immediately (the cylinder physically leaves the premises)
*and* still creates/increments the cylinder loan. Returning it adds the stock back and clears the
loan — unchanged, since Rule 3 (Cylinder Return) already worked this way.

**Worked example:** 20 in stock, order 1 gas-only → stock 19, on-loan 1. Return that cylinder →
stock 19 + 1 = 20, on-loan 1 − 1 = 0.

This was a single-point fix in `backend/src/domain/oxygenRules.ts#computeSaleEffects` (the one
function that decides what a sale does to stock/loans), so it's already correctly wired through
the stock ledger, `Product.current_stock_qty`, and the "Due back" column on Products — no other
file needed logic changes. Also updated: the seed script (it was manually replicating the old
rule), the on-screen explanation text on New Sale, and the docs below. Rules 2–8 are unchanged.
18/18 backend tests pass, including a new worked-example test with your exact numbers.

## Recent changes (activity feed, notes, mobile fix)

No business logic changed — this is additive (new read-only feed + optional note fields) and a
CSS fix. All 17 backend tests still pass unmodified.

1. **Recent activity feed on the Dashboard** — a new "Recent activity" card shows the latest
   sales, due payments, expenses, cylinder returns, employee loans/repayments, and payroll runs
   in one chronological list, each with an icon, amount, and relative time ("2h ago"). Backed by
   a new read-only `/reports/recent-activity` endpoint that merges and sorts the last N events
   from each table — it doesn't derive or store anything, purely a read aggregation.
2. **Optional notes everywhere** — added an optional `note` field to Sales, Due Payments,
   Cylinder Returns, Products, Employees, Salary Advances, Payroll runs, Employee Loan
   Repayments, and Users (Customers already had one). Every create form now has a "Note
   (optional)" field — genuinely optional, no validation requires it, and every existing flow
   works exactly the same if you leave it blank.
3. **Employee page mobile overflow — actual root cause fixed.** Found it: form elements
   (`<select>`, `<input>`) inside a flex/grid container default to `min-width: auto` in CSS,
   meaning they refuse to shrink below their content's natural width — invisible on a roomy
   screen, but forces horizontal overflow on a narrow phone (this wouldn't show up on iPad,
   which is why the iPad fix alone didn't resolve it). Fixed once at the shared `.input` class
   (`min-w-0`), which resolves it across every form in the app, not just Payroll. Also converted
   the "Remove employee" action to a compact icon button and fixed a missed dark-mode color on
   the selected-row highlight.

## Recent changes (responsive & dark-mode fixes)

Another pure styling pass, no backend or logic changes (17/17 backend tests still pass).

1. **Fixed a real layout bug behind the "overlapping" complaint** — several quick-add forms
   (Add Customer, Add Expense, Add Employee, Add Product, Add User) had a `col-span-N` on their
   submit button that didn't adjust for the new responsive grid, so on phones the button forced
   extra invisible grid tracks and visually collided with other fields. Every `col-span-N` now
   matches its container's breakpoints (`sm:col-span-N lg:col-span-N`).
2. **iPad-width layouts decrowded** — the sidebar now stays in mobile-drawer mode through
   tablet-portrait width (was switching to a fixed desktop sidebar at 768px, competing for space
   with a 3–4 column grid at the same width). Dashboard's stat cards, chart panels, the Employees
   & Payroll two/three-column layout, and the equivalent Reports grids now only go multi-column
   at the `lg` breakpoint (1024px) — clean single/two-column layouts up through iPad portrait.
3. **iPhone SE action-button positioning** — table row actions (view/delete on Customers,
   stock-in/delete on Products, delete on Expenses) were cramped text links that could wrap or
   crowd on narrow screens. Replaced with compact icon buttons (`.icon-btn` / `.icon-btn-danger`)
   that stay well-positioned at any width.
4. **White flash on inputs/selects in dark mode, fixed** — added `color-scheme: dark` (via
   Tailwind's dark-mode class) so the browser's own UI for `<select>` dropdowns, date pickers,
   and similar native controls renders in dark colors instead of always white. Also fixed
   autofill (e.g. a saved phone number) forcing a white input background.
5. **Print stylesheet** — "Print / Save as PDF" on the Reports page now renders on plain white
   with black text and light grey table headers, regardless of which theme you're using on
   screen, and hides the sidebar/buttons so only the report content prints.

## Recent changes (visual redesign — no logic changed)

Pure styling/UX pass across the frontend only — zero backend or business-rule changes (all 17
backend tests still pass unmodified).

1. **New color theme** — swapped the ad-hoc green for Tailwind's standard `teal` scale (fits the
   industrial/medical gas subject without being decorative), refined card shadows, borders, and
   spacing throughout.
2. **Dark mode** — a sun/moon toggle in the sidebar (and on the login page) switches between
   light and dark. Preference is remembered (`localStorage`) and defaults to your OS setting on
   first visit. Implemented via Tailwind's `class` dark-mode strategy — see `src/lib/theme.tsx`.
3. **Fully responsive** — every page now works down to mobile widths:
   - The sidebar becomes a slide-over drawer with a hamburger toggle below the `md` breakpoint;
     desktop keeps the fixed sidebar.
   - All forms that were fixed 3/4/5-column grids now stack to 1–2 columns on small screens.
   - Every data table is wrapped in a horizontally-scrollable container (`.table-scroll`) instead
     of squashing or overflowing the viewport on narrow screens.
   - The dense POS line-item row and cylinder-return row switch from a 12-column grid to a
     wrapping flex layout on mobile, then back to the grid on `sm:` and up.
4. Added `lucide-react` for consistent icons in the navigation (visual only, no new behavior).

## Recent changes (bug-fix round 4)

1. **Fixed Prisma schema syntax error** — Prisma schema files only support `//` line comments,
   not `/** ... */` block comments. The two new models from the previous round used block
   comments and failed to parse (`P1012`). Converted to `//` comments; migration should now run
   cleanly.
2. **"Other Item" is now product-catalog based**, matching how Gas/Gas+Cylinder already work —
   no more free-text item name. Add it as a product first (Products page → "+ New product" →
   uncheck "Returnable cylinder?"), then it shows up in the same dropdown UX under the "Other
   Item" sale type. Once sold, stock is permanently deducted (same as Gas + Cylinder) and never
   comes back — no cylinder-loan tracking applies to these items at all.
3. **Delivery man** — New Sale has an optional "Delivery man" dropdown, sourced from Employees.
   Each employee's Payroll profile now has a "Delivery history" panel: every sale they delivered,
   with date, customer, delivery address, and what was delivered. Also surfaced as a column on
   the Sales report.

## Recent changes (bug-fix round 3)

1. **Date range "to" is now inclusive** — filtering "12 to 15" used to silently cut off at
   midnight on the 15th, excluding that whole day. Fixed everywhere dates are filtered
   (`backend/src/lib/dateRange.ts`) so "to" now includes the entire day. The Reports page also
   got a "Show all (clear dates)" button, and every report table now ends with a **total row**
   (total quantity, total due, total stock, etc.).
2. **Employee loan/advance repayments** — employees can now pay back money directly. Each
   employee's profile on the Payroll page has a new "Loans & Advances" panel: "Give loan/advance"
   and "Receive repayment," with a running outstanding-balance total. This is intentionally
   separate from the existing month-scoped payroll Advance (which auto-deducts from that month's
   salary) — this new one is cash the employee pays back on their own schedule.
3. **New "Loans & Advances" report** — a dedicated Reports tab showing every employee's
   outstanding balance and the full give/repay transaction history, exportable to CSV.
4. **New sale type: "Other Item"** — a fourth option on New Sale for anything unrelated to gas
   or cylinders (e.g. selling a stove). You type a free-text item name and a price; it never
   touches stock or cylinder loans, just records the sale and payment/due like any other.

## Recent changes (bug-fix round 2)

1. **Non-clearable "0" in number fields** — fields like Paid Now, line-item quantity/price,
   expense amount, and transfer amount used to snap back to "0" the instant you tried to clear
   them, making it hard to type a fresh number. They now allow a temporarily empty state and
   coerce to `0` only on submit.
2. **"Due Collected" on the dashboard now reflects real due payments** — it was previously
   pulling `paid_now_amount` from sales (money collected at time of sale), so recording a due
   payment on the Customers page never moved it. It now sums actual `DuePayment` records via a
   new `/reports/due-collected` endpoint.
3. **Cylinder Returns now shows a full outstanding-loans overview** at the top of the page:
   every cylinder currently out, which customer has it, when it was issued, how many were
   originally taken, how many have been returned so far, how many are still out, and whether
   that customer's account is paid up or has a due balance. The existing per-customer return
   form is unchanged below it.
4. **No more surprise auto-login** — the session now lives in `sessionStorage` (cleared when
   you close the browser/tab) instead of `localStorage`, and any persisted token is verified
   against the backend (`GET /auth/me`) before being trusted, so a stale or expired session
   doesn't silently drop you into the dashboard.

## Recent changes (this update)

1. **Customer search** — the customer field on New Sale and Cylinder Returns is now type-to-search
   (`frontend/src/components/CustomerAutocomplete.tsx`) instead of a giant dropdown.
2. **"Why is this customer in due?"** — the customer profile now shows an itemized breakdown of
   exactly which sale(s) created the due and what was bought in each, not just a total.
3. **Receiving due payments** — the "Receive due payment" panel on the customer profile is now
   always visible (previously easy to miss), with clear validation and error messages.
4. **Employees & Payroll is now dynamic** — "+ Add employee" was missing from the UI (the API
   route already existed); it's now on the Payroll page. Advance/Increment/Run-payroll actions
   now surface server errors inline instead of failing silently.
5. **Reports are downloadable** — every report tab has an "Export as Excel (CSV)" button
   (`frontend/src/lib/csv.ts`) plus a "Print / Save as PDF" button using the browser's print
   dialog.
6. **Delete functionality for Admins** — Products, Customers, Expenses, Accounts, Employees, and
   Users can all be deleted/deactivated by an Admin. Everything stays a *soft* delete per the
   shared rule (financial/stock records are never hard-deleted):
   - Product / Customer: blocked if they still have stock on hand / cylinders on loan / an
     outstanding due, so you can't silently orphan something the business is still owed.
   - Expense: soft-deleted **and** writes a reversal ledger entry so the paying account's balance
     stays correct.
   - Account: blocked unless its balance is exactly zero.
   - Employee / User: deactivated (`is_active = false`) — history is preserved.
7. **Products page shows "Due back"** — a new column shows how many cylinders of that SKU are
   currently on loan to customers and expected back via Cylinder Returns.
8. **Sales report is now a full transaction ledger** — one row per line item: date, customer,
   who sold it, sale type, product, quantity, unit price, subtotal, sale total, amount paid,
   which account it went into, and remaining due — exportable to CSV.

## Known limitations / next steps

- `prisma generate` / `migrate dev` need to be run in an environment with normal network access
  (see note above) — everything downstream (routes, seed, tests against a live DB) is ready to go
  once that's done.
- PDF/Excel export buttons on the Reports screen are stubbed in the UI; wiring them to a real
  export (e.g. `pdf` skill / `xlsx` skill equivalents, or a library like `exceljs`/`pdfkit` on the
  backend) is a good next increment.
- Reversal/adjustment flows for correcting a posted sale or expense aren't built yet — today,
  corrections would need a manual adjustment entry.
- When Insaaf LPG / Insaaf Retail are built, they should point at the same `Customer`, `Account`,
  `Expense`, `Employee`, and `AuditLog` tables/endpoints already running here rather than
  recreating them, per the Shared Foundation note in the build prompt.
