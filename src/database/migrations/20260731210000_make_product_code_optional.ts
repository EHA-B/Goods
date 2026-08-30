import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasCode = await knex.schema.hasColumn("products", "code");
  if (!hasCode) return;

  await knex("products")
    .where("code", "")
    .update({ code: null });

  await knex.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code) WHERE code IS NOT NULL",
  );
}

export async function down(knex: Knex): Promise<void> {
  const hasCode = await knex.schema.hasColumn("products", "code");
  if (!hasCode) return;

  await knex.raw("DROP INDEX IF EXISTS products_code_unique");
  await knex.raw(
    "CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique ON products(code)",
  );
}
