import { ipcMain } from "electron";
import { getDatabase } from "../src/main/database/dbmanager";

type ProductInput = {
  name?: unknown;
  code?: unknown;
  unit?: unknown;
  category?: unknown;
  description?: unknown;
  isActive?: unknown;
};

type ProductRow = {
  id: number;
  name: string;
  code: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  isActive: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

function validationError(message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = "VALIDATION_ERROR";
  return error;
}

function normalizeInput(input: ProductInput, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError("بيانات المنتج مطلوبة.");
  }

  const result: Record<string, unknown> = {};

  const requiredStringFields = ["name", "unit"] as const;
  for (const field of requiredStringFields) {
    if (!partial || Object.prototype.hasOwnProperty.call(input, field)) {
      const value = String(input[field] ?? "").trim();
      if (!value) {
        const labels = { name: "اسم المنتج", unit: "الوحدة" };
        throw validationError(`${labels[field]} مطلوب.`);
      }
      result[field] = value;
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "code")) {
    const code = String(input.code ?? "").trim();
    result.code = code || null;
  }

  for (const field of ["category", "description"] as const) {
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

function normalizeDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message) as Error & { code?: string };

  if (message.includes("UNIQUE constraint failed: products.code")) {
    normalized.code = "DUPLICATE_PRODUCT_CODE";
    normalized.message = "كود المنتج مستخدم مسبقًا.";
  } else if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "PRODUCT_IN_USE";
    normalized.message = "لا يمكن حذف المنتج لأنه مرتبط بحركات أو دفعات مخزون.";
  }

  throw normalized;
}

async function getProductOrThrow(id: number): Promise<ProductRow> {
  const product = await getDatabase()<ProductRow>("products").where({ id }).first();
  if (!product) {
    const error = new Error("المنتج غير موجود.") as Error & { code?: string };
    error.code = "NOT_FOUND";
    throw error;
  }
  return product;
}

export function registerProductIpc() {
  ipcMain.removeHandler("products:list");
  ipcMain.removeHandler("products:get");
  ipcMain.removeHandler("products:create");
  ipcMain.removeHandler("products:update");
  ipcMain.removeHandler("products:remove");

  ipcMain.handle("products:list", async () => {
    return getDatabase()<ProductRow>("products").select("*").orderBy("id", "desc");
  });

  ipcMain.handle("products:get", async (_event, id: number) => {
    return getProductOrThrow(Number(id));
  });

  ipcMain.handle("products:create", async (_event, input: ProductInput) => {
    const payload = normalizeInput(input);
    try {
      const [id] = await getDatabase()( "products" ).insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now(),
      });
      return getProductOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("products:update", async (_event, id: number, input: ProductInput) => {
    const productId = Number(id);
    const payload = normalizeInput(input, true);
    if (Object.keys(payload).length === 0) {
      throw validationError("لا توجد بيانات لتعديلها.");
    }

    try {
      const changed = await getDatabase()( "products" )
        .where({ id: productId })
        .update({ ...payload, updated_at: getDatabase().fn.now() });

      if (!changed) {
        const error = new Error("المنتج غير موجود.") as Error & { code?: string };
        error.code = "NOT_FOUND";
        throw error;
      }
      return getProductOrThrow(productId);
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("products:remove", async (_event, id: number) => {
    const productId = Number(id);
    try {
      const deleted = await getDatabase()( "products" ).where({ id: productId }).del();
      if (!deleted) {
        const error = new Error("المنتج غير موجود.") as Error & { code?: string };
        error.code = "NOT_FOUND";
        throw error;
      }
      return { success: true };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("products:adjustStock", async (_event, id: number, input: any) => {
    const productId = Number(id);
    const qty = parseFloat(input.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw validationError("يجب أن تكون الكمية رقمًا موجبًا.");
    }
    if (!input.type || !input.reason) {
      throw validationError("نوع التسوية والسبب مطلوبان.");
    }

    try {
      return await getDatabase().transaction(async (trx) => {
        // Get product to ensure it exists
        const product = await trx("products").where({ id: productId }).first();
        if (!product) {
          const error = new Error("المنتج غير موجود.") as Error & { code?: string };
          error.code = "NOT_FOUND";
          throw error;
        }

        // Get first available stock batch
        let stockBatch = await trx("stock_batches").where({ product_id: productId }).orderBy("id", "asc").first();

        if (!stockBatch) {
          if (input.type === "subtract") {
            throw validationError("لا يمكن إنقاص المخزون لعدم وجود دفعات سابقة.");
          }
          // Create new batch
          const [newBatchId] = await trx("stock_batches").insert({
            product_id: productId,
            quantity: 0,
            remaining_quantity: 0,
            isActive: true,
            created_at: getDatabase().fn.now(),
            updated_at: getDatabase().fn.now(),
          });
          stockBatch = await trx("stock_batches").where({ id: newBatchId }).first();
        }

        const adjustmentAmount = input.type === "add" ? qty : -qty;

        // Insert adjustment
        await trx("stock_adjustments").insert({
          stock_batch_id: stockBatch.id,
          quantity: adjustmentAmount,
          reason: String(input.reason),
          notes: input.notes ? String(input.notes) : null,
          created_at: getDatabase().fn.now(),
          updated_at: getDatabase().fn.now(),
        });

        // Update remaining quantity
        const newRemaining = Number(stockBatch.remaining_quantity || 0) + adjustmentAmount;
        await trx("stock_batches")
          .where({ id: stockBatch.id })
          .update({
            remaining_quantity: newRemaining,
            updated_at: getDatabase().fn.now(),
          });

        return { success: true, newRemaining };
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
