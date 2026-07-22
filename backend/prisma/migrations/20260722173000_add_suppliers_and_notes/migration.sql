-- Add supplier payment classification.
CREATE TYPE "SupplierPaymentType" AS ENUM ('ADVANCE', 'INSTALLMENT');

-- Add supplier stock movements used by the supplier ledger.
ALTER TYPE "StockMovementType" ADD VALUE 'SUPPLIER_RECEIPT_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'SUPPLIER_SEND_OUT';

-- Add optional notes without changing existing records.
ALTER TABLE "accounts" ADD COLUMN "note" TEXT;
ALTER TABLE "cylinder_returns" ADD COLUMN "note" TEXT;
ALTER TABLE "due_payments" ADD COLUMN "note" TEXT;
ALTER TABLE "employee_loan_repayments" ADD COLUMN "note" TEXT;
ALTER TABLE "employees" ADD COLUMN "note" TEXT;
ALTER TABLE "payroll_payments" ADD COLUMN "note" TEXT;
ALTER TABLE "products" ADD COLUMN "note" TEXT;
ALTER TABLE "salary_advances" ADD COLUMN "note" TEXT;
ALTER TABLE "sales" ADD COLUMN "note" TEXT;
ALTER TABLE "users" ADD COLUMN "note" TEXT;

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "current_payable_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_cylinder_holds" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_with_supplier" INTEGER NOT NULL DEFAULT 0,
    "date_last_sent" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_cylinder_holds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_cylinder_sends" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_sent" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "supplier_cylinder_sends_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_receipts" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "refill_quantity" INTEGER NOT NULL DEFAULT 0,
    "new_quantity" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_now_amount" DECIMAL(14,2) NOT NULL,
    "paid_from_account_id" TEXT,
    "due_amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "supplier_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_payments" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_from_account_id" TEXT NOT NULL,
    "type" "SupplierPaymentType" NOT NULL,
    "note" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_cylinder_holds_supplier_id_product_id_key"
ON "supplier_cylinder_holds"("supplier_id", "product_id");

ALTER TABLE "supplier_cylinder_holds"
ADD CONSTRAINT "supplier_cylinder_holds_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_cylinder_holds"
ADD CONSTRAINT "supplier_cylinder_holds_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_cylinder_sends"
ADD CONSTRAINT "supplier_cylinder_sends_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_cylinder_sends"
ADD CONSTRAINT "supplier_cylinder_sends_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_cylinder_sends"
ADD CONSTRAINT "supplier_cylinder_sends_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_receipts"
ADD CONSTRAINT "supplier_receipts_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_receipts"
ADD CONSTRAINT "supplier_receipts_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_receipts"
ADD CONSTRAINT "supplier_receipts_paid_from_account_id_fkey"
FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_receipts"
ADD CONSTRAINT "supplier_receipts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments"
ADD CONSTRAINT "supplier_payments_supplier_id_fkey"
FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments"
ADD CONSTRAINT "supplier_payments_paid_from_account_id_fkey"
FOREIGN KEY ("paid_from_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_payments"
ADD CONSTRAINT "supplier_payments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
