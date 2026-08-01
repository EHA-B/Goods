import { ipcMain } from "electron";
import { getDatabase } from "../src/main/database/dbmanager";

type CashboxInput = {
  name?: unknown;
  parent_id?: unknown;
  balance?: unknown;
  initial_balance?: unknown;
  currency?: unknown;
  isActive?: unknown;
  notes?: unknown;
};

type CashboxTransactionInput = {
  cashbox_id?: unknown;
  reference_type?: unknown;
  reference_id?: unknown;
  amount?: unknown;
  direction?: unknown;
  balance_before?: unknown;
  balance_after?: unknown;
  transaction_date?: unknown;
  notes?: unknown;
};

function validationError(message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = "VALIDATION_ERROR";
  return error;
}

function normalizeDatabaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = new Error(message) as Error & { code?: string };

  if (message.includes("FOREIGN KEY constraint failed")) {
    normalized.code = "CASHBOX_IN_USE";
    normalized.message = "لا يمكن حذف الصندوق لوجود حركات مرتبطة به.";
  }

  throw normalized;
}

function normalizeInput(input: CashboxInput, partial = false) {
  if (!input || typeof input !== "object") {
    throw validationError("بيانات الصندوق مطلوبة.");
  }

  const result: Record<string, unknown> = {};

  if (!partial || Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = String(input.name ?? "").trim();
    if (!name) throw validationError("اسم الصندوق مطلوب.");
    result.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(input, "parent_id")) {
    result.parent_id = input.parent_id ? Number(input.parent_id) : null;
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "balance")) {
    result.balance = Number(input.balance ?? 0);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, "initial_balance")) {
    result.initial_balance = Number(input.initial_balance ?? 0);
  }

  if (Object.prototype.hasOwnProperty.call(input, "currency")) {
    result.currency = String(input.currency ?? "SAR").trim() || "SAR";
  }

  if (Object.prototype.hasOwnProperty.call(input, "notes")) {
    const notes = String(input.notes ?? "").trim();
    result.notes = notes || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    result.isActive = Boolean(input.isActive);
  } else if (!partial) {
    result.isActive = true;
  }

  return result;
}

export function registerCashboxIpc() {
  ipcMain.removeHandler("cashboxes:list");
  ipcMain.removeHandler("cashboxes:get");
  ipcMain.removeHandler("cashboxes:create");
  ipcMain.removeHandler("cashboxes:update");
  ipcMain.removeHandler("cashboxes:summary");
  ipcMain.removeHandler("cashboxes:transfer");

  ipcMain.handle("cashboxes:list", async () => {
    return getDatabase()("cashboxes as c")
      .select("c.*", "p.name as parent_name")
      .leftJoin("cashboxes as p", "c.parent_id", "p.id")
      .orderBy("c.id", "desc");
  });

  ipcMain.handle("cashboxes:get", async (_event, id: number) => {
    const cashbox = await getDatabase()("cashboxes").where({ id: Number(id) }).first();
    if (!cashbox) throw validationError("الصندوق غير موجود.");
    return cashbox;
  });

  ipcMain.handle("cashboxes:create", async (_event, input: CashboxInput) => {
    const payload = normalizeInput(input);
    try {
      const [id] = await getDatabase()("cashboxes").insert({
        ...payload,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now(),
      });
      return await getDatabase()("cashboxes").where({ id }).first();
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("cashboxes:update", async (_event, id: number, input: CashboxInput) => {
    const cashboxId = Number(id);
    const payload = normalizeInput(input, true);
    if (Object.keys(payload).length === 0) {
      throw validationError("لا توجد بيانات لتعديلها.");
    }

    try {
      const changed = await getDatabase()("cashboxes")
        .where({ id: cashboxId })
        .update({ ...payload, updated_at: getDatabase().fn.now() });

      if (!changed) {
        throw validationError("الصندوق غير موجود.");
      }
      return await getDatabase()("cashboxes").where({ id: cashboxId }).first();
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("cashboxes:summary", async () => {
    const cashboxStats = await getDatabase()("cashboxes")
      .sum("balance as total_balance")
      .sum(getDatabase().raw("CASE WHEN isActive = 1 THEN 1 ELSE 0 END as active_count"))
      .first();

    const transactionStats = await getDatabase()("cashbox_transactions")
      .sum(getDatabase().raw("CASE WHEN direction = 'in' THEN amount ELSE 0 END as total_in"))
      .sum(getDatabase().raw("CASE WHEN direction = 'out' THEN amount ELSE 0 END as total_out"))
      .first();

    return {
      total_balance: cashboxStats?.total_balance || 0,
      active_count: cashboxStats?.active_count || 0,
      total_in: transactionStats?.total_in || 0,
      total_out: transactionStats?.total_out || 0,
    };
  });

  ipcMain.handle("cashboxes:transfer", async (_event, from_id: number, to_id: number, amount: number, date: string, notes: string) => {
    if (!from_id || !to_id || !amount) {
      throw validationError("بيانات التحويل مطلوبة.");
    }
    if (from_id === to_id) {
      throw validationError("لا يمكن التحويل لنفس الصندوق.");
    }
    
    try {
      return await getDatabase().transaction(async (trx) => {
        const fromCashbox = await trx("cashboxes").where({ id: from_id }).first();
        if (!fromCashbox) throw validationError("صندوق المصدر غير موجود.");
        if (fromCashbox.balance < amount) throw validationError("الرصيد غير كافٍ.");

        const toCashbox = await trx("cashboxes").where({ id: to_id }).first();
        if (!toCashbox) throw validationError("صندوق الوجهة غير موجود.");

        const newFromBalance = Number(fromCashbox.balance) - amount;
        const newToBalance = Number(toCashbox.balance) + amount;
        const transactionDate = date || new Date().toISOString();

        await trx("cashboxes").where({ id: from_id }).update({ balance: newFromBalance, updated_at: getDatabase().fn.now() });
        await trx("cashboxes").where({ id: to_id }).update({ balance: newToBalance, updated_at: getDatabase().fn.now() });

        await trx("cashbox_transactions").insert([
          {
            cashbox_id: from_id,
            reference_type: 'transfer',
            reference_id: to_id,
            amount: amount,
            direction: 'out',
            balance_before: fromCashbox.balance,
            balance_after: newFromBalance,
            transaction_date: transactionDate,
            notes: notes || null,
            created_at: getDatabase().fn.now(),
            updated_at: getDatabase().fn.now()
          },
          {
            cashbox_id: to_id,
            reference_type: 'transfer',
            reference_id: from_id,
            amount: amount,
            direction: 'in',
            balance_before: toCashbox.balance,
            balance_after: newToBalance,
            transaction_date: transactionDate,
            notes: notes || null,
            created_at: getDatabase().fn.now(),
            updated_at: getDatabase().fn.now()
          }
        ]);

        return { success: true, message: "تم التحويل بنجاح" };
      });
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  // Cashbox Transaction Endpoints
  ipcMain.removeHandler("cashboxTransactions:list");
  ipcMain.removeHandler("cashboxTransactions:get");
  ipcMain.removeHandler("cashboxTransactions:create");
  ipcMain.removeHandler("cashboxTransactions:update");
  ipcMain.removeHandler("cashboxTransactions:remove");

  ipcMain.handle("cashboxTransactions:list", async () => {
    return getDatabase()("cashbox_transactions").select("*").orderBy("id", "desc");
  });

  ipcMain.handle("cashboxTransactions:get", async (_event, id: number) => {
    const tx = await getDatabase()("cashbox_transactions").where({ id: Number(id) }).first();
    if (!tx) throw validationError("الحركة غير موجودة.");
    return tx;
  });

  ipcMain.handle("cashboxTransactions:create", async (_event, input: CashboxTransactionInput) => {
    try {
      const [id] = await getDatabase()("cashbox_transactions").insert({
        ...input,
        created_at: getDatabase().fn.now(),
        updated_at: getDatabase().fn.now(),
      });
      return await getDatabase()("cashbox_transactions").where({ id }).first();
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });

  ipcMain.handle("cashboxTransactions:remove", async (_event, id: number) => {
    try {
      const deleted = await getDatabase()("cashbox_transactions").where({ id: Number(id) }).del();
      if (!deleted) throw validationError("الحركة غير موجودة.");
      return { success: true };
    } catch (error) {
      return normalizeDatabaseError(error);
    }
  });
}
