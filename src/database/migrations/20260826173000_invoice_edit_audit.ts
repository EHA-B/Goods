import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  for (const tableName of ["sale_invoices", "purchase_invoices"]) {
    const hasEdited = await knex.schema.hasColumn(tableName, "is_edited");
    const hasEditCount = await knex.schema.hasColumn(tableName, "edit_count");
    const hasLastEditedAt = await knex.schema.hasColumn(tableName, "last_edited_at");
    const hasLastEditedBy = await knex.schema.hasColumn(tableName, "last_edited_by");

    await knex.schema.alterTable(tableName, (table) => {
      if (!hasEdited) table.boolean("is_edited").notNullable().defaultTo(false);
      if (!hasEditCount) table.integer("edit_count").notNullable().defaultTo(0);
      if (!hasLastEditedAt) table.timestamp("last_edited_at").nullable();
      if (!hasLastEditedBy) table.integer("last_edited_by").unsigned().nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Kept intentionally non-destructive. Invoice audit metadata should not be removed.
}
