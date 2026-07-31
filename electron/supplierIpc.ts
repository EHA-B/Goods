import { ipcMain } from "electron";
import { getDatabase } from "../src/main/database/dbmanager";

type SupplierInput = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  balance?: unknown;
  notes?: unknown;
  isActive?: unknown;
};

type SupplierRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | string | null;
  notes: string | null;
  isActive: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

function validationError(message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = "VALIDATION_ERROR";
  return error;
}

function normalizeOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeInput(input: SupplierInput, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError("بيانات المورد مطلوبة.");
  }

  const result: Record<string, unknown> = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = String(input.name ?? "").trim();
    if (!name) throw validationError("اسم المورد مطلوب.");
    result.name = name;
  }

  for (const field of ["phone", "email", "address", "notes"] as const) {
    if (!partial || Object.prototype.hasOwnProperty.call(input, field)) {
      result[field] = normalizeOptionalString(input[field]);
    }
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "balance")) {
    const balance = Number(input.balance ?? 0);
    if (!Number.isFinite(balance)) {
      throw validationError("الرصيد الافتتاحي غير صالح.");
    }
    result.balance = balance;
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

  if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "SUPPLIER_IN_USE";
    normalized.message =
      "لا يمكن حذف المورد لوجود فواتير أو دفعات مخزون مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
  }

  throw normalized;
}

async function getSupplierOrThrow(id: number): Promise<SupplierRow> {
  const supplier = await getDatabase()<SupplierRow>("suppliers")
    .where({ id })
    .first();

  if (!supplier) {
    const error = new Error("المورد غير موجود.") as Error & { code?: string };
    error.code = "NOT_FOUND";
    throw error;
  }

  return supplier;
}

export function registerSupplierIpc() {
  ipcMain.removeHandler("suppliers:list");
  ipcMain.removeHandler("suppliers:get");
  ipcMain.removeHandler("suppliers:create");
  ipcMain.removeHandler("suppliers:update");
  ipcMain.removeHandler("suppliers:remove");

  ipcMain.handle("suppliers:list", async () => {
    return getDatabase()<SupplierRow>("suppliers")
      .select("*")
      .orderBy("id", "desc");
  });

  ipcMain.handle("suppliers:get", async (_event, id: number) => {
    return getSupplierOrThrow(Number(id));
  });

  ipcMain.handle("suppliers:create", async (_event, input: SupplierInput) => {
    const payload = normalizeInput(input);

    try {
      const [id] = await getDatabase()( "suppliers" ).insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now(),
      });

      return getSupplierOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle(
    "suppliers:update",
    async (_event, id: number, input: SupplierInput) => {
      const supplierId = Number(id);
      const payload = normalizeInput(input, true);

      if (Object.keys(payload).length === 0) {
        throw validationError("لا توجد بيانات لتعديلها.");
      }

      try {
        const changed = await getDatabase()( "suppliers" )
          .where({ id: supplierId })
          .update({ ...payload, updated_at: getDatabase().fn.now() });

        if (!changed) {
          const error = new Error("المورد غير موجود.") as Error & {
            code?: string;
          };
          error.code = "NOT_FOUND";
          throw error;
        }

        return getSupplierOrThrow(supplierId);
      } catch (error) {
        return normalizeDatabaseError(error);
      }
    },
  );

  ipcMain.handle("suppliers:remove", async (_event, id: number) => {
    const supplierId = Number(id);

    try {
      const deleted = await getDatabase()( "suppliers" )
        .where({ id: supplierId })
        .del();

      if (!deleted) {
        const error = new Error("المورد غير موجود.") as Error & {
          code?: string;
        };
        error.code = "NOT_FOUND";
        throw error;
      }

      return { success: true };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
