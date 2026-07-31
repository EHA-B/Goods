import { ipcMain } from "electron";
import { getDatabase } from "../src/main/database/dbmanager";

type CustomerInput = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  balance?: unknown;
  notes?: unknown;
  isActive?: unknown;
};

type CustomerRow = {
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

function normalizeInput(input: CustomerInput, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError("بيانات العميل مطلوبة.");
  }

  const result: Record<string, unknown> = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = String(input.name ?? "").trim();
    if (!name) throw validationError("اسم العميل مطلوب.");
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
    normalized.code = "CUSTOMER_IN_USE";
    normalized.message =
      "لا يمكن حذف العميل لوجود فواتير أو مدفوعات مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
  }

  throw normalized;
}

async function getCustomerOrThrow(id: number): Promise<CustomerRow> {
  const customer = await getDatabase()<CustomerRow>("customers")
    .where({ id })
    .first();

  if (!customer) {
    const error = new Error("العميل غير موجود.") as Error & { code?: string };
    error.code = "NOT_FOUND";
    throw error;
  }

  return customer;
}

export function registerCustomerIpc() {
  ipcMain.removeHandler("customers:list");
  ipcMain.removeHandler("customers:get");
  ipcMain.removeHandler("customers:create");
  ipcMain.removeHandler("customers:update");
  ipcMain.removeHandler("customers:remove");

  ipcMain.handle("customers:list", async () => {
    return getDatabase()<CustomerRow>("customers")
      .select("*")
      .orderBy("id", "desc");
  });

  ipcMain.handle("customers:get", async (_event, id: number) => {
    return getCustomerOrThrow(Number(id));
  });

  ipcMain.handle("customers:create", async (_event, input: CustomerInput) => {
    const payload = normalizeInput(input);

    try {
      const [id] = await getDatabase()( "customers" ).insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now(),
      });

      return getCustomerOrThrow(Number(id));
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle(
    "customers:update",
    async (_event, id: number, input: CustomerInput) => {
      const customerId = Number(id);
      const payload = normalizeInput(input, true);

      if (Object.keys(payload).length === 0) {
        throw validationError("لا توجد بيانات لتعديلها.");
      }

      try {
        const changed = await getDatabase()( "customers" )
          .where({ id: customerId })
          .update({ ...payload, updated_at: getDatabase().fn.now() });

        if (!changed) {
          const error = new Error("العميل غير موجود.") as Error & { code?: string };
          error.code = "NOT_FOUND";
          throw error;
        }

        return getCustomerOrThrow(customerId);
      } catch (error) {
        return normalizeDatabaseError(error);
      }
    },
  );

  ipcMain.handle("customers:remove", async (_event, id: number) => {
    const customerId = Number(id);

    try {
      const deleted = await getDatabase()( "customers" )
        .where({ id: customerId })
        .del();

      if (!deleted) {
        const error = new Error("العميل غير موجود.") as Error & { code?: string };
        error.code = "NOT_FOUND";
        throw error;
      }

      return { success: true };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
