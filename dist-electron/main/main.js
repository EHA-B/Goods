import { app, ipcMain, BrowserWindow } from "electron";
import knex from "knex";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
async function up$4(knex2) {
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
    table.enum("status", ["draft", "confirmed", "paid", "cancelled"]).defaultTo("draft");
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
    table.integer("customer_id").unsigned().notNullable();
    table.integer("sale_type_id").unsigned().notNullable();
    table.integer("cashbox_id").unsigned();
    table.date("invoice_date").notNullable();
    table.decimal("subtotal", 15, 2).notNullable().defaultTo(0);
    table.decimal("discount", 15, 2).defaultTo(0);
    table.decimal("commission_percentage", 5, 2).defaultTo(0);
    table.decimal("commission_amount", 15, 2).defaultTo(0);
    table.decimal("tax", 15, 2).defaultTo(0);
    table.decimal("total", 15, 2).notNullable().defaultTo(0);
    table.decimal("paid_amount", 15, 2).defaultTo(0);
    table.enum("status", ["draft", "confirmed", "paid", "cancelled"]).defaultTo("draft");
    table.text("notes");
    table.timestamp("created_at").nullable();
    table.timestamp("updated_at").nullable();
    table.foreign("customer_id").references("id").inTable("customers").onDelete("RESTRICT");
    table.foreign("sale_type_id").references("id").inTable("sale_types").onDelete("RESTRICT");
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
    table.string("currency", 10).defaultTo("SAR");
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
    table.integer("party_id").notNullable();
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
async function down$4(knex2) {
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
  down: down$4,
  up: up$4
}, Symbol.toStringTag, { value: "Module" }));
async function up$3(knex2) {
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
  const existingCashbox = await knex2("cashboxes").where("name", "Commission Holding Cashbox").first();
  if (!existingCashbox) {
    await knex2("cashboxes").insert({
      name: "Commission Holding Cashbox",
      balance: 0,
      initial_balance: 0,
      currency: "SAR",
      isActive: true,
      notes: "Holding account for consignment/commission sales before settlement with suppliers.",
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
  }
}
async function down$3(knex2) {
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
  down: down$3,
  up: up$3
}, Symbol.toStringTag, { value: "Module" }));
async function up$2(knex2) {
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
async function down$2(knex2) {
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
  down: down$2,
  up: up$2
}, Symbol.toStringTag, { value: "Module" }));
async function up$1(knex2) {
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (!hasCode) return;
  await knex2("products").where("code", "").update({ code: null });
  await knex2.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex2.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code) WHERE code IS NOT NULL"
  );
}
async function down$1(knex2) {
  const hasCode = await knex2.schema.hasColumn("products", "code");
  if (!hasCode) return;
  await knex2.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex2.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code)"
  );
}
const optionalProductCodeMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down: down$1,
  up: up$1
}, Symbol.toStringTag, { value: "Module" }));
async function up(knex2) {
  await knex2.schema.alterTable("stock_adjustments", (table) => {
    table.decimal("quantity_before", 15, 3).notNullable().defaultTo(0);
    table.decimal("quantity_after", 15, 3).notNullable().defaultTo(0);
  });
}
async function down(knex2) {
  await knex2.schema.alterTable("stock_adjustments", (table) => {
    table.dropColumn("quantity_before");
    table.dropColumn("quantity_after");
  });
}
const quantityBeforeAfterMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down,
  up
}, Symbol.toStringTag, { value: "Module" }));
async function seed$2(knex2) {
  await knex2("cashboxes").del();
  await knex2("cashboxes").insert([
    {
      name: "الصندوق الرئيسي",
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: "SAR",
      notes: "الصندوق الرئيسي للنظام"
    }
  ]);
}
const cashboxesSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed: seed$2
}, Symbol.toStringTag, { value: "Module" }));
async function seed$1(knex2) {
  await knex2("users").del();
  const hashedPassword = await bcrypt.hash("password", 10);
  await knex2("users").insert([
    {
      username: "admin",
      password_hash: hashedPassword,
      full_name: "مدير النظام",
      email: "admin@farmersmarket.com",
      role: "admin",
      isActive: true
    }
  ]);
}
const usersSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  seed: seed$1
}, Symbol.toStringTag, { value: "Module" }));
async function seed(knex2) {
  const existingCashbox = await knex2("cashboxes").where("name", "Commission Holding Cashbox").first();
  if (!existingCashbox) {
    await knex2("cashboxes").insert({
      name: "Commission Holding Cashbox",
      balance: 0,
      initial_balance: 0,
      currency: "SAR",
      isActive: true,
      notes: "Holding account for consignment/commission sales before settlement with suppliers.",
      created_at: knex2.fn.now(),
      updated_at: knex2.fn.now()
    });
  }
}
const commissionCashboxSeed = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
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
      "20260801135327_add_quantity_before_after_to_stock_adjustments.ts"
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
    throw new Error(`Migration ${migration} not found`);
  }
}
class SeedSource {
  async getSeeds() {
    return Promise.resolve(["01_cashboxes.ts", "01_commission_cashbox.ts", "02_users.ts"]);
  }
  async getSeed(seed2) {
    if (seed2 === "01_cashboxes.ts") return cashboxesSeed;
    if (seed2 === "01_commission_cashbox.ts") return commissionCashboxSeed;
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
const dbmanager = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  closeDatabase,
  getDatabase,
  initDatabase
}, Symbol.toStringTag, { value: "Module" }));
function validationError$2(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}
function normalizeInput$2(input, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError$2("بيانات المنتج مطلوبة.");
  }
  const result = {};
  const requiredStringFields = ["name", "unit"];
  for (const field of requiredStringFields) {
    if (!partial || Object.prototype.hasOwnProperty.call(input, field)) {
      const value = String(input[field] ?? "").trim();
      if (!value) {
        const labels = { name: "اسم المنتج", unit: "الوحدة" };
        throw validationError$2(`${labels[field]} مطلوب.`);
      }
      result[field] = value;
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, "code")) {
    const code = String(input.code ?? "").trim();
    result.code = code || null;
  }
  for (const field of ["category", "description"]) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      const value = String(input[field] ?? "").trim();
      result[field] = value || null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    result.isActive = Boolean(input.isActive);
  } else if (!partial) {
    result.isActive = true;
  }
  return result;
}
function normalizeDatabaseError$3(error) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message);
  if (message.includes("UNIQUE constraint failed: products.code")) {
    normalized.code = "DUPLICATE_PRODUCT_CODE";
    normalized.message = "كود المنتج مستخدم مسبقًا.";
  } else if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "PRODUCT_IN_USE";
    normalized.message = "لا يمكن حذف المنتج لأنه مرتبط بحركات أو دفعات مخزون.";
  }
  throw normalized;
}
async function getProductOrThrow(id) {
  const product = await getDatabase()("products").where({ id }).first();
  if (!product) {
    const error = new Error("المنتج غير موجود.");
    error.code = "NOT_FOUND";
    throw error;
  }
  return product;
}
function registerProductIpc() {
  ipcMain.removeHandler("products:list");
  ipcMain.removeHandler("products:get");
  ipcMain.removeHandler("products:create");
  ipcMain.removeHandler("products:update");
  ipcMain.removeHandler("products:remove");
  ipcMain.handle("products:list", async () => {
    return getDatabase()("products").select("*").orderBy("id", "desc");
  });
  ipcMain.handle("products:get", async (_event, id) => {
    return getProductOrThrow(Number(id));
  });
  ipcMain.handle("products:create", async (_event, input) => {
    const payload = normalizeInput$2(input);
    try {
      const [id] = await getDatabase()("products").insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now()
      });
      return getProductOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError$3(error);
    }
  });
  ipcMain.handle("products:update", async (_event, id, input) => {
    const productId = Number(id);
    const payload = normalizeInput$2(input, true);
    if (Object.keys(payload).length === 0) {
      throw validationError$2("لا توجد بيانات لتعديلها.");
    }
    try {
      const changed = await getDatabase()("products").where({ id: productId }).update({ ...payload, updated_at: getDatabase().fn.now() });
      if (!changed) {
        const error = new Error("المنتج غير موجود.");
        error.code = "NOT_FOUND";
        throw error;
      }
      return getProductOrThrow(productId);
    } catch (error) {
      return normalizeDatabaseError$3(error);
    }
  });
  ipcMain.handle("products:remove", async (_event, id) => {
    const productId = Number(id);
    try {
      const deleted = await getDatabase()("products").where({ id: productId }).del();
      if (!deleted) {
        const error = new Error("المنتج غير موجود.");
        error.code = "NOT_FOUND";
        throw error;
      }
      return { success: true };
    } catch (error) {
      return normalizeDatabaseError$3(error);
    }
  });
  ipcMain.handle("products:adjustStock", async (_event, id, input) => {
    const productId = Number(id);
    const qty = parseFloat(input.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw validationError$2("يجب أن تكون الكمية رقمًا موجبًا.");
    }
    if (!input.type || !input.reason) {
      throw validationError$2("نوع التسوية والسبب مطلوبان.");
    }
    try {
      return await getDatabase().transaction(async (trx) => {
        const product = await trx("products").where({ id: productId }).first();
        if (!product) {
          const error = new Error("المنتج غير موجود.");
          error.code = "NOT_FOUND";
          throw error;
        }
        let stockBatch = await trx("stock_batches").where({ product_id: productId }).orderBy("id", "asc").first();
        if (!stockBatch) {
          if (input.type === "subtract") {
            throw validationError$2("لا يمكن إنقاص المخزون لعدم وجود دفعات سابقة.");
          }
          const [newBatchId] = await trx("stock_batches").insert({
            product_id: productId,
            quantity: 0,
            remaining_quantity: 0,
            isActive: true,
            created_at: getDatabase().fn.now(),
            updated_at: getDatabase().fn.now()
          });
          stockBatch = await trx("stock_batches").where({ id: newBatchId }).first();
        }
        const adjustmentAmount = input.type === "add" ? qty : -qty;
        const quantityBefore = Number(stockBatch.remaining_quantity || 0);
        const newRemaining = quantityBefore + adjustmentAmount;
        await trx("stock_adjustments").insert({
          stock_batch_id: stockBatch.id,
          quantity: adjustmentAmount,
          quantity_before: quantityBefore,
          quantity_after: newRemaining,
          reason: String(input.reason),
          notes: input.notes ? String(input.notes) : null,
          created_at: getDatabase().fn.now(),
          updated_at: getDatabase().fn.now()
        });
        await trx("stock_batches").where({ id: stockBatch.id }).update({
          remaining_quantity: newRemaining,
          updated_at: getDatabase().fn.now()
        });
        return { success: true, newRemaining };
      });
    } catch (error) {
      return normalizeDatabaseError$3(error);
    }
  });
}
function validationError$1(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}
function normalizeOptionalString$1(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
function normalizeInput$1(input, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError$1("بيانات المورد مطلوبة.");
  }
  const result = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = String(input.name ?? "").trim();
    if (!name) throw validationError$1("اسم المورد مطلوب.");
    result.name = name;
  }
  for (const field of ["phone", "email", "address", "notes"]) {
    if (!partial || Object.prototype.hasOwnProperty.call(input, field)) {
      result[field] = normalizeOptionalString$1(input[field]);
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, "balance")) {
    const balance = Number(input.balance ?? 0);
    if (!Number.isFinite(balance)) {
      throw validationError$1("الرصيد الافتتاحي غير صالح.");
    }
    result.balance = balance;
  }
  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    result.isActive = Boolean(input.isActive);
  } else if (!partial) {
    result.isActive = true;
  }
  return result;
}
function normalizeDatabaseError$2(error) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message);
  if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "SUPPLIER_IN_USE";
    normalized.message = "لا يمكن حذف المورد لوجود فواتير أو دفعات مخزون مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
  }
  throw normalized;
}
async function getSupplierOrThrow(id) {
  const supplier = await getDatabase()("suppliers").where({ id }).first();
  if (!supplier) {
    const error = new Error("المورد غير موجود.");
    error.code = "NOT_FOUND";
    throw error;
  }
  return supplier;
}
function registerSupplierIpc() {
  ipcMain.removeHandler("suppliers:list");
  ipcMain.removeHandler("suppliers:get");
  ipcMain.removeHandler("suppliers:create");
  ipcMain.removeHandler("suppliers:update");
  ipcMain.removeHandler("suppliers:remove");
  ipcMain.handle("suppliers:list", async () => {
    return getDatabase()("suppliers").select("*").orderBy("id", "desc");
  });
  ipcMain.handle("suppliers:get", async (_event, id) => {
    return getSupplierOrThrow(Number(id));
  });
  ipcMain.handle("suppliers:create", async (_event, input) => {
    const payload = normalizeInput$1(input);
    try {
      const [id] = await getDatabase()("suppliers").insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now()
      });
      return getSupplierOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError$2(error);
    }
  });
  ipcMain.handle(
    "suppliers:update",
    async (_event, id, input) => {
      const supplierId = Number(id);
      const payload = normalizeInput$1(input, true);
      if (Object.keys(payload).length === 0) {
        throw validationError$1("لا توجد بيانات لتعديلها.");
      }
      try {
        const changed = await getDatabase()("suppliers").where({ id: supplierId }).update({ ...payload, updated_at: getDatabase().fn.now() });
        if (!changed) {
          const error = new Error("المورد غير موجود.");
          error.code = "NOT_FOUND";
          throw error;
        }
        return getSupplierOrThrow(supplierId);
      } catch (error) {
        return normalizeDatabaseError$2(error);
      }
    }
  );
  ipcMain.handle("suppliers:remove", async (_event, id) => {
    const supplierId = Number(id);
    try {
      const deleted = await getDatabase()("suppliers").where({ id: supplierId }).del();
      if (!deleted) {
        const error = new Error("المورد غير موجود.");
        error.code = "NOT_FOUND";
        throw error;
      }
      return { success: true };
    } catch (error) {
      return normalizeDatabaseError$2(error);
    }
  });
}
function validationError(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  return error;
}
function normalizeOptionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
function normalizeInput(input, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError("بيانات العميل مطلوبة.");
  }
  const result = {};
  if (!partial || Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = String(input.name ?? "").trim();
    if (!name) throw validationError("اسم العميل مطلوب.");
    result.name = name;
  }
  for (const field of ["phone", "email", "address", "notes"]) {
    if (!partial || Object.prototype.hasOwnProperty.call(input, field)) {
      result[field] = normalizeOptionalString(input[field]);
    }
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, "balance")) {
    const balance = Number(input.balance ?? 0);
    if (!Number.isFinite(balance)) {
      throw validationError("الرصيد الافتتاحي غير صالح.");
    }
    result.balance = balance;
  }
  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    result.isActive = Boolean(input.isActive);
  } else if (!partial) {
    result.isActive = true;
  }
  return result;
}
function normalizeDatabaseError$1(error) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message);
  if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "CUSTOMER_IN_USE";
    normalized.message = "لا يمكن حذف العميل لوجود فواتير أو مدفوعات مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
  }
  throw normalized;
}
async function getCustomerOrThrow(id) {
  const customer = await getDatabase()("customers").where({ id }).first();
  if (!customer) {
    const error = new Error("العميل غير موجود.");
    error.code = "NOT_FOUND";
    throw error;
  }
  return customer;
}
function registerCustomerIpc() {
  ipcMain.removeHandler("customers:list");
  ipcMain.removeHandler("customers:get");
  ipcMain.removeHandler("customers:create");
  ipcMain.removeHandler("customers:update");
  ipcMain.removeHandler("customers:remove");
  ipcMain.handle("customers:list", async () => {
    return getDatabase()("customers").select("*").orderBy("id", "desc");
  });
  ipcMain.handle("customers:get", async (_event, id) => {
    return getCustomerOrThrow(Number(id));
  });
  ipcMain.handle("customers:create", async (_event, input) => {
    const payload = normalizeInput(input);
    try {
      const [id] = await getDatabase()("customers").insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now()
      });
      return getCustomerOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError$1(error);
    }
  });
  ipcMain.handle(
    "customers:update",
    async (_event, id, input) => {
      const customerId = Number(id);
      const payload = normalizeInput(input, true);
      if (Object.keys(payload).length === 0) {
        throw validationError("لا توجد بيانات لتعديلها.");
      }
      try {
        const changed = await getDatabase()("customers").where({ id: customerId }).update({ ...payload, updated_at: getDatabase().fn.now() });
        if (!changed) {
          const error = new Error("العميل غير موجود.");
          error.code = "NOT_FOUND";
          throw error;
        }
        return getCustomerOrThrow(customerId);
      } catch (error) {
        return normalizeDatabaseError$1(error);
      }
    }
  );
  ipcMain.handle("customers:remove", async (_event, id) => {
    const customerId = Number(id);
    try {
      const deleted = await getDatabase()("customers").where({ id: customerId }).del();
      if (!deleted) {
        const error = new Error("العميل غير موجود.");
        error.code = "NOT_FOUND";
        throw error;
      }
      return { success: true };
    } catch (error) {
      return normalizeDatabaseError$1(error);
    }
  });
}
function normalizeDatabaseError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message);
  throw normalized;
}
function registerStockIpc() {
  ipcMain.removeHandler("stocks:summary");
  ipcMain.removeHandler("stocks:items");
  ipcMain.handle("stocks:summary", async () => {
    try {
      const db = getDatabase();
      const totalsResult = await db("stock_batches").where("isActive", 1).andWhere("remaining_quantity", ">", 0).sum("remaining_quantity as total_units").sum(db.raw("remaining_quantity * purchase_price as total_value")).first();
      const total_units = (totalsResult == null ? void 0 : totalsResult.total_units) || 0;
      const total_value = (totalsResult == null ? void 0 : totalsResult.total_value) || 0;
      const productBalances = await db("products").select("products.id").leftJoin("stock_batches", function() {
        this.on("products.id", "=", "stock_batches.product_id");
      }).where("products.isActive", 1).groupBy("products.id").select(db.raw("SUM(CASE WHEN stock_batches.isActive = 1 AND stock_batches.remaining_quantity > 0 THEN stock_batches.remaining_quantity ELSE 0 END) as total_qty"));
      let low_stock_count = 0;
      let out_of_stock_count = 0;
      const DEFAULT_MIN_LIMIT = 10;
      productBalances.forEach((p) => {
        if (p.total_qty <= 0) {
          out_of_stock_count++;
        } else if (p.total_qty <= DEFAULT_MIN_LIMIT) {
          low_stock_count++;
        }
      });
      const expiringSoon = await db("stock_batches").count("id as count").where("isActive", 1).andWhere("remaining_quantity", ">", 0).whereNotNull("expiry_date").andWhere("expiry_date", "<=", db.raw("date('now', '+30 days')")).first();
      return {
        total_units,
        total_value,
        low_stock_count,
        out_of_stock_count,
        expiring_soon_count: (expiringSoon == null ? void 0 : expiringSoon.count) || 0
      };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
  ipcMain.handle("stocks:items", async (_event, pagination = { page: 1, limit: 10 }) => {
    try {
      const db = getDatabase();
      const page = parseInt(pagination.page) || 1;
      const limit = parseInt(pagination.limit) || 10;
      const offset = (page - 1) * limit;
      const countResult = await db("products").count("id as total").where("isActive", 1).first();
      const rows = await db.raw(`
        SELECT 
            p.id as product_id,
            p.name as product_name,
            p.code as product_code,
            p.unit as product_unit,
            p.category as product_category,
            SUM(CASE WHEN sb.isActive = 1 THEN sb.remaining_quantity ELSE 0 END) as current_balance,
            SUM(CASE WHEN sb.isActive = 1 THEN sb.remaining_quantity * sb.purchase_price ELSE 0 END) as total_value,
            COUNT(CASE WHEN sb.isActive = 1 AND sb.remaining_quantity > 0 THEN sb.id END) as batch_count,
            GROUP_CONCAT(DISTINCT s.name) as suppliers
        FROM (SELECT * FROM products WHERE isActive = 1 ORDER BY id DESC LIMIT ? OFFSET ?) p
        LEFT JOIN stock_batches sb ON p.id = sb.product_id AND sb.isActive = 1 AND sb.remaining_quantity > 0
        LEFT JOIN suppliers s ON sb.supplier_id = s.id
        GROUP BY p.id
        ORDER BY p.id DESC
      `, [limit, offset]);
      const items = rows.map((row) => {
        const DEFAULT_MIN_LIMIT = 10;
        const balance = row.current_balance || 0;
        let status = "متوفر";
        if (balance <= 0) status = "نافد";
        else if (balance <= DEFAULT_MIN_LIMIT) status = "مخزون منخفض";
        return {
          product_id: row.product_id,
          product_name: row.product_name,
          product_code: row.product_code,
          product_category: row.product_category,
          product_unit: row.product_unit,
          current_balance: balance,
          total_value: row.total_value || 0,
          average_purchase_price: balance > 0 ? row.total_value / balance : 0,
          batch_count: row.batch_count || 0,
          suppliers: row.suppliers ? row.suppliers.split(",") : [],
          status,
          min_limit: DEFAULT_MIN_LIMIT
        };
      });
      return {
        data: items,
        pagination: {
          page,
          limit,
          total: (countResult == null ? void 0 : countResult.total) || 0,
          totalPages: Math.ceil((Number(countResult == null ? void 0 : countResult.total) || 0) / limit)
        }
      };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "../..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "نظام محاسبة أسواق المزارعين",
    webPreferences: {
      preload: path$1.join(__dirname$1, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  try {
    const { initDatabase: initDatabase2 } = await Promise.resolve().then(() => dbmanager);
    await initDatabase2();
    registerProductIpc();
    registerSupplierIpc();
    registerCustomerIpc();
    registerStockIpc();
    console.log("Database initialized successfully from electron/main.ts");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
