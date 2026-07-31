import knex from "knex";
import path from "path";
import { app } from "electron";
import bcrypt from "bcrypt";
async function up$1(knex2) {
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
async function down$1(knex2) {
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
  down: down$1,
  up: up$1
}, Symbol.toStringTag, { value: "Module" }));
async function up(knex2) {
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
async function down(knex2) {
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
    return Promise.resolve(["20250101000000_initial_schema.ts", "20260728141424_consignment_support.ts"]);
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
export {
  closeDatabase,
  getDatabase,
  initDatabase
};
