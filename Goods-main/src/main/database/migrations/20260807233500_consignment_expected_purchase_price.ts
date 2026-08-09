import { Knex } from "knex";

/**
 * Adds the informational expected purchase price used by consignment purchases.
 *
 * Important:
 * - Standard purchases continue to use purchase_price normally.
 * - Consignment accounting purchase_price remains 0.
 * - estimated_purchase_price is informational and is used for display/reference only.
 */
export async function up(
  knex: Knex,
): Promise<void> {
  const hasPurchaseItemsTable =
    await knex.schema.hasTable(
      "purchase_invoice_items",
    );

  if (hasPurchaseItemsTable) {
    const hasEstimatedPurchasePrice =
      await knex.schema.hasColumn(
        "purchase_invoice_items",
        "estimated_purchase_price",
      );

    if (!hasEstimatedPurchasePrice) {
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

  const hasStockBatchesTable =
    await knex.schema.hasTable(
      "stock_batches",
    );

  if (hasStockBatchesTable) {
    const hasEstimatedPurchasePrice =
      await knex.schema.hasColumn(
        "stock_batches",
        "estimated_purchase_price",
      );

    if (!hasEstimatedPurchasePrice) {
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
  const hasPurchaseItemsTable =
    await knex.schema.hasTable(
      "purchase_invoice_items",
    );

  if (hasPurchaseItemsTable) {
    const hasEstimatedPurchasePrice =
      await knex.schema.hasColumn(
        "purchase_invoice_items",
        "estimated_purchase_price",
      );

    if (hasEstimatedPurchasePrice) {
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

  const hasStockBatchesTable =
    await knex.schema.hasTable(
      "stock_batches",
    );

  if (hasStockBatchesTable) {
    const hasEstimatedPurchasePrice =
      await knex.schema.hasColumn(
        "stock_batches",
        "estimated_purchase_price",
      );

    if (hasEstimatedPurchasePrice) {
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