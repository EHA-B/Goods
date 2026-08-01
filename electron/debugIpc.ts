import { ipcMain } from "electron";

import { getDatabase } from "../src/main/database/dbmanager";

const ALLOWED_TABLES = new Set([
  "products",
  "customers",
  "suppliers",
  "stock_batches",
  "stock_adjustments",
  "purchase_invoices",
  "purchase_invoice_items",
  "sale_invoices",
  "sale_invoice_items",
  "cashboxes",
  "cashbox_transactions",
  "transactions",
  "transaction_categories",
  "payments",
  "users",
  "settings",
  "activity_logs",
]);

function validationError(message: string) {
  const error = new Error(message) as Error & {
    code?: string;
  };

  error.code = "VALIDATION_ERROR";

  return error;
}

export function registerDebugIpc() {
  ipcMain.removeHandler("debug:table");

  ipcMain.handle(
    "debug:table",
    async (_event, tableName: unknown) => {
      if (typeof tableName !== "string") {
        throw validationError("اسم الجدول غير صالح.");
      }

      const normalizedTableName = tableName.trim();

      if (!ALLOWED_TABLES.has(normalizedTableName)) {
        throw validationError(
          `غير مسموح بعرض الجدول: ${normalizedTableName}`,
        );
      }

      const rows = await getDatabase()(
        normalizedTableName,
      )
        .select("*")
        .orderBy("id", "desc");

      console.log(
        `\n========== TABLE: ${normalizedTableName} ==========`,
      );

      if (rows.length === 0) {
        console.log("الجدول فارغ.");
      } else {
        console.table(rows);
      }

      console.log(
        `عدد السجلات: ${rows.length}`,
      );

      console.log(
        "================================================\n",
      );

      return rows;
    },
  );
}