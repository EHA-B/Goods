import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCode = await knex.schema.hasColumn("products", "code");

  if (!hasCode) {
    await knex.schema.alterTable("products", (table) => {
      table.string("code", 50).nullable();
    });
  }

  const products = await knex("products")
    .select("id")
    .whereNull("code")
    .orWhere("code", "");

  for (const product of products) {
    const generatedCode = `PRD-${String(product.id).padStart(6, "0")}`;
    await knex("products")
      .where({ id: product.id })
      .update({ code: generatedCode });
  }

  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw("DROP INDEX IF EXISTS products_code_unique");

  const hasCode = await knex.schema.hasColumn("products", "code");
  if (hasCode) {
    await knex.schema.alterTable("products", (table) => {
      table.dropColumn("code");
    });
  }
}
