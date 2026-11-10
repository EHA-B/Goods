import type { Knex } from 'knex';

interface TableInfoRow {
  name: string;
  notnull: number;
}

function rowsFromRaw(result: unknown): TableInfoRow[] {
  if (Array.isArray(result)) return result as TableInfoRow[];
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as TableInfoRow[]) : [];
  }
  return [];
}

async function getTableColumns(knex: Knex, tableName: string): Promise<Map<string, TableInfoRow>> {
  const rows = rowsFromRaw(await knex.raw(`PRAGMA table_info(${tableName})`));
  return new Map(rows.map((row) => [row.name, row]));
}

export async function up(knex: Knex): Promise<void> {
  // 1. Add unified stock columns on `products` and backfill from existing `stock_batches`
  if (await knex.schema.hasTable('products')) {
    const hadStockQuantity = await knex.schema.hasColumn('products', 'stock_quantity');
    const hadAvgCostBase = await knex.schema.hasColumn('products', 'avg_cost_base');

    if (!hadStockQuantity) {
      await knex.schema.alterTable('products', (table) => {
        table.decimal('stock_quantity', 15, 3).notNullable().defaultTo(0);
      });
    }

    if (!hadAvgCostBase) {
      await knex.schema.alterTable('products', (table) => {
        table.decimal('avg_cost_base', 15, 2).notNullable().defaultTo(0);
      });
    }

    if (!hadStockQuantity && (await knex.schema.hasTable('stock_batches'))) {
      const batchColumns = await getTableColumns(knex, 'stock_batches');
      const priceExpr = batchColumns.has('purchase_price_base')
        ? 'COALESCE(NULLIF(sb.purchase_price_base, 0), sb.purchase_price, 0)'
        : 'COALESCE(sb.purchase_price, 0)';
      const activeExpr = batchColumns.has('isActive')
        ? 'COALESCE(sb.isActive, 1) = 1'
        : '1 = 1';

      await knex.raw(`
        UPDATE products
        SET
          stock_quantity = COALESCE((
            SELECT ROUND(SUM(CASE WHEN ${activeExpr} THEN COALESCE(sb.remaining_quantity, 0) ELSE 0 END), 3)
            FROM stock_batches sb
            WHERE sb.product_id = products.id
          ), 0),
          avg_cost_base = COALESCE((
            SELECT CASE
              WHEN SUM(CASE WHEN ${activeExpr} AND COALESCE(sb.remaining_quantity, 0) > 0 THEN sb.remaining_quantity ELSE 0 END) > 0
                THEN ROUND(
                  SUM(CASE WHEN ${activeExpr} AND COALESCE(sb.remaining_quantity, 0) > 0 THEN sb.remaining_quantity * ${priceExpr} ELSE 0 END)
                  / SUM(CASE WHEN ${activeExpr} AND COALESCE(sb.remaining_quantity, 0) > 0 THEN sb.remaining_quantity ELSE 0 END),
                  2
                )
              ELSE (
                SELECT ROUND(${priceExpr}, 2)
                FROM stock_batches sb
                WHERE sb.product_id = products.id
                ORDER BY sb.id DESC
                LIMIT 1
              )
            END
            FROM stock_batches sb
            WHERE sb.product_id = products.id
          ), 0)
      `);
    }
  }

  // 2. Add `sold_quantity` to `consignment_settlements` for manual consignment closing
  if (await knex.schema.hasTable('consignment_settlements')) {
    const hasSoldQty = await knex.schema.hasColumn('consignment_settlements', 'sold_quantity');
    if (!hasSoldQty) {
      await knex.schema.alterTable('consignment_settlements', (table) => {
        table.decimal('sold_quantity', 15, 3).notNullable().defaultTo(0);
      });

      if (await knex.schema.hasTable('consignment_settlement_items')) {
        await knex.raw(`
          UPDATE consignment_settlements
          SET sold_quantity = COALESCE((
            SELECT ROUND(SUM(COALESCE(csi.sold_quantity, 0)), 3)
            FROM consignment_settlement_items csi
            WHERE csi.settlement_id = consignment_settlements.id
          ), 0)
        `);
      }
    }
  }

  // 3. Rebuild tables with NOT NULL / FK locks on `stock_batches`
  await knex.raw('PRAGMA foreign_keys = OFF');

  try {
    // 3a. Rebuild `sale_invoice_items` -> add `product_id NOT NULL`, make `stock_batch_id NULLABLE`
    if (await knex.schema.hasTable('sale_invoice_items')) {
      const cols = await getTableColumns(knex, 'sale_invoice_items');
      const needsRebuild =
        !cols.has('product_id') || Number(cols.get('stock_batch_id')?.notnull ?? 0) === 1;

      if (needsRebuild) {
        const tmp = 'sale_invoice_items_unified_tmp';
        await knex.schema.dropTableIfExists(tmp);

        await knex.schema.createTable(tmp, (table) => {
          table.increments('id').primary();
          table.integer('sale_invoice_id').unsigned().notNullable();
          table.integer('product_id').unsigned().notNullable();
          table.integer('stock_batch_id').unsigned().nullable();
          table.decimal('quantity', 15, 3).notNullable();
          table.decimal('unit_price', 15, 2).notNullable();
          table.decimal('line_total', 15, 2).notNullable();
          table.decimal('cost_price', 15, 2).notNullable().defaultTo(0);
          table.decimal('profit', 15, 2).defaultTo(0);
          table.text('notes').nullable();
          table.timestamp('created_at').nullable();
          table.timestamp('updated_at').nullable();

          table.foreign('sale_invoice_id').references('id').inTable('sale_invoices').onDelete('CASCADE');
          table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
          table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('SET NULL');
        });

        const productSource = cols.has('product_id')
          ? `COALESCE(sii.product_id, (SELECT sb.product_id FROM stock_batches sb WHERE sb.id = sii.stock_batch_id), (SELECT p.id FROM products p ORDER BY p.id ASC LIMIT 1))`
          : `COALESCE((SELECT sb.product_id FROM stock_batches sb WHERE sb.id = sii.stock_batch_id), (SELECT p.id FROM products p ORDER BY p.id ASC LIMIT 1))`;

        await knex.raw(`
          INSERT INTO ${tmp} (
            id, sale_invoice_id, product_id, stock_batch_id,
            quantity, unit_price, line_total, cost_price, profit, notes, created_at, updated_at
          )
          SELECT
            sii.id,
            sii.sale_invoice_id,
            ${productSource},
            sii.stock_batch_id,
            COALESCE(sii.quantity, 0),
            COALESCE(sii.unit_price, 0),
            COALESCE(sii.line_total, 0),
            COALESCE(sii.cost_price, 0),
            COALESCE(sii.profit, 0),
            sii.notes,
            sii.created_at,
            sii.updated_at
          FROM sale_invoice_items sii
        `);

        await knex.schema.dropTable('sale_invoice_items');
        await knex.schema.renameTable(tmp, 'sale_invoice_items');

        await knex.schema.alterTable('sale_invoice_items', (table) => {
          table.index('sale_invoice_id', 'idx_sii_sale_invoice_id');
          table.index('product_id', 'idx_sii_product_id');
          table.index('stock_batch_id', 'idx_sii_stock_batch_id');
        });

        await knex.raw(`
          UPDATE sqlite_sequence
          SET seq = (SELECT COALESCE(MAX(id), 0) FROM sale_invoice_items)
          WHERE name = 'sale_invoice_items'
        `);
      }
    }

    // 3b. Rebuild `stock_movements` -> make `stock_batch_id NULLABLE`
    if (await knex.schema.hasTable('stock_movements')) {
      const cols = await getTableColumns(knex, 'stock_movements');
      const needsRebuild = Number(cols.get('stock_batch_id')?.notnull ?? 0) === 1;

      if (needsRebuild) {
        const tmp = 'stock_movements_unified_tmp';
        await knex.schema.dropTableIfExists(tmp);

        await knex.schema.createTable(tmp, (table) => {
          table.increments('id').primary();
          table.integer('product_id').unsigned().notNullable();
          table.integer('stock_batch_id').unsigned().nullable();
          table.string('movement_type', 30).notNullable();
          table.decimal('quantity', 15, 3).notNullable();
          table.decimal('quantity_before', 15, 3).notNullable();
          table.decimal('quantity_after', 15, 3).notNullable();
          table.string('reference_type', 30).nullable();
          table.integer('reference_id').nullable();
          table.string('reference_number', 50).nullable();
          table.integer('supplier_id').unsigned().nullable();
          table.integer('customer_id').unsigned().nullable();
          table.text('notes').nullable();
          table.integer('created_by').nullable();
          table.timestamp('created_at').nullable();

          table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
          table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('SET NULL');
        });

        await knex.raw(`
          INSERT INTO ${tmp} (
            id, product_id, stock_batch_id, movement_type, quantity,
            quantity_before, quantity_after, reference_type, reference_id,
            reference_number, supplier_id, customer_id, notes, created_by, created_at
          )
          SELECT
            id, product_id, stock_batch_id, movement_type, quantity,
            quantity_before, quantity_after, reference_type, reference_id,
            reference_number, supplier_id, customer_id, notes, created_by, created_at
          FROM stock_movements
        `);

        await knex.schema.dropTable('stock_movements');
        await knex.schema.renameTable(tmp, 'stock_movements');

        await knex.schema.alterTable('stock_movements', (table) => {
          table.index('product_id', 'idx_sm_product_id');
          table.index('stock_batch_id', 'idx_sm_batch_id');
          table.index('movement_type', 'idx_sm_movement_type');
          table.index('reference_type', 'idx_sm_ref_type');
          table.index('reference_id', 'idx_sm_ref_id');
          table.index('created_at', 'idx_sm_created_at');
        });

        await knex.raw(`
          UPDATE sqlite_sequence
          SET seq = (SELECT COALESCE(MAX(id), 0) FROM stock_movements)
          WHERE name = 'stock_movements'
        `);
      }
    }

    // 3c. Rebuild `stock_adjustments` -> add `product_id NOT NULL`, make `stock_batch_id NULLABLE`
    if (await knex.schema.hasTable('stock_adjustments')) {
      const cols = await getTableColumns(knex, 'stock_adjustments');
      const needsRebuild =
        !cols.has('product_id') || Number(cols.get('stock_batch_id')?.notnull ?? 0) === 1;

      if (needsRebuild) {
        const tmp = 'stock_adjustments_unified_tmp';
        await knex.schema.dropTableIfExists(tmp);

        await knex.schema.createTable(tmp, (table) => {
          table.increments('id').primary();
          table.integer('product_id').unsigned().notNullable();
          table.integer('stock_batch_id').unsigned().nullable();
          table.decimal('quantity', 15, 3).notNullable();
          table.string('reason', 255).notNullable();
          table.text('notes').nullable();
          table.decimal('quantity_before', 15, 3).notNullable().defaultTo(0);
          table.decimal('quantity_after', 15, 3).notNullable().defaultTo(0);
          table.timestamp('created_at').defaultTo(knex.fn.now());
          table.timestamp('updated_at').defaultTo(knex.fn.now());

          table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
          table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('SET NULL');
        });

        const productSource = cols.has('product_id')
          ? `COALESCE(sa.product_id, (SELECT sb.product_id FROM stock_batches sb WHERE sb.id = sa.stock_batch_id), (SELECT p.id FROM products p ORDER BY p.id ASC LIMIT 1))`
          : `COALESCE((SELECT sb.product_id FROM stock_batches sb WHERE sb.id = sa.stock_batch_id), (SELECT p.id FROM products p ORDER BY p.id ASC LIMIT 1))`;

        const qtyBeforeExpr = cols.has('quantity_before') ? 'COALESCE(sa.quantity_before, 0)' : '0';
        const qtyAfterExpr = cols.has('quantity_after') ? 'COALESCE(sa.quantity_after, 0)' : '0';

        await knex.raw(`
          INSERT INTO ${tmp} (
            id, product_id, stock_batch_id, quantity, reason, notes,
            quantity_before, quantity_after, created_at, updated_at
          )
          SELECT
            sa.id,
            ${productSource},
            sa.stock_batch_id,
            sa.quantity,
            sa.reason,
            sa.notes,
            ${qtyBeforeExpr},
            ${qtyAfterExpr},
            sa.created_at,
            sa.updated_at
          FROM stock_adjustments sa
        `);

        await knex.schema.dropTable('stock_adjustments');
        await knex.schema.renameTable(tmp, 'stock_adjustments');

        await knex.schema.alterTable('stock_adjustments', (table) => {
          table.index('product_id', 'idx_sa_product_id');
          table.index('stock_batch_id', 'idx_sa_stock_batch_id');
        });

        await knex.raw(`
          UPDATE sqlite_sequence
          SET seq = (SELECT COALESCE(MAX(id), 0) FROM stock_adjustments)
          WHERE name = 'stock_adjustments'
        `);
      }
    }

    // 3d. Rebuild `consignment_settlement_items` -> make `stock_batch_id NULLABLE`
    if (await knex.schema.hasTable('consignment_settlement_items')) {
      const cols = await getTableColumns(knex, 'consignment_settlement_items');
      const needsRebuild = Number(cols.get('stock_batch_id')?.notnull ?? 0) === 1;

      if (needsRebuild) {
        const tmp = 'consignment_settlement_items_unified_tmp';
        await knex.schema.dropTableIfExists(tmp);

        await knex.schema.createTable(tmp, (table) => {
          table.increments('id').primary();
          table.integer('settlement_id').unsigned().notNullable();
          table.integer('purchase_invoice_item_id').unsigned().nullable();
          table.integer('product_id').unsigned().notNullable();
          table.integer('stock_batch_id').unsigned().nullable();
          table.decimal('received_quantity', 15, 3).notNullable().defaultTo(0);
          table.decimal('sold_quantity', 15, 3).notNullable().defaultTo(0);
          table.decimal('remaining_quantity', 15, 3).notNullable().defaultTo(0);
          table.decimal('sales_amount', 15, 2).notNullable().defaultTo(0);
          table.string('resolution_policy').notNullable().defaultTo('manual');
          table.decimal('resolved_quantity', 15, 3).notNullable().defaultTo(0);
          table.integer('stock_movement_id').unsigned().nullable();
          table.text('notes').nullable();
          table.timestamp('created_at').defaultTo(knex.fn.now());

          table.foreign('settlement_id').references('id').inTable('consignment_settlements').onDelete('CASCADE');
          table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
          table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('SET NULL');
        });

        await knex.raw(`
          INSERT INTO ${tmp} (
            id, settlement_id, purchase_invoice_item_id, product_id, stock_batch_id,
            received_quantity, sold_quantity, remaining_quantity, sales_amount,
            resolution_policy, resolved_quantity, stock_movement_id, notes, created_at
          )
          SELECT
            id, settlement_id, purchase_invoice_item_id, product_id, stock_batch_id,
            COALESCE(received_quantity, 0),
            COALESCE(sold_quantity, 0),
            COALESCE(remaining_quantity, 0),
            COALESCE(sales_amount, 0),
            COALESCE(resolution_policy, 'manual'),
            COALESCE(resolved_quantity, 0),
            stock_movement_id,
            notes,
            created_at
          FROM consignment_settlement_items
        `);

        await knex.schema.dropTable('consignment_settlement_items');
        await knex.schema.renameTable(tmp, 'consignment_settlement_items');

        await knex.schema.alterTable('consignment_settlement_items', (table) => {
          table.index('settlement_id', 'idx_csi_settlement_id');
          table.index('product_id', 'idx_csi_product_id');
        });

        await knex.raw(`
          UPDATE sqlite_sequence
          SET seq = (SELECT COALESCE(MAX(id), 0) FROM consignment_settlement_items)
          WHERE name = 'consignment_settlement_items'
        `);
      }
    }
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Architectural migration: intentionally non-destructive on rollback.
}

export const config = {
  transaction: false,
};
