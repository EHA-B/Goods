import knex from "knex";
import path from "path";
import { app } from "electron";
import bcrypt from "bcrypt";
async function up$g(knex2) {
  await knex2.schema.createTable("customers", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("phone", 20);
    table.string("email", 100);
    table.text("address");
    table.decimal("balance", 15, 2).defaultTo(0);
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("phone");
    table.index("isActive");
  });
  await knex2.schema.createTable("suppliers", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("phone", 20);
    table.string("email", 100);
    table.text("address");
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("phone");
    table.index("isActive");
  });
  await knex2.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.string("unit", 20).notNullable();
    table.string("category", 50);
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("name");
    table.index("category");
    table.index("isActive");
  });
  await knex2.schema.createTable("stock_batches", (table) => {
    table.increments("id").primary();
    table.integer("product_id").unsigned().notNullable();
    table.integer("supplier_id").unsigned().notNullable();
    table.string("batch_code", 50).unique();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("remaining_quantity", 15, 3).notNullable();
    table.decimal("purchase_price", 15, 2).notNullable();
    table.date("received_date").notNullable();
    table.date("expiry_date");
    table.text("notes");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
    table.foreign("supplier_id").references("id").inTable("suppliers").onDelete("RESTRICT");
    table.index("product_id");
    table.index("supplier_id");
    table.index("batch_code");
    table.index("received_date");
    table.index("remaining_quantity");
  });
  await knex2.schema.createTable("purchase_invoices", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("supplier_id").unsigned().notNullable();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.decimal("remaining_amount", 15, 2).defaultTo(0);
    table.string("status", 20).defaultTo("draft");
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("supplier_id").references("id").inTable("suppliers").onDelete("RESTRICT");
    table.index("supplier_id");
    table.index("invoice_number");
    table.index("invoice_date");
    table.index("status");
  });
  await knex2.schema.createTable("purchase_invoice_items", (table) => {
    table.increments("id").primary();
    table.integer("purchase_invoice_id").unsigned().notNullable();
    table.integer("product_id").unsigned().notNullable();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("unit_price", 15, 2).notNullable();
    table.decimal("line_total", 15, 2).notNullable();
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("purchase_invoice_id").references("id").inTable("purchase_invoices").onDelete("CASCADE");
    table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
    table.index("purchase_invoice_id");
    table.index("product_id");
  });
  await knex2.schema.createTable("sale_types", (table) => {
    table.increments("id").primary();
    table.string("name", 50).unique().notNullable();
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("isActive");
  });
  await knex2.schema.createTable("sale_invoices", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("customer_id").unsigned().nullable();
    table.integer("sale_type_id").unsigned().nullable();
    table.integer("cashbox_id").unsigned();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("discount_amount", 15, 2).defaultTo(0);
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.decimal("commission_amount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.decimal("remaining_amount", 15, 2).defaultTo(0);
    table.string("status", 20).defaultTo("draft");
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("customer_id").references("id").inTable("customers").onDelete("SET NULL");
    table.foreign("sale_type_id").references("id").inTable("sale_types").onDelete("SET NULL");
    table.index("customer_id");
    table.index("invoice_number");
    table.index("invoice_date");
    table.index("status");
    table.index("cashbox_id");
  });
  await knex2.schema.createTable("sale_invoice_items", (table) => {
    table.increments("id").primary();
    table.integer("sale_invoice_id").unsigned().notNullable();
    table.integer("stock_batch_id").unsigned().notNullable();
    table.decimal("quantity", 15, 3).notNullable();
    table.decimal("unit_price", 15, 2).notNullable();
    table.decimal("line_total", 15, 2).notNullable();
    table.decimal("cost_price", 15, 2).notNullable();
    table.decimal("profit", 15, 2).defaultTo(0);
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("sale_invoice_id").references("id").inTable("sale_invoices").onDelete("CASCADE");
    table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
    table.index("sale_invoice_id");
    table.index("stock_batch_id");
  });
  await knex2.schema.createTable("cashboxes", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.integer("parent_id").unsigned().nullable();
    table.decimal("balance", 15, 2).defaultTo(0);
    table.decimal("initial_balance", 15, 2).defaultTo(0);
    table.string("currency", 10).defaultTo("SYP");
    table.boolean("isActive").defaultTo(true);
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("parent_id").references("id").inTable("cashboxes").onDelete("SET NULL");
    table.index("parent_id");
    table.index("isActive");
  });
  await knex2.schema.createTable("cashbox_transactions", (table) => {
    table.increments("id").primary();
    table.integer("cashbox_id").unsigned().notNullable();
    table.enum("reference_type", ["sale", "purchase", "expense", "income", "transfer"]).notNullable();
    table.integer("reference_id").notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["in", "out"]).notNullable();
    table.decimal("balance_before", 15, 2).notNullable();
    table.decimal("balance_after", 15, 2).notNullable();
    table.dateTime("transaction_date").defaultTo(knex2.fn.now());
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index("cashbox_id");
    table.index(["reference_type", "reference_id"]);
    table.index("transaction_date");
  });
  await knex2.schema.createTable("transaction_categories", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable();
    table.enum("type", ["expense", "income"]).notNullable();
    table.text("description");
    table.boolean("isActive").defaultTo(true);
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("type");
    table.index("isActive");
  });
  await knex2.schema.createTable("transactions", (table) => {
    table.increments("id").primary();
    table.integer("category_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["expense", "income"]).notNullable();
    table.date("transaction_date").notNullable();
    table.text("description");
    table.string("reference_number", 50);
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("category_id").references("id").inTable("transaction_categories").onDelete("RESTRICT");
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index("category_id");
    table.index("cashbox_id");
    table.index("transaction_date");
    table.index("direction");
  });
  await knex2.schema.createTable("payments", (table) => {
    table.increments("id").primary();
    table.enum("party_type", ["customer", "supplier"]).notNullable();
    table.integer("party_id").nullable();
    table.enum("payment_type", ["sale", "purchase"]).notNullable();
    table.integer("invoice_id").notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.date("payment_date").notNullable();
    table.enum("payment_method", ["cash", "bank", "credit_card", "cheque", "online"]).defaultTo("cash");
    table.string("reference_number", 50);
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index(["party_type", "party_id"]);
    table.index(["payment_type", "invoice_id"]);
    table.index("cashbox_id");
    table.index("payment_date");
  });
  await knex2.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("username", 50).unique().notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("full_name", 100).notNullable();
    table.string("email", 100).unique();
    table.string("phone", 20);
    table.enum("role", ["admin", "manager", "cashier", "viewer"]).defaultTo("cashier");
    table.boolean("isActive").defaultTo(true);
    table.dateTime("last_login");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("username");
    table.index("email");
    table.index("isActive");
  });
  await knex2.schema.createTable("activity_logs", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().nullable();
    table.string("action", 100).notNullable();
    table.string("table_name", 50).notNullable();
    table.integer("record_id").notNullable();
    table.json("old_data");
    table.json("new_data");
    table.string("ip_address", 45);
    table.text("user_agent");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.index("user_id");
    table.index("table_name");
    table.index("created_at");
  });
  await knex2.schema.createTable("settings", (table) => {
    table.increments("id").primary();
    table.string("setting_key", 50).unique().notNullable();
    table.text("setting_value");
    table.text("description");
    table.string("category", 50).defaultTo("general");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.index("setting_key");
    table.index("category");
  });
  await knex2.schema.alterTable("sale_invoices", (table) => {
    table.index(["customer_id", "status"]);
    table.index(["invoice_date", "status"]);
  });
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.index(["supplier_id", "status"]);
  });
  await knex2.schema.alterTable("stock_batches", (table) => {
    table.index(["product_id", "remaining_quantity"]);
  });
  await knex2.schema.alterTable("cashbox_transactions", (table) => {
    table.index(["cashbox_id", "transaction_date"]);
  });
  await knex2.schema.alterTable("payments", (table) => {
    table.index(["party_type", "party_id", "payment_date"]);
  });
}
async function down$g(knex2) {
  await knex2.schema.dropTableIfExists("activity_logs");
  await knex2.schema.dropTableIfExists("payments");
  await knex2.schema.dropTableIfExists("transactions");
  await knex2.schema.dropTableIfExists("transaction_categories");
  await knex2.schema.dropTableIfExists("cashbox_transactions");
  await knex2.schema.dropTableIfExists("cashboxes");
  await knex2.schema.dropTableIfExists("sale_invoice_items");
  await knex2.schema.dropTableIfExists("sale_invoices");
  await knex2.schema.dropTableIfExists("sale_types");
  await knex2.schema.dropTableIfExists("purchase_invoice_items");
  await knex2.schema.dropTableIfExists("purchase_invoices");
  await knex2.schema.dropTableIfExists("stock_batches");
  await knex2.schema.dropTableIfExists("products");
  await knex2.schema.dropTableIfExists("suppliers");
  await knex2.schema.dropTableIfExists("customers");
  await knex2.schema.dropTableIfExists("users");
  await knex2.schema.dropTableIfExists("settings");
}
const initialSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$g,
  up: up$g
}, Symbol.toStringTag, { value: "Module" }));
async function up$f(knex2) {
  await knex2.schema.alterTable("suppliers", (table) => {
    table.decimal("balance", 15, 2).defaultTo(0);
  });
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.enum("invoice_type", ["standard", "consignment"]).defaultTo("standard");
  });
  await knex2.schema.alterTable("stock_batches", (table) => {
    table.integer("purchase_invoice_id").unsigned().nullable();
    table.foreign("purchase_invoice_id").references("id").inTable("purchase_invoices").onDelete("SET NULL");
  });
  await knex2.schema.createTable("stock_adjustments", (table) => {
    table.increments("id").primary();
    table.integer("stock_batch_id").unsigned().notNullable();
    table.decimal("quantity", 15, 3).notNullable();
    table.string("reason", 255).notNullable();
    table.text("notes");
    table.timestamp("created_at").defaultTo(knex2.fn.now());
    table.timestamp("updated_at").defaultTo(knex2.fn.now());
    table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
    table.index("stock_batch_id");
  });
  const existingCashbox = await knex2("cashboxes").where("name", "الصندوق الرئيسي (ل.س)").first();
  if (!existingCashbox) {
    const [sypId] = await knex2("cashboxes").insert({
      name: "الصندوق الرئيسي (ل.س)",
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: "SYP",
      isActive: true,
      notes: "الصندوق الرئيسي بالليرة السورية",
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
    await knex2("cashboxes").insert({
      name: "الصندوق الرئيسي (دولار)",
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: "USD",
      isActive: true,
      notes: "الصندوق الرئيسي بالدولار الأمريكي",
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
    await knex2("cashboxes").insert({
      name: "صندوق الأمانة (العمولة)",
      parent_id: sypId || 1,
      initial_balance: 0,
      balance: 0,
      currency: "SYP",
      isActive: true,
      notes: "خاص ببيانات البيع بالعمولة و فواتير الأمانة",
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
  }
}
async function down$f(knex2) {
  await knex2.schema.dropTableIfExists("stock_adjustments");
  await knex2.schema.alterTable("stock_batches", (table) => {
    table.dropColumn("purchase_invoice_id");
  });
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.dropColumn("invoice_type");
  });
  await knex2.schema.alterTable("suppliers", (table) => {
    table.dropColumn("balance");
  });
}
const consignmentMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$f,
  up: up$f
}, Symbol.toStringTag, { value: "Module" }));
async function up$e(knex2) {
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (!hasCode) {
    await knex2.schema.alterTable("products", (table) => {
      table.string("code", 50).nullable();
    });
  }
  const products = await knex2("products").select("id").whereNull("code").orWhere("code", "");
  for (const product of products) {
    const generatedCode = `PRD-${String(product.id).padStart(6, "0")}`;
    await knex2("products").where({ id: product.id }).update({ code: generatedCode });
  }
  await knex2.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code)"
  );
}
async function down$e(knex2) {
  await knex2.raw("DROP INDEX IF EXISTS products_code_unique");
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (hasCode) {
    await knex2.schema.alterTable("products", (table) => {
      table.dropColumn("code");
    });
  }
}
const productCodeMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$e,
  up: up$e
}, Symbol.toStringTag, { value: "Module" }));
async function up$d(knex2) {
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (!hasCode) return;
  await knex2("products").where("code", "").update({ code: null });
  await knex2.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex2.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code) WHERE code IS NOT NULL"
  );
}
async function down$d(knex2) {
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (!hasCode) return;
  await knex2.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex2.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code)"
  );
}
const optionalProductCodeMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$d,
  up: up$d
}, Symbol.toStringTag, { value: "Module" }));
async function up$c(knex2) {
  await knex2.schema.alterTable("stock_adjustments", (table) => {
    table.decimal("quantity_before", 15, 3).notNullable().defaultTo(0);
    table.decimal("quantity_after", 15, 3).notNullable().defaultTo(0);
  });
}
async function down$c(knex2) {
  await knex2.schema.alterTable("stock_adjustments", (table) => {
    table.dropColumn("quantity_before");
    table.dropColumn("quantity_after");
  });
}
const quantityBeforeAfterMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$c,
  up: up$c
}, Symbol.toStringTag, { value: "Module" }));
async function up$b(knex2) {
  const beforeCount = await knex2("cashbox_transactions").count("* as cnt").first();
  const rowCount = Number(beforeCount.cnt ?? 0);
  await knex2.schema.createTable("cashbox_transactions_new", (table) => {
    table.increments("id").primary();
    table.integer("cashbox_id").unsigned().notNullable();
    table.string("reference_type", 50).notNullable();
    table.integer("reference_id").nullable();
    table.decimal("amount", 15, 2).notNullable();
    table.string("direction", 3).notNullable();
    table.decimal("balance_before", 15, 2).nullable();
    table.decimal("balance_after", 15, 2).nullable();
    table.string("transfer_group_id", 100).nullable();
    table.integer("reversed_transaction_id").nullable();
    table.text("reversal_reason").nullable();
    table.date("transaction_date").notNullable().defaultTo(knex2.fn.now());
    table.text("notes").nullable();
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
  });
  await knex2.raw(`
    INSERT INTO cashbox_transactions_new
      (id, cashbox_id, reference_type, reference_id, amount, direction,
       balance_before, balance_after, transfer_group_id, reversed_transaction_id,
       reversal_reason, transaction_date, notes, created_at, updated_at)
    SELECT
      id, cashbox_id,
      reference_type,
      reference_id,
      amount,
      direction,
      balance_before,
      balance_after,
      NULL AS transfer_group_id,
      NULL AS reversed_transaction_id,
      NULL AS reversal_reason,
      transaction_date,
      notes,
      created_at,
      updated_at
    FROM cashbox_transactions
  `);
  const afterCount = await knex2("cashbox_transactions_new").count("* as cnt").first();
  const newRowCount = Number(afterCount.cnt ?? 0);
  if (newRowCount !== rowCount) {
    throw new Error(
      `Migration data verification failed: original table had ${rowCount} rows, new table has ${newRowCount} rows.`
    );
  }
  await knex2.schema.dropTable("cashbox_transactions");
  await knex2.schema.renameTable("cashbox_transactions_new", "cashbox_transactions");
  await knex2.schema.alterTable("cashbox_transactions", (table) => {
    table.index("cashbox_id", "idx_cbt_cashbox_id");
    table.index("reference_type", "idx_cbt_reference_type");
    table.index("reference_id", "idx_cbt_reference_id");
    table.index("transaction_date", "idx_cbt_transaction_date");
    table.index("transfer_group_id", "idx_cbt_transfer_group_id");
    table.index("reversed_transaction_id", "idx_cbt_reversed_transaction_id");
    table.index(["cashbox_id", "transaction_date"], "idx_cbt_cashbox_date");
  });
}
async function down$b(knex2) {
  await knex2.schema.createTable("cashbox_transactions_orig", (table) => {
    table.increments("id").primary();
    table.integer("cashbox_id").unsigned().notNullable();
    table.string("reference_type", 50).notNullable();
    table.integer("reference_id").notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.string("direction", 3).notNullable();
    table.decimal("balance_before", 15, 2).notNullable();
    table.decimal("balance_after", 15, 2).notNullable();
    table.date("transaction_date").notNullable().defaultTo(knex2.fn.now());
    table.text("notes").nullable();
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
  });
  await knex2.raw(`
    INSERT INTO cashbox_transactions_orig
      (id, cashbox_id, reference_type, reference_id, amount, direction,
       balance_before, balance_after, transaction_date, notes, created_at, updated_at)
    SELECT
      id, cashbox_id, reference_type,
      COALESCE(reference_id, 0) AS reference_id,
      amount, direction,
      COALESCE(balance_before, 0) AS balance_before,
      COALESCE(balance_after, 0) AS balance_after,
      transaction_date, notes, created_at, updated_at
    FROM cashbox_transactions
  `);
  await knex2.schema.dropTable("cashbox_transactions");
  await knex2.schema.renameTable("cashbox_transactions_orig", "cashbox_transactions");
  await knex2.schema.alterTable("cashbox_transactions", (table) => {
    table.index("cashbox_id");
    table.index(["reference_type", "reference_id"]);
    table.index("transaction_date");
    table.index(["cashbox_id", "transaction_date"]);
  });
}
const cashboxAccountingHardening = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$b,
  up: up$b
}, Symbol.toStringTag, { value: "Module" }));
async function up$a(knex2) {
  const existingUser = await knex2("users").orderBy("id", "asc").first();
  if (!existingUser) {
    const passwordHash = await bcrypt.hash("password", 12);
    await knex2("users").insert({
      username: "admin",
      password_hash: passwordHash,
      full_name: "مدير النظام",
      role: "admin",
      isActive: true,
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
  }
}
async function down$a(_knex) {
}
const singleUserAuthMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$a,
  up: up$a
}, Symbol.toStringTag, { value: "Module" }));
async function up$9(knex2) {
  const piCount = await knex2("purchase_invoices").count("* as cnt").first();
  const piRows = Number(piCount.cnt ?? 0);
  await knex2.schema.createTable("purchase_invoices_new", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("supplier_id").unsigned().notNullable();
    table.string("invoice_type", 20).defaultTo("standard");
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("discount_amount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.decimal("remaining_amount", 15, 2).defaultTo(0);
    table.string("status", 20).defaultTo("draft");
    table.text("notes").nullable();
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("supplier_id").references("id").inTable("suppliers").onDelete("RESTRICT");
    table.index("supplier_id", "idx_pi_new_supplier_id");
    table.index("invoice_number", "idx_pi_new_invoice_number");
    table.index("invoice_date", "idx_pi_new_invoice_date");
    table.index("status", "idx_pi_new_status");
  });
  await knex2.raw(`
    INSERT INTO purchase_invoices_new
      (id, invoice_number, supplier_id, invoice_type, invoice_date,
       subtotal, discount, discount_amount, tax, total, paid_amount, remaining_amount, status, notes, created_at, updated_at)
    SELECT
      id, invoice_number, supplier_id,
      COALESCE(invoice_type, 'standard'),
      invoice_date, subtotal,
      COALESCE(discount, 0),
      COALESCE(discount, 0),
      COALESCE(tax, 0),
      total,
      COALESCE(paid_amount, 0),
      MAX(0, total - COALESCE(paid_amount, 0)),
      CASE status
        WHEN 'paid' THEN 'paid'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'confirmed' THEN
          CASE
            WHEN COALESCE(paid_amount, 0) = 0 THEN 'confirmed'
            WHEN COALESCE(paid_amount, 0) >= total THEN 'paid'
            ELSE 'partially_paid'
          END
        ELSE COALESCE(status, 'draft')
      END,
      notes, created_at, updated_at
    FROM purchase_invoices
  `);
  const piNewCount = await knex2("purchase_invoices_new").count("* as cnt").first();
  if (Number(piNewCount.cnt ?? 0) !== piRows) {
    throw new Error("purchase_invoices migration row count mismatch");
  }
  await knex2.schema.dropTable("purchase_invoices");
  await knex2.schema.renameTable("purchase_invoices_new", "purchase_invoices");
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.index(["supplier_id", "status"], "idx_pi_supplier_status");
    table.index(["invoice_date", "status"], "idx_pi_date_status");
  });
  const siCount = await knex2("sale_invoices").count("* as cnt").first();
  const siRows = Number(siCount.cnt ?? 0);
  await knex2.schema.createTable("sale_invoices_new", (table) => {
    table.increments("id").primary();
    table.string("invoice_number", 50).unique().notNullable();
    table.integer("customer_id").unsigned().nullable();
    table.integer("sale_type_id").unsigned().nullable();
    table.integer("cashbox_id").unsigned().nullable();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("discount_amount", 15, 2).defaultTo(0);
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.decimal("commission_amount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.decimal("remaining_amount", 15, 2).defaultTo(0);
    table.string("status", 20).defaultTo("draft");
    table.text("notes").nullable();
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("customer_id").references("id").inTable("customers").onDelete("RESTRICT");
    table.index("customer_id", "idx_si_new_customer_id");
    table.index("invoice_number", "idx_si_new_invoice_number");
    table.index("invoice_date", "idx_si_new_invoice_date");
    table.index("status", "idx_si_new_status");
    table.index("cashbox_id", "idx_si_new_cashbox_id");
  });
  await knex2.raw(`
    INSERT INTO sale_invoices_new
      (id, invoice_number, customer_id, sale_type_id, cashbox_id, invoice_date,
       subtotal, discount, discount_amount, commission_percentage, commission_amount,
       tax, total, paid_amount, remaining_amount, status, notes, created_at, updated_at)
    SELECT
      id, invoice_number, customer_id, sale_type_id, cashbox_id, invoice_date,
      subtotal,
      COALESCE(discount, 0),
      COALESCE(discount, 0),
      COALESCE(commission_percentage, 0),
      COALESCE(commission_amount, 0),
      COALESCE(tax, 0),
      total,
      COALESCE(paid_amount, 0),
      MAX(0, total - COALESCE(paid_amount, 0)),
      CASE status
        WHEN 'paid' THEN 'paid'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'confirmed' THEN
          CASE
            WHEN COALESCE(paid_amount, 0) = 0 THEN 'confirmed'
            WHEN COALESCE(paid_amount, 0) >= total THEN 'paid'
            ELSE 'partially_paid'
          END
        ELSE COALESCE(status, 'draft')
      END,
      notes, created_at, updated_at
    FROM sale_invoices
  `);
  const siNewCount = await knex2("sale_invoices_new").count("* as cnt").first();
  if (Number(siNewCount.cnt ?? 0) !== siRows) {
    throw new Error("sale_invoices migration row count mismatch");
  }
  await knex2.schema.dropTable("sale_invoices");
  await knex2.schema.renameTable("sale_invoices_new", "sale_invoices");
  await knex2.schema.alterTable("sale_invoices", (table) => {
    table.index(["customer_id", "status"], "idx_si_customer_status");
    table.index(["invoice_date", "status"], "idx_si_date_status");
  });
  const hasStatus = await knex2.schema.hasColumn("payments", "status");
  if (!hasStatus) {
    await knex2.schema.alterTable("payments", (table) => {
      table.string("status", 20).defaultTo("active");
      table.integer("reversed_payment_id").nullable();
      table.integer("cashbox_transaction_id").nullable();
      table.decimal("balance_before", 15, 2).nullable();
      table.decimal("balance_after", 15, 2).nullable();
      table.integer("created_by").nullable();
      table.text("reversal_reason").nullable();
    });
    await knex2("payments").update({ status: "active" });
    await knex2.schema.alterTable("payments", (table) => {
      table.index("status", "idx_pay_status");
      table.index("reversed_payment_id", "idx_pay_reversed_id");
    });
  }
  const hasStockMovements = await knex2.schema.hasTable("stock_movements");
  if (!hasStockMovements) {
    await knex2.schema.createTable("stock_movements", (table) => {
      table.increments("id").primary();
      table.integer("product_id").unsigned().notNullable();
      table.integer("stock_batch_id").unsigned().notNullable();
      table.string("movement_type", 30).notNullable();
      table.decimal("quantity", 15, 3).notNullable();
      table.decimal("quantity_before", 15, 3).notNullable();
      table.decimal("quantity_after", 15, 3).notNullable();
      table.string("reference_type", 30).nullable();
      table.integer("reference_id").nullable();
      table.string("reference_number", 50).nullable();
      table.integer("supplier_id").unsigned().nullable();
      table.integer("customer_id").unsigned().nullable();
      table.text("notes").nullable();
      table.integer("created_by").nullable();
      table.timestamp("created_at").nullable();
      table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
      table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
      table.index("product_id", "idx_sm_product_id");
      table.index("stock_batch_id", "idx_sm_batch_id");
      table.index("movement_type", "idx_sm_movement_type");
      table.index("reference_type", "idx_sm_ref_type");
      table.index("reference_id", "idx_sm_ref_id");
      table.index("created_at", "idx_sm_created_at");
    });
  }
}
async function down$9(knex2) {
  await knex2.schema.dropTableIfExists("stock_movements");
}
const sales_purchases_hardening = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$9,
  up: up$9
}, Symbol.toStringTag, { value: "Module" }));
async function up$8(knex2) {
  await knex2.schema.createTable("consignment_settlements", (table) => {
    table.increments("id").primary();
    table.integer("purchase_invoice_id").unsigned().notNullable();
    table.string("settlement_number").notNullable().unique();
    table.timestamp("settlement_date").notNullable();
    table.decimal("total_sales_amount", 15, 2).notNullable();
    table.decimal("commission_percentage", 5, 2).notNullable();
    table.decimal("commission_amount", 15, 2).notNullable();
    table.decimal("supplier_share", 15, 2).notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.integer("cashbox_transaction_id").unsigned().nullable();
    table.integer("payment_id").unsigned().nullable();
    table.string("currency", 3).notNullable();
    table.string("remaining_stock_policy").notNullable();
    table.decimal("returned_quantity", 15, 3).defaultTo(0);
    table.decimal("spoilage_quantity", 15, 3).defaultTo(0);
    table.decimal("carried_quantity", 15, 3).defaultTo(0);
    table.string("status").notNullable().defaultTo("completed");
    table.integer("reversed_settlement_id").unsigned().nullable();
    table.string("reversal_reason").nullable();
    table.text("notes").nullable();
    table.integer("created_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex2.fn.now());
    table.timestamp("updated_at").defaultTo(knex2.fn.now());
    table.foreign("purchase_invoice_id").references("id").inTable("purchase_invoices").onDelete("RESTRICT");
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.index("purchase_invoice_id");
    table.index("cashbox_id");
    table.index("status");
    table.index("settlement_date");
  });
  await knex2.schema.createTable("consignment_settlement_items", (table) => {
    table.increments("id").primary();
    table.integer("settlement_id").unsigned().notNullable();
    table.integer("purchase_invoice_item_id").unsigned().nullable();
    table.integer("product_id").unsigned().notNullable();
    table.integer("stock_batch_id").unsigned().notNullable();
    table.decimal("received_quantity", 15, 3).notNullable();
    table.decimal("sold_quantity", 15, 3).notNullable();
    table.decimal("remaining_quantity", 15, 3).notNullable();
    table.decimal("sales_amount", 15, 2).notNullable();
    table.string("resolution_policy").notNullable();
    table.decimal("resolved_quantity", 15, 3).notNullable();
    table.integer("stock_movement_id").unsigned().nullable();
    table.text("notes").nullable();
    table.timestamp("created_at").defaultTo(knex2.fn.now());
    table.foreign("settlement_id").references("id").inTable("consignment_settlements").onDelete("CASCADE");
    table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
    table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
  });
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.string("settlement_status").defaultTo("pending");
    table.timestamp("settled_at").nullable();
    table.integer("consignment_settlement_id").unsigned().nullable();
  });
}
async function down$8(knex2) {
  await knex2.schema.alterTable("purchase_invoices", (table) => {
    table.dropColumn("settlement_status");
    table.dropColumn("settled_at");
    table.dropColumn("consignment_settlement_id");
  });
  await knex2.schema.dropTableIfExists("consignment_settlement_items");
  await knex2.schema.dropTableIfExists("consignment_settlements");
}
const consignmentSettlementsMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$8,
  up: up$8
}, Symbol.toStringTag, { value: "Module" }));
async function up$7(knex2) {
  const beforeCount = await knex2("transactions").count("* as cnt").first();
  const rowCount = Number(beforeCount.cnt ?? 0);
  await knex2.schema.createTable("transactions_new", (table) => {
    table.increments("id").primary();
    table.integer("category_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["expense", "income"]).notNullable();
    table.date("transaction_date").notNullable();
    table.text("description");
    table.string("reference_number", 50);
    table.text("notes");
    table.string("status", 20).defaultTo("active").notNullable();
    table.integer("cashbox_transaction_id").unsigned().nullable();
    table.timestamp("cancelled_at").nullable();
    table.text("cancellation_reason").nullable();
    table.integer("reversed_transaction_id").unsigned().nullable();
    table.integer("created_by").unsigned().nullable();
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("category_id").references("id").inTable("transaction_categories").onDelete("RESTRICT");
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    table.foreign("cashbox_transaction_id").references("id").inTable("cashbox_transactions").onDelete("RESTRICT");
  });
  await knex2.raw(`
    INSERT INTO transactions_new
      (id, category_id, cashbox_id, amount, direction, transaction_date, 
       description, reference_number, notes, created_at, updated_at, status)
    SELECT
      id, category_id, cashbox_id, amount, direction, transaction_date, 
      description, reference_number, notes, created_at, updated_at, 'active' as status
    FROM transactions
  `);
  const afterCount = await knex2("transactions_new").count("* as cnt").first();
  const newRowCount = Number(afterCount.cnt ?? 0);
  if (newRowCount !== rowCount) {
    throw new Error(
      `Migration data verification failed: original table had ${rowCount} rows, new table has ${newRowCount} rows.`
    );
  }
  await knex2.schema.dropTable("transactions");
  await knex2.schema.renameTable("transactions_new", "transactions");
  await knex2.schema.alterTable("transactions", (table) => {
    table.index("category_id");
    table.index("cashbox_id");
    table.index("transaction_date");
    table.index("direction");
    table.index("status");
    table.index("cashbox_transaction_id");
    table.index("reversed_transaction_id");
  });
}
async function down$7(knex2) {
  await knex2.schema.createTable("transactions_orig", (table) => {
    table.increments("id").primary();
    table.integer("category_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned().notNullable();
    table.decimal("amount", 15, 2).notNullable();
    table.enum("direction", ["expense", "income"]).notNullable();
    table.date("transaction_date").notNullable();
    table.text("description");
    table.string("reference_number", 50);
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("category_id").references("id").inTable("transaction_categories").onDelete("RESTRICT");
    table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
  });
  await knex2.raw(`
    INSERT INTO transactions_orig
      (id, category_id, cashbox_id, amount, direction, transaction_date, 
       description, reference_number, notes, created_at, updated_at)
    SELECT
      id, category_id, cashbox_id, amount, direction, transaction_date, 
      description, reference_number, notes, created_at, updated_at
    FROM transactions
  `);
  await knex2.schema.dropTable("transactions");
  await knex2.schema.renameTable("transactions_orig", "transactions");
  await knex2.schema.alterTable("transactions", (table) => {
    table.index("category_id");
    table.index("cashbox_id");
    table.index("transaction_date");
    table.index("direction");
  });
}
const financialTransactionsHardening = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$7,
  up: up$7
}, Symbol.toStringTag, { value: "Module" }));
async function up$6(knex2) {
  const hasPurchaseInvoices = await knex2.schema.hasTable("purchase_invoices");
  if (!hasPurchaseInvoices) return;
  if (!await knex2.schema.hasColumn("purchase_invoices", "discount_amount")) {
    await knex2.schema.alterTable("purchase_invoices", (table) => {
      table.decimal("discount_amount", 15, 2).notNullable().defaultTo(0);
    });
    await knex2.raw(`
      UPDATE purchase_invoices
      SET discount_amount = COALESCE(discount, 0)
    `);
  }
  if (!await knex2.schema.hasColumn("purchase_invoices", "remaining_amount")) {
    await knex2.schema.alterTable("purchase_invoices", (table) => {
      table.decimal("remaining_amount", 15, 2).notNullable().defaultTo(0);
    });
    await knex2.raw(`
      UPDATE purchase_invoices
      SET remaining_amount = CASE
        WHEN COALESCE(total, 0) - COALESCE(paid_amount, 0) > 0
          THEN COALESCE(total, 0) - COALESCE(paid_amount, 0)
        ELSE 0
      END
    `);
  }
  const hasPayments = await knex2.schema.hasTable("payments");
  if (hasPayments) {
    const paymentColumns = [
      ["status", (table) => table.string("status", 20).notNullable().defaultTo("active")],
      ["reversed_payment_id", (table) => table.integer("reversed_payment_id").nullable()],
      ["cashbox_transaction_id", (table) => table.integer("cashbox_transaction_id").nullable()],
      ["balance_before", (table) => table.decimal("balance_before", 15, 2).nullable()],
      ["balance_after", (table) => table.decimal("balance_after", 15, 2).nullable()],
      ["created_by", (table) => table.integer("created_by").nullable()],
      ["reversal_reason", (table) => table.text("reversal_reason").nullable()]
    ];
    for (const [column, addColumn] of paymentColumns) {
      if (!await knex2.schema.hasColumn("payments", column)) {
        await knex2.schema.alterTable("payments", addColumn);
      }
    }
    await knex2("payments").whereNull("status").update({ status: "active" });
  }
  if (!await knex2.schema.hasTable("stock_movements")) {
    await knex2.schema.createTable("stock_movements", (table) => {
      table.increments("id").primary();
      table.integer("product_id").unsigned().notNullable();
      table.integer("stock_batch_id").unsigned().notNullable();
      table.string("movement_type", 40).notNullable();
      table.decimal("quantity", 15, 3).notNullable();
      table.decimal("quantity_before", 15, 3).notNullable();
      table.decimal("quantity_after", 15, 3).notNullable();
      table.string("reference_type", 40).nullable();
      table.integer("reference_id").nullable();
      table.string("reference_number", 100).nullable();
      table.integer("supplier_id").unsigned().nullable();
      table.integer("customer_id").unsigned().nullable();
      table.text("notes").nullable();
      table.integer("created_by").nullable();
      table.timestamp("created_at").nullable();
      table.foreign("product_id").references("id").inTable("products").onDelete("RESTRICT");
      table.foreign("stock_batch_id").references("id").inTable("stock_batches").onDelete("RESTRICT");
      table.index("product_id", "idx_sm_product_id");
      table.index("stock_batch_id", "idx_sm_batch_id");
      table.index("movement_type", "idx_sm_movement_type");
      table.index("reference_type", "idx_sm_reference_type");
      table.index("reference_id", "idx_sm_reference_id");
      table.index("created_at", "idx_sm_created_at");
    });
  }
}
async function down$6(_knex) {
}
const purchaseRuntimeCompatibility = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$6,
  up: up$6
}, Symbol.toStringTag, { value: "Module" }));
const TABLE_NAME$1 = "sale_invoices";
const TEMP_TABLE_NAME$1 = "sale_invoices_runtime_compatibility_tmp";
function rowsFromRaw$1(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result) {
    const rows = result.rows;
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}
async function up$5(knex2) {
  if (!await knex2.schema.hasTable(TABLE_NAME$1)) return;
  const tableInfo = rowsFromRaw$1(
    await knex2.raw(`PRAGMA table_info(${TABLE_NAME$1})`)
  );
  const columns = new Set(tableInfo.map((column) => column.name));
  const customerColumn = tableInfo.find((column) => column.name === "customer_id");
  const saleTypeColumn = tableInfo.find((column) => column.name === "sale_type_id");
  const schemaAlreadyCompatible = columns.has("discount_amount") && columns.has("remaining_amount") && Number((customerColumn == null ? void 0 : customerColumn.notnull) ?? 0) === 0 && Number((saleTypeColumn == null ? void 0 : saleTypeColumn.notnull) ?? 0) === 0;
  if (schemaAlreadyCompatible) return;
  const oldCountRow = await knex2(TABLE_NAME$1).count({ count: "*" }).first();
  const oldCount = Number((oldCountRow == null ? void 0 : oldCountRow.count) ?? 0);
  await knex2.raw("PRAGMA foreign_keys = OFF");
  try {
    await knex2.schema.dropTableIfExists(TEMP_TABLE_NAME$1);
    await knex2.schema.createTable(TEMP_TABLE_NAME$1, (table) => {
      table.increments("id").primary();
      table.string("invoice_number", 50).notNullable().unique();
      table.integer("customer_id").unsigned().nullable();
      table.integer("sale_type_id").unsigned().nullable();
      table.integer("cashbox_id").unsigned().nullable();
      table.date("invoice_date").notNullable();
      table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
      table.decimal("discount", 15, 2).notNullable().defaultTo(0);
      table.decimal("discount_amount", 15, 2).notNullable().defaultTo(0);
      table.decimal("commission_percentage", 5, 2).notNullable().defaultTo(0);
      table.decimal("commission_amount", 15, 2).notNullable().defaultTo(0);
      table.decimal("tax", 15, 2).notNullable().defaultTo(0);
      table.decimal("total", 15, 2).notNullable().defaultTo(0);
      table.decimal("paid_amount", 15, 2).notNullable().defaultTo(0);
      table.decimal("remaining_amount", 15, 2).notNullable().defaultTo(0);
      table.string("status", 20).notNullable().defaultTo("draft");
      table.text("notes").nullable();
      table.timestamp("cancelled_at").nullable();
      table.text("cancellation_reason").nullable();
      table.timestamp("created_at").nullable();
      table.timestamp("updated_at").nullable();
      table.foreign("customer_id").references("id").inTable("customers").onDelete("SET NULL");
      table.foreign("sale_type_id").references("id").inTable("sale_types").onDelete("SET NULL");
      table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("SET NULL");
    });
    const source = (column, fallback = "NULL") => columns.has(column) ? column : fallback;
    const discountSource = columns.has("discount_amount") ? "COALESCE(discount_amount, 0)" : columns.has("discount") ? "COALESCE(discount, 0)" : "0";
    const legacyDiscountSource = columns.has("discount") ? "COALESCE(discount, 0)" : discountSource;
    const remainingSource = columns.has("remaining_amount") ? "COALESCE(remaining_amount, 0)" : `CASE
          WHEN ${source("status", "'draft'")} = 'cancelled' THEN 0
          ELSE MAX(0, COALESCE(${source("total", "0")}, 0) - COALESCE(${source("paid_amount", "0")}, 0))
        END`;
    await knex2.raw(`
      INSERT INTO ${TEMP_TABLE_NAME$1} (
        id,
        invoice_number,
        customer_id,
        sale_type_id,
        cashbox_id,
        invoice_date,
        subtotal,
        discount,
        discount_amount,
        commission_percentage,
        commission_amount,
        tax,
        total,
        paid_amount,
        remaining_amount,
        status,
        notes,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at
      )
      SELECT
        ${source("id")},
        ${source("invoice_number")},
        ${source("customer_id")},
        ${source("sale_type_id")},
        ${source("cashbox_id")},
        ${source("invoice_date")},
        COALESCE(${source("subtotal", "0")}, 0),
        ${legacyDiscountSource},
        ${discountSource},
        COALESCE(${source("commission_percentage", "0")}, 0),
        COALESCE(${source("commission_amount", "0")}, 0),
        COALESCE(${source("tax", "0")}, 0),
        COALESCE(${source("total", "0")}, 0),
        COALESCE(${source("paid_amount", "0")}, 0),
        ${remainingSource},
        COALESCE(${source("status", "'draft'")}, 'draft'),
        ${source("notes")},
        ${source("cancelled_at")},
        ${source("cancellation_reason")},
        ${source("created_at")},
        ${source("updated_at")}
      FROM ${TABLE_NAME$1}
    `);
    const newCountRow = await knex2(TEMP_TABLE_NAME$1).count({ count: "*" }).first();
    const newCount = Number((newCountRow == null ? void 0 : newCountRow.count) ?? 0);
    if (newCount !== oldCount) {
      throw new Error(
        `Sale invoices migration count mismatch: old=${oldCount}, new=${newCount}`
      );
    }
    await knex2.schema.dropTable(TABLE_NAME$1);
    await knex2.schema.renameTable(TEMP_TABLE_NAME$1, TABLE_NAME$1);
    await knex2.schema.alterTable(TABLE_NAME$1, (table) => {
      table.index("customer_id", "idx_sale_invoices_customer_id");
      table.index("sale_type_id", "idx_sale_invoices_sale_type_id");
      table.index("cashbox_id", "idx_sale_invoices_cashbox_id");
      table.index("invoice_date", "idx_sale_invoices_invoice_date");
      table.index("status", "idx_sale_invoices_status");
      table.index(["customer_id", "status"], "idx_sale_invoices_customer_status");
      table.index(["invoice_date", "status"], "idx_sale_invoices_date_status");
    });
    await knex2.raw(`
      UPDATE sqlite_sequence
      SET seq = (SELECT COALESCE(MAX(id), 0) FROM ${TABLE_NAME$1})
      WHERE name = '${TABLE_NAME$1}'
    `);
  } finally {
    await knex2.raw("PRAGMA foreign_keys = ON");
  }
  const foreignKeyProblems = await knex2.raw("PRAGMA foreign_key_check");
  const problemRows = Array.isArray(foreignKeyProblems) ? foreignKeyProblems : (foreignKeyProblems == null ? void 0 : foreignKeyProblems.rows) ?? [];
  if (Array.isArray(problemRows) && problemRows.length > 0) {
    throw new Error(
      `Foreign-key check failed after sale migration: ${JSON.stringify(problemRows)}`
    );
  }
}
async function down$5(_knex) {
}
const config$1 = {
  transaction: false
};
const saleRuntimeCompatibility = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  config: config$1,
  down: down$5,
  up: up$5
}, Symbol.toStringTag, { value: "Module" }));
const TABLE_NAME = "payments";
const TEMP_TABLE_NAME = "payments_party_optional_tmp";
function rowsFromRaw(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "rows" in result) {
    const rows = result.rows;
    return Array.isArray(rows) ? rows : [];
  }
  return [];
}
async function up$4(knex2) {
  if (!await knex2.schema.hasTable(TABLE_NAME)) return;
  const tableInfo = rowsFromRaw(
    await knex2.raw(`PRAGMA table_info(${TABLE_NAME})`)
  );
  const partyIdColumn = tableInfo.find((column) => column.name === "party_id");
  if (!partyIdColumn || Number(partyIdColumn.notnull) === 0) return;
  const oldColumns = new Set(tableInfo.map((column) => column.name));
  const oldCountRow = await knex2(TABLE_NAME).count({ count: "*" }).first();
  const oldCount = Number((oldCountRow == null ? void 0 : oldCountRow.count) ?? 0);
  await knex2.raw("PRAGMA foreign_keys = OFF");
  try {
    await knex2.schema.dropTableIfExists(TEMP_TABLE_NAME);
    await knex2.schema.createTable(TEMP_TABLE_NAME, (table) => {
      table.increments("id").primary();
      table.string("party_type", 20).notNullable();
      table.integer("party_id").nullable();
      table.string("payment_type", 20).notNullable();
      table.integer("invoice_id").notNullable();
      table.integer("cashbox_id").unsigned().notNullable();
      table.decimal("amount", 15, 2).notNullable();
      table.date("payment_date").notNullable();
      table.string("payment_method", 20).notNullable().defaultTo("cash");
      table.string("reference_number", 50).nullable();
      table.text("notes").nullable();
      table.string("status", 20).notNullable().defaultTo("active");
      table.integer("reversed_payment_id").nullable();
      table.integer("cashbox_transaction_id").nullable();
      table.decimal("balance_before", 15, 2).nullable();
      table.decimal("balance_after", 15, 2).nullable();
      table.integer("created_by").nullable();
      table.text("reversal_reason").nullable();
      table.timestamp("created_at").nullable();
      table.timestamp("updated_at").nullable();
      table.foreign("cashbox_id").references("id").inTable("cashboxes").onDelete("RESTRICT");
    });
    const targetColumns = [
      "id",
      "party_type",
      "party_id",
      "payment_type",
      "invoice_id",
      "cashbox_id",
      "amount",
      "payment_date",
      "payment_method",
      "reference_number",
      "notes",
      "status",
      "reversed_payment_id",
      "cashbox_transaction_id",
      "balance_before",
      "balance_after",
      "created_by",
      "reversal_reason",
      "created_at",
      "updated_at"
    ];
    const sourceExpression = (column) => {
      if (oldColumns.has(column)) {
        if (column === "status") return "COALESCE(status, 'active')";
        if (column === "payment_method") return "COALESCE(payment_method, 'cash')";
        return column;
      }
      if (column === "status") return "'active'";
      if (column === "payment_method") return "'cash'";
      return "NULL";
    };
    await knex2.raw(`
      INSERT INTO ${TEMP_TABLE_NAME} (${targetColumns.join(", ")})
      SELECT ${targetColumns.map(sourceExpression).join(", ")}
      FROM ${TABLE_NAME}
    `);
    const newCountRow = await knex2(TEMP_TABLE_NAME).count({ count: "*" }).first();
    const newCount = Number((newCountRow == null ? void 0 : newCountRow.count) ?? 0);
    if (newCount !== oldCount) {
      throw new Error(
        `Payments migration count mismatch: old=${oldCount}, new=${newCount}`
      );
    }
    await knex2.schema.dropTable(TABLE_NAME);
    await knex2.schema.renameTable(TEMP_TABLE_NAME, TABLE_NAME);
    await knex2.schema.alterTable(TABLE_NAME, (table) => {
      table.index(["party_type", "party_id"], "idx_payments_party");
      table.index(["payment_type", "invoice_id"], "idx_payments_invoice");
      table.index("cashbox_id", "idx_payments_cashbox");
      table.index("payment_date", "idx_payments_date");
      table.index(
        ["party_type", "party_id", "payment_date"],
        "idx_payments_party_date"
      );
      table.index("status", "idx_payments_status");
      table.index("reversed_payment_id", "idx_payments_reversed_id");
    });
    await knex2.raw(`
      UPDATE sqlite_sequence
      SET seq = (SELECT COALESCE(MAX(id), 0) FROM ${TABLE_NAME})
      WHERE name = '${TABLE_NAME}'
    `);
  } finally {
    await knex2.raw("PRAGMA foreign_keys = ON");
  }
  const foreignKeyProblems = await knex2.raw("PRAGMA foreign_key_check");
  const problemRows = Array.isArray(foreignKeyProblems) ? foreignKeyProblems : (foreignKeyProblems == null ? void 0 : foreignKeyProblems.rows) ?? [];
  if (Array.isArray(problemRows) && problemRows.length > 0) {
    throw new Error(
      `Foreign-key check failed after payments migration: ${JSON.stringify(problemRows)}`
    );
  }
}
async function down$4(_knex) {
}
const config = {
  transaction: false
};
const paymentPartyOptionalMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  config,
  down: down$4,
  up: up$4
}, Symbol.toStringTag, { value: "Module" }));
async function addInvoiceCurrencyColumns(knex2, tableName) {
  if (!await knex2.schema.hasColumn(tableName, "currency")) {
    await knex2.schema.alterTable(tableName, (table) => {
      table.string("currency", 10).notNullable().defaultTo("SYP");
    });
  }
  if (!await knex2.schema.hasColumn(tableName, "exchange_rate")) {
    await knex2.schema.alterTable(tableName, (table) => {
      table.decimal("exchange_rate", 15, 6).notNullable().defaultTo(1);
    });
  }
  await knex2.raw(`
    UPDATE ${tableName}
    SET currency = COALESCE(NULLIF(currency, ''), 'SYP'),
        exchange_rate = CASE WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN 1 ELSE exchange_rate END
  `);
}
async function up$3(knex2) {
  await addInvoiceCurrencyColumns(knex2, "sale_invoices");
  await addInvoiceCurrencyColumns(knex2, "purchase_invoices");
}
async function down$3(_knex) {
}
const invoiceCurrencyMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$3,
  up: up$3
}, Symbol.toStringTag, { value: "Module" }));
async function addColumnIfMissing(knex2, tableName, columnName, addColumn) {
  if (!await knex2.schema.hasColumn(tableName, columnName)) {
    await knex2.schema.alterTable(tableName, addColumn);
  }
}
async function up$2(knex2) {
  await addColumnIfMissing(knex2, "stock_batches", "purchase_currency", (table) => {
    table.string("purchase_currency", 10).notNullable().defaultTo("SYP");
  });
  await addColumnIfMissing(knex2, "stock_batches", "purchase_exchange_rate", (table) => {
    table.decimal("purchase_exchange_rate", 15, 6).notNullable().defaultTo(1);
  });
  await addColumnIfMissing(knex2, "stock_batches", "purchase_price_base", (table) => {
    table.decimal("purchase_price_base", 15, 2).notNullable().defaultTo(0);
  });
  await addColumnIfMissing(knex2, "payments", "currency", (table) => {
    table.string("currency", 10).notNullable().defaultTo("SYP");
  });
  await addColumnIfMissing(knex2, "payments", "exchange_rate", (table) => {
    table.decimal("exchange_rate", 15, 6).notNullable().defaultTo(1);
  });
  await addColumnIfMissing(knex2, "payments", "amount_base", (table) => {
    table.decimal("amount_base", 15, 2).notNullable().defaultTo(0);
  });
  await knex2.raw(`
    UPDATE stock_batches
    SET purchase_currency = COALESCE(NULLIF(purchase_currency, ''), 'SYP'),
        purchase_exchange_rate = CASE
          WHEN purchase_exchange_rate IS NULL OR purchase_exchange_rate <= 0 THEN 1
          ELSE purchase_exchange_rate
        END,
        purchase_price_base = CASE
          WHEN purchase_price_base IS NULL OR purchase_price_base = 0
            THEN ROUND(COALESCE(purchase_price, 0) *
              CASE WHEN purchase_exchange_rate IS NULL OR purchase_exchange_rate <= 0 THEN 1 ELSE purchase_exchange_rate END, 2)
          ELSE purchase_price_base
        END
  `);
  await knex2.raw(`
    UPDATE payments
    SET currency = COALESCE(
          NULLIF(currency, ''),
          CASE
            WHEN payment_type = 'sale' THEN (
              SELECT COALESCE(NULLIF(si.currency, ''), 'SYP')
              FROM sale_invoices si WHERE si.id = payments.invoice_id
            )
            ELSE (
              SELECT COALESCE(NULLIF(pi.currency, ''), 'SYP')
              FROM purchase_invoices pi WHERE pi.id = payments.invoice_id
            )
          END,
          'SYP'
        ),
        exchange_rate = CASE
          WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN COALESCE(
            CASE
              WHEN payment_type = 'sale' THEN (
                SELECT CASE WHEN si.exchange_rate IS NULL OR si.exchange_rate <= 0 THEN 1 ELSE si.exchange_rate END
                FROM sale_invoices si WHERE si.id = payments.invoice_id
              )
              ELSE (
                SELECT CASE WHEN pi.exchange_rate IS NULL OR pi.exchange_rate <= 0 THEN 1 ELSE pi.exchange_rate END
                FROM purchase_invoices pi WHERE pi.id = payments.invoice_id
              )
            END,
            1
          )
          ELSE exchange_rate
        END
  `);
  await knex2.raw(`
    UPDATE payments
    SET amount_base = ROUND(COALESCE(amount, 0) *
      CASE WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN 1 ELSE exchange_rate END, 2)
    WHERE amount_base IS NULL OR amount_base = 0
  `);
}
async function down$2(_knex) {
}
const multiCurrencyHardeningMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$2,
  up: up$2
}, Symbol.toStringTag, { value: "Module" }));
async function up$1(knex2) {
  const exists = await knex2.schema.hasTable("notifications");
  if (!exists) {
    await knex2.schema.createTable("notifications", (table) => {
      table.increments("id").primary();
      table.string("dedupe_key").notNullable().unique();
      table.string("type").notNullable().defaultTo("system");
      table.string("severity").notNullable().defaultTo("info");
      table.string("title").notNullable();
      table.text("body").nullable();
      table.string("entity_type").nullable();
      table.integer("entity_id").nullable();
      table.string("action_path").nullable();
      table.boolean("is_read").notNullable().defaultTo(false);
      table.boolean("is_active").notNullable().defaultTo(true);
      table.timestamp("read_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex2.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex2.fn.now());
      table.index(["is_active", "is_read", "created_at"], "idx_notifications_state");
      table.index(["type", "severity"], "idx_notifications_type");
    });
  }
}
async function down$1(knex2) {
  await knex2.schema.dropTableIfExists("notifications");
}
const notificationsCenterMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$1,
  up: up$1
}, Symbol.toStringTag, { value: "Module" }));
async function up(knex2) {
  const exists = await knex2.schema.hasTable("notifications");
  if (!exists) return;
  const columns = [
    ["generation", (table) => table.integer("generation").notNullable().defaultTo(1)],
    ["first_seen_at", (table) => table.timestamp("first_seen_at").nullable()],
    ["last_triggered_at", (table) => table.timestamp("last_triggered_at").nullable()],
    ["resolved_at", (table) => table.timestamp("resolved_at").nullable()],
    ["dismissed_at", (table) => table.timestamp("dismissed_at").nullable()]
  ];
  for (const [name, add] of columns) {
    if (!await knex2.schema.hasColumn("notifications", name)) {
      await knex2.schema.alterTable("notifications", add);
    }
  }
  await knex2("notifications").whereNull("generation").update({ generation: 1 });
  await knex2("notifications").whereNull("first_seen_at").update({ first_seen_at: knex2.ref("created_at") });
  await knex2("notifications").whereNull("last_triggered_at").update({ last_triggered_at: knex2.ref("created_at") });
  await knex2.schema.alterTable("notifications", (table) => {
    table.index(["is_active", "dismissed_at", "is_read"], "idx_notifications_visible_state");
    table.index(["last_triggered_at"], "idx_notifications_last_triggered");
  });
}
async function down(_knex) {
}
const notificationsLifecycleHardeningMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down,
  up
}, Symbol.toStringTag, { value: "Module" }));
async function seed$1(knex2) {
  await knex2("cashboxes").del();
  try {
    await knex2.raw('DELETE FROM sqlite_sequence WHERE name="cashboxes"');
  } catch (e) {
  }
  const [sypCashboxId] = await knex2("cashboxes").insert({
    name: "الصندوق الرئيسي (ل.س)",
    parent_id: null,
    initial_balance: 0,
    balance: 0,
    currency: "SYP",
    isActive: true,
    notes: "الصندوق الرئيسي بالليرة السورية",
    created_at: knex2.fn.now(),
    updated_at: knex2.fn.now()
  });
  await knex2("cashboxes").insert({
    name: "الصندوق الرئيسي (دولار)",
    parent_id: null,
    initial_balance: 0,
    balance: 0,
    currency: "USD",
    isActive: true,
    notes: "الصندوق الرئيسي بالدولار الأمريكي",
    created_at: knex2.fn.now(),
    updated_at: knex2.fn.now()
  });
}
const cashboxesSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed: seed$1
}, Symbol.toStringTag, { value: "Module" }));
async function seed(knex2) {
  const existingUser = await knex2("users").orderBy("id", "asc").first();
  if (existingUser) return;
  const hashedPassword = await bcrypt.hash("password", 12);
  await knex2("users").insert({
    username: "admin",
    password_hash: hashedPassword,
    full_name: "مدير النظام",
    role: "admin",
    isActive: true,
    created_at: knex2.fn.now(),
    updated_at: knex2.fn.now()
  });
}
const usersSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed
}, Symbol.toStringTag, { value: "Module" }));
let knexInstance = null;
class MigrationSource {
  async getMigrations() {
    return Promise.resolve([
      "20250101000000_initial_schema.ts",
      "20260728141424_consignment_support.ts",
      "20260731190000_add_product_code.ts",
      "20260731210000_make_product_code_optional.ts",
      "20260801135327_add_quantity_before_after_to_stock_adjustments.ts",
      "20260803_cashbox_accounting_hardening.ts",
      "20260803210000_single_user_auth.ts",
      "20260804_sales_purchases_hardening.ts",
      "20260804130000_consignment_settlements.ts",
      "20260804140000_financial_transactions_hardening.ts",
      "20260804170000_purchase_runtime_compatibility.ts",
      "20260804200000_sale_runtime_compatibility.ts",
      "20260804210000_make_payment_party_optional.ts",
      "20260805144600_add_currency_to_invoices.ts",
      "20260805160000_multi_currency_hardening.ts",
      "20260805203000_notifications_center.ts",
      "20260805214500_notifications_lifecycle_hardening.ts"
    ]);
  }
  getMigrationName(migration) {
    return migration;
  }
  async getMigration(migration) {
    if (migration === "20250101000000_initial_schema.ts") {
      return initialSchema;
    }
    if (migration === "20260728141424_consignment_support.ts") {
      return consignmentMigration;
    }
    if (migration === "20260731190000_add_product_code.ts") {
      return productCodeMigration;
    }
    if (migration === "20260731210000_make_product_code_optional.ts") {
      return optionalProductCodeMigration;
    }
    if (migration === "20260801135327_add_quantity_before_after_to_stock_adjustments.ts") {
      return quantityBeforeAfterMigration;
    }
    if (migration === "20260803_cashbox_accounting_hardening.ts") {
      return cashboxAccountingHardening;
    }
    if (migration === "20260803210000_single_user_auth.ts") {
      return singleUserAuthMigration;
    }
    if (migration === "20260804130000_consignment_settlements.ts") {
      return consignmentSettlementsMigration;
    }
    if (migration === "20260804140000_financial_transactions_hardening.ts") {
      return financialTransactionsHardening;
    }
    if (migration === "20260804170000_purchase_runtime_compatibility.ts") {
      return purchaseRuntimeCompatibility;
    }
    if (migration === "20260804200000_sale_runtime_compatibility.ts") {
      return saleRuntimeCompatibility;
    }
    if (migration === "20260804210000_make_payment_party_optional.ts") {
      return paymentPartyOptionalMigration;
    }
    if (migration === "20260805144600_add_currency_to_invoices.ts") {
      return invoiceCurrencyMigration;
    }
    if (migration === "20260805160000_multi_currency_hardening.ts") {
      return multiCurrencyHardeningMigration;
    }
    if (migration === "20260805203000_notifications_center.ts") {
      return notificationsCenterMigration;
    }
    if (migration === "20260805214500_notifications_lifecycle_hardening.ts") {
      return notificationsLifecycleHardeningMigration;
    }
    if (migration === "20260804_sales_purchases_hardening.ts") {
      return sales_purchases_hardening;
    }
    throw new Error(`Migration ${migration} not found`);
  }
}
class SeedSource {
  async getSeeds() {
    return Promise.resolve(["01_cashboxes.ts", "02_users.ts"]);
  }
  async getSeed(seed2) {
    if (seed2 === "01_cashboxes.ts") return cashboxesSeed;
    if (seed2 === "02_users.ts") return usersSeed;
    throw new Error(`Seed ${seed2} not found`);
  }
}
function getKnex() {
  if (!knexInstance) {
    throw new Error("Knex not initialized. Call initKnex() first.");
  }
  return knexInstance;
}
async function initKnex() {
  const dbPath = path.join(app.getPath("userData"), "farmer-market.db");
  knexInstance = knex({
    client: "sqlite3",
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true,
    migrations: {
      migrationSource: new MigrationSource(),
      tableName: "knex_migrations"
    },
    seeds: {
      seedSource: new SeedSource()
    },
    pool: {
      afterCreate: (conn, done) => {
        conn.run("PRAGMA foreign_keys = ON", done);
      }
    }
  });
  global.__knex = knexInstance;
  console.log(`📁 Database location: ${dbPath}`);
}
async function closeKnex() {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}
let isInitialized = false;
async function initDatabase() {
  if (isInitialized) {
    return;
  }
  try {
    await initKnex();
    await runMigrations();
    await runSeeds();
    isInitialized = true;
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}
function getDatabase() {
  return getKnex();
}
async function closeDatabase() {
  await closeKnex();
  isInitialized = false;
}
async function runMigrations() {
  const knex2 = getKnex();
  try {
    await knex2.migrate.latest();
    console.log("✅ Migrations completed");
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  }
}
async function runSeeds() {
  const knex2 = getKnex();
  try {
    const usersCount = await knex2("users").count("id as count").first();
    if (usersCount && usersCount.count === 0) {
      await knex2.seed.run();
      console.log("✅ Seeds completed");
    } else {
      console.log("ℹ️ Seeds already exist, skipping...");
    }
  } catch (error) {
    console.error("❌ Seed error:", error);
  }
}
export {
  closeDatabase,
  getDatabase,
  initDatabase
};
