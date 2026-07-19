import { PrismaClient, WingName, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Insaaf ERP (Oxygen wing)...");

  // 1. Wings — create all three so LPG/Retail can attach products later without FK rework.
  const [lpg, oxygen, retail] = await Promise.all(
    [WingName.INSAAF_LPG, WingName.INSAAF_OXYGEN, WingName.INSAAF_RETAIL].map((name) =>
      prisma.wing.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // 2. Users
  const adminPass = await bcrypt.hash("admin123", 10);
  const memberPass = await bcrypt.hash("member123", 10);
  const admin = await prisma.user.upsert({
    where: { phone: "01700000001" },
    update: {},
    create: { name: "Admin User", phone: "01700000001", email: "admin@insaaf.test", password_hash: adminPass, role: Role.ADMIN, is_active: true },
  });
  const member = await prisma.user.upsert({
    where: { phone: "01700000002" },
    update: {},
    create: { name: "Oxygen Counter Staff", phone: "01700000002", email: "member@insaaf.test", password_hash: memberPass, role: Role.MEMBER, wing_id: oxygen.id, is_active: true },
  });

  // 3. Accounts
  const cash = await prisma.account.upsert({ where: { id: "seed-acc-cash" }, update: {}, create: { id: "seed-acc-cash", name: "Cash", type: "Cash", current_balance: 50000 } });
  const bank = await prisma.account.upsert({ where: { id: "seed-acc-bank" }, update: {}, create: { id: "seed-acc-bank", name: "Bank - Dutch Bangla", type: "Bank", current_balance: 200000 } });
  const bkash = await prisma.account.upsert({ where: { id: "seed-acc-bkash" }, update: {}, create: { id: "seed-acc-bkash", name: "bKash Merchant", type: "bKash", current_balance: 15000 } });
  for (const [acc, bal] of [[cash, 50000], [bank, 200000], [bkash, 15000]] as const) {
    const existing = await prisma.accountLedgerEntry.findFirst({ where: { account_id: acc.id, reference_type: "OPENING_BALANCE" } });
    if (!existing) {
      await prisma.accountLedgerEntry.create({ data: { account_id: acc.id, type: "IN", amount: bal, reference_type: "OPENING_BALANCE", reference_id: acc.id, resulting_balance: bal } });
    }
  }

  // 4. Products (6-8 SKUs across gas types/sizes)
  const productDefs = [
    { category: "Industrial Oxygen", size_variant: "7m3", cost: 350, price: 550, stock: 40 },
    { category: "Industrial Oxygen", size_variant: "10m3", cost: 480, price: 750, stock: 25 },
    { category: "Medical Oxygen", size_variant: "10m3", cost: 520, price: 850, stock: 30 },
    { category: "Industrial CO2", size_variant: "40L", cost: 400, price: 650, stock: 20 },
    { category: "Medical CO2", size_variant: "40L", cost: 450, price: 700, stock: 15 },
    { category: "Nitrogen", size_variant: "7m3", cost: 300, price: 500, stock: 35 },
    { category: "Nitrogen", size_variant: "10m3", cost: 420, price: 680, stock: 18 },
  ];
  const products = [];
  for (const def of productDefs) {
    const existing = await prisma.product.findFirst({ where: { wing_id: oxygen.id, category: def.category, size_variant: def.size_variant } });
    const product = existing ?? (await prisma.product.create({
      data: {
        wing_id: oxygen.id,
        category: def.category,
        size_variant: def.size_variant,
        unit_cost_price: def.cost,
        unit_sale_price: def.price,
        reorder_level: 10,
        is_returnable: true,
        current_stock_qty: 0,
      },
    }));
    if (product.current_stock_qty === 0) {
      await prisma.stockLedgerEntry.create({
        data: { product_id: product.id, movement_type: StockMovementType.PURCHASE_IN, quantity: def.stock, reference_type: "OPENING_STOCK", reference_id: product.id, resulting_balance: def.stock },
      });
      await prisma.product.update({ where: { id: product.id }, data: { current_stock_qty: def.stock } });
    }
    products.push(product);
  }

  // 5. Customers (10, a few with due, a couple with cylinders on loan)
  const customerNames = [
    "Rahman Welding Works", "Dhaka Steel Fabricators", "Green Valley Hospital", "City Medical Center",
    "Karim Auto Workshop", "Sunrise Engineering", "Bashundhara Industries", "Metro Gas Traders",
    "Popular Diagnostic", "Eastern Manufacturing",
  ];
  const customers = [];
  for (const [i, name] of customerNames.entries()) {
    const existing = await prisma.customer.findFirst({ where: { name } });
    const c = existing ?? (await prisma.customer.create({ data: { name, phone: `018${(10000000 + i).toString()}`, address: "Dhaka, Bangladesh" } }));
    customers.push(c);
  }

  // 6. ~2 weeks of sample sales mixing sale types, returns, due payments, expenses, payroll
  const accountsCycle = [cash, bank, bkash];
  const today = new Date();
  for (let day = 13; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);

    const customer = customers[day % customers.length];
    const product = products[day % products.length];
    const account = accountsCycle[day % accountsCycle.length];
    const saleTypes = ["GAS_ONLY", "GAS_PLUS_CYLINDER", "CYLINDER_EXCHANGE"] as const;
    const saleType = saleTypes[day % saleTypes.length];
    const qty = 1 + (day % 3);
    const unitPrice = Number(product.unit_sale_price);
    const total = qty * unitPrice;
    const paidNow = day % 2 === 0 ? total : Math.round(total * 0.5);
    const due = total - paidNow;

    const sale = await prisma.sale.create({
      data: {
        date, wing_id: oxygen.id, customer_id: customer.id, user_id: day % 2 === 0 ? admin.id : member.id,
        sale_type: saleType, total_amount: total, paid_now_amount: paidNow,
        paid_into_account_id: paidNow > 0 ? account.id : undefined, due_amount: due,
        stock_deducted: saleType !== "GAS_ONLY",
        line_items: { create: [{ product_id: product.id, quantity: qty, unit_price: unitPrice, subtotal: total }] },
      },
    });

    if (saleType !== "GAS_ONLY") {
      const p = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
      const newBal = p.current_stock_qty - qty;
      await prisma.stockLedgerEntry.create({ data: { product_id: product.id, movement_type: StockMovementType.SALE_OUT, quantity: -qty, reference_type: "SALE", reference_id: sale.id, resulting_balance: newBal } });
      await prisma.product.update({ where: { id: product.id }, data: { current_stock_qty: newBal } });
    } else {
      const existingLoan = await prisma.cylinderLoan.findUnique({ where: { customer_id_product_id: { customer_id: customer.id, product_id: product.id } } });
      if (existingLoan) {
        await prisma.cylinderLoan.update({ where: { id: existingLoan.id }, data: { quantity_on_loan: existingLoan.quantity_on_loan + qty, linked_sale_id: sale.id } });
      } else {
        await prisma.cylinderLoan.create({ data: { customer_id: customer.id, product_id: product.id, quantity_on_loan: qty, linked_sale_id: sale.id } });
      }
    }

    if (due > 0) {
      const cust = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      await prisma.customer.update({ where: { id: customer.id }, data: { current_due_balance: Number(cust.current_due_balance) + due } });
    }
    if (paidNow > 0) {
      const acc = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
      const newBal = Number(acc.current_balance) + paidNow;
      await prisma.accountLedgerEntry.create({ data: { account_id: account.id, type: "IN", amount: paidNow, reference_type: "SALE", reference_id: sale.id, resulting_balance: newBal } });
      await prisma.account.update({ where: { id: account.id }, data: { current_balance: newBal } });
    }

    // A few returns
    if (day % 5 === 0) {
      const loan = await prisma.cylinderLoan.findUnique({ where: { customer_id_product_id: { customer_id: customer.id, product_id: product.id } } });
      if (loan && loan.quantity_on_loan > 0) {
        const returnQty = Math.min(1, loan.quantity_on_loan);
        const ret = await prisma.cylinderReturn.create({ data: { customer_id: customer.id, product_id: product.id, quantity_returned: returnQty, date, linked_loan_id: loan.id } });
        await prisma.cylinderLoan.update({ where: { id: loan.id }, data: { quantity_on_loan: loan.quantity_on_loan - returnQty } });
        const p = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
        const newBal = p.current_stock_qty + returnQty;
        await prisma.stockLedgerEntry.create({ data: { product_id: product.id, movement_type: StockMovementType.CYLINDER_RETURN_IN, quantity: returnQty, reference_type: "CYLINDER_RETURN", reference_id: ret.id, resulting_balance: newBal } });
        await prisma.product.update({ where: { id: product.id }, data: { current_stock_qty: newBal } });
      }
    }

    // A few due payments
    if (day % 4 === 0) {
      const cust = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
      const dueBal = Number(cust.current_due_balance);
      if (dueBal > 0) {
        const payAmt = Math.min(dueBal, 200);
        await prisma.duePayment.create({ data: { customer_id: customer.id, amount: payAmt, received_into_account_id: cash.id, user_id: admin.id, date } });
        await prisma.customer.update({ where: { id: customer.id }, data: { current_due_balance: dueBal - payAmt } });
        const acc = await prisma.account.findUniqueOrThrow({ where: { id: cash.id } });
        const newBal = Number(acc.current_balance) + payAmt;
        await prisma.accountLedgerEntry.create({ data: { account_id: cash.id, type: "IN", amount: payAmt, reference_type: "DUE_PAYMENT", reference_id: customer.id, resulting_balance: newBal } });
        await prisma.account.update({ where: { id: cash.id }, data: { current_balance: newBal } });
      }
    }

    // A few expenses
    if (day % 3 === 0) {
      const expAmt = 500 + day * 20;
      const exp = await prisma.expense.create({ data: { category: day % 2 === 0 ? "Fuel" : "Maintenance", amount: expAmt, date, paid_from_account_id: cash.id, wing_id: oxygen.id, note: "Seeded sample expense", user_id: admin.id } });
      const acc = await prisma.account.findUniqueOrThrow({ where: { id: cash.id } });
      const newBal = Number(acc.current_balance) - expAmt;
      await prisma.accountLedgerEntry.create({ data: { account_id: cash.id, type: "OUT", amount: expAmt, reference_type: "EXPENSE", reference_id: exp.id, resulting_balance: newBal } });
      await prisma.account.update({ where: { id: cash.id }, data: { current_balance: newBal } });
    }
  }

  // 7. Employees + one payroll cycle with an advance and an increment
  const employee = await prisma.employee.upsert({
    where: { id: "seed-emp-1" },
    update: {},
    create: { id: "seed-emp-1", name: "Jamal Hossain", role: "Delivery Driver", wing_id: oxygen.id, base_salary: 10000, join_date: new Date("2025-01-01"), is_active: true },
  });
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const existingAdvance = await prisma.salaryAdvance.findFirst({ where: { employee_id: employee.id, month_applied_to: month } });
  if (!existingAdvance) {
    await prisma.salaryAdvance.create({ data: { employee_id: employee.id, amount: 5000, paid_from_account_id: cash.id, month_applied_to: month } });
  }
  const existingIncrement = await prisma.salaryIncrement.findFirst({ where: { employee_id: employee.id, effective_month: month } });
  if (!existingIncrement) {
    await prisma.salaryIncrement.create({ data: { employee_id: employee.id, type: "ONE_TIME_BONUS", amount_or_new_base: 1000, effective_month: month, note: "Eid bonus (seed)" } });
  }

  console.log("Seed complete.");
  console.log(`Admin login:  phone=01700000001  password=admin123`);
  console.log(`Member login: phone=01700000002  password=member123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
