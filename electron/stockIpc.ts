import { ipcMain } from "electron";
import { getDatabase } from "../src/main/database/dbmanager";

function normalizeDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message) as Error & { code?: string };
  throw normalized;
}

export function registerStockIpc() {
  ipcMain.removeHandler("stocks:summary");
  ipcMain.removeHandler("stocks:items");

  // Endpoint for the top cards summary metrics
  ipcMain.handle("stocks:summary", async () => {
    try {
      const db = getDatabase();
      
      // Total units and Total value
      const totalsResult = await db("stock_batches")
        .where("isActive", 1)
        .andWhere("remaining_quantity", ">", 0)
        .sum("remaining_quantity as total_units")
        .sum(db.raw("remaining_quantity * purchase_price as total_value"))
        .first();

      const total_units = totalsResult?.total_units || 0;
      const total_value = totalsResult?.total_value || 0;

      // Aggregated product balances for low stock and out of stock
      const productBalances = await db("products")
        .select("products.id")
        .leftJoin("stock_batches", function() {
          this.on("products.id", "=", "stock_batches.product_id")
        })
        .where("products.isActive", 1)
        .groupBy("products.id")
        .select(db.raw("SUM(CASE WHEN stock_batches.isActive = 1 AND stock_batches.remaining_quantity > 0 THEN stock_batches.remaining_quantity ELSE 0 END) as total_qty"));

      let low_stock_count = 0;
      let out_of_stock_count = 0;
      const DEFAULT_MIN_LIMIT = 10;

      productBalances.forEach((p: any) => {
        if (p.total_qty <= 0) {
          out_of_stock_count++;
        } else if (p.total_qty <= DEFAULT_MIN_LIMIT) {
          low_stock_count++;
        }
      });

      // Expiring soon (within 30 days)
      const expiringSoon = await db("stock_batches")
        .count("id as count")
        .where("isActive", 1)
        .andWhere("remaining_quantity", ">", 0)
        .whereNotNull("expiry_date")
        .andWhere("expiry_date", "<=", db.raw("date('now', '+30 days')"))
        .first();

      return {
        total_units,
        total_value,
        low_stock_count,
        out_of_stock_count,
        expiring_soon_count: expiringSoon?.count || 0
      };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  // Endpoint for the paginated inventory items table
  ipcMain.handle("stocks:items", async (_event, pagination = { page: 1, limit: 10 }) => {
    try {
      const db = getDatabase();
      const page = parseInt(pagination.page as string) || 1;
      const limit = parseInt(pagination.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await db("products")
        .count("id as total")
        .where("isActive", 1)
        .first();

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

      const items = (rows as any[]).map((row: any) => {
        const DEFAULT_MIN_LIMIT = 10;
        const balance = row.current_balance || 0;
        let status = 'متوفر';
        if (balance <= 0) status = 'نافد';
        else if (balance <= DEFAULT_MIN_LIMIT) status = 'مخزون منخفض';

        return {
            product_id: row.product_id,
            product_name: row.product_name,
            product_code: row.product_code,
            product_category: row.product_category,
            product_unit: row.product_unit,
            current_balance: balance,
            total_value: row.total_value || 0,
            average_purchase_price: balance > 0 ? (row.total_value / balance) : 0,
            batch_count: row.batch_count || 0,
            suppliers: row.suppliers ? row.suppliers.split(',') : [],
            status,
            min_limit: DEFAULT_MIN_LIMIT
        };
      });

      return {
        data: items,
        pagination: {
          page,
          limit,
          total: countResult?.total || 0,
          totalPages: Math.ceil((Number(countResult?.total) || 0) / limit)
        }
      };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
