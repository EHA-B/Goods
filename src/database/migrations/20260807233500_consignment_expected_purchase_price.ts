import { Knex } from "knex";

/**
 * Persist the informational expected purchase price used by consignment items.
 *
 * The actual accounting purchase_price remains 0 for consignment invoices.
 * This field is informational only and must never create supplier payable.
 */
export async function up(
  knex: Knex,
): Promise<void> {
  if (
    await knex.schema.hasTable(
      "purchase_invoice_items",
    )
  ) {
    if (
      !(
        await knex.schema.hasColumn(
          "purchase_invoice_items",
          "estimated_purchase_price",
        )
      )
    ) {
      await knex.schema.alterTable(
        "purchase_invoice_items",
        (table) => {
          table
            .decimal(
              "estimated_purchase_price",
              15,
              2,
            )
            .nullable();
        },
      );
    }
  }

  if (
    await knex.schema.hasTable(
      "stock_batches",
    )
  ) {
    if (
      !(
        await knex.schema.hasColumn(
          "stock_batches",
          "estimated_purchase_price",
        )
      )
    ) {
      await knex.schema.alterTable(
        "stock_batches",
        (table) => {
          table
            .decimal(
              "estimated_purchase_price",
              15,
              2,
            )
            .nullable();
        },
      );
    }
  }
}

export async function down(
  knex: Knex,
): Promise<void> {
  if (
    await knex.schema.hasTable(
      "purchase_invoice_items",
    )
  ) {
    if (
      await knex.schema.hasColumn(
        "purchase_invoice_items",
        "estimated_purchase_price",
      )
    ) {
      await knex.schema.alterTable(
        "purchase_invoice_items",
        (table) => {
          table.dropColumn(
            "estimated_purchase_price",
          );
        },
      );
    }
  }

  if (
    await knex.schema.hasTable(
      "stock_batches",
    )
  ) {
    if (
      await knex.schema.hasColumn(
        "stock_batches",
        "estimated_purchase_price",
      )
    ) {
      await knex.schema.alterTable(
        "stock_batches",
        (table) => {
          table.dropColumn(
            "estimated_purchase_price",
          );
        },
      );
    }
  }
}