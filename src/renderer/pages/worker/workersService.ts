export type WorkerPartyType = "worker" | "agency";
export type WorkerPartyState = "active" | "inactive";

export type WorkerParty = {
  id: number;
  name: string;
  phone: string;
  type: WorkerPartyType;
  balance: number;
  address: string;
  notes: string;
  state: WorkerPartyState;
  createdAt: string;
  updatedAt: string;
};

export type WorkerPartyInput = {
  name: string;
  phone?: string;
  type: WorkerPartyType;
  balance?: number;
  address?: string;
  notes?: string;
  state: WorkerPartyState;
};

const STORAGE_KEY = "stocklite.workers.v1";

function readRows(): WorkerParty[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        id: Number(item?.id),
        name: String(item?.name ?? "").trim(),
        phone: String(item?.phone ?? "").trim(),
        type:
          item?.type === "agency"
            ? ("agency" as const)
            : ("worker" as const),
        balance: Number(item?.balance ?? 0),
        address: String(item?.address ?? "").trim(),
        notes: String(item?.notes ?? "").trim(),
        state:
          item?.state === "inactive"
            ? ("inactive" as const)
            : ("active" as const),
        createdAt: String(item?.createdAt ?? ""),
        updatedAt: String(item?.updatedAt ?? ""),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.id) &&
          item.id > 0 &&
          Boolean(item.name),
      );
  } catch {
    return [];
  }
}

function writeRows(rows: WorkerParty[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(rows),
  );

  window.dispatchEvent(
    new CustomEvent("stocklite:workers-changed"),
  );
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
}

function validateInput(
  input: WorkerPartyInput,
  currentId?: number,
) {
  const name = input.name.trim().replace(/\s+/g, " ");

  if (!name) {
    throw new Error("اسم العامل أو الجهة مطلوب.");
  }

  if (name.length > 120) {
    throw new Error("الاسم يجب ألا يتجاوز 120 محرفًا.");
  }

  const balance = Number(input.balance ?? 0);

  if (!Number.isFinite(balance)) {
    throw new Error("الرصيد المدخل غير صالح.");
  }

  const duplicate = readRows().find(
    (item) =>
      item.id !== currentId &&
      item.type === input.type &&
      normalizeName(item.name) === normalizeName(name),
  );

  if (duplicate) {
    throw new Error(
      input.type === "agency"
        ? "توجد جهة بهذا الاسم مسبقًا."
        : "يوجد عامل بهذا الاسم مسبقًا.",
    );
  }

  return {
    name,
    balance,
  };
}

export const workersService = {
  async list(): Promise<WorkerParty[]> {
    return readRows().sort((a, b) => b.id - a.id);
  },

  async get(id: number): Promise<WorkerParty> {
    const row = readRows().find((item) => item.id === id);

    if (!row) {
      throw new Error("تعذر العثور على العامل أو الجهة المطلوبة.");
    }

    return row;
  },

  async create(input: WorkerPartyInput): Promise<WorkerParty> {
    const validated = validateInput(input);
    const rows = readRows();
    const now = new Date().toISOString();

    const nextId =
      rows.reduce(
        (max, item) => Math.max(max, item.id),
        0,
      ) + 1;

    const row: WorkerParty = {
      id: nextId,
      name: validated.name,
      phone: input.phone?.trim() ?? "",
      type: input.type,
      balance: validated.balance,
      address: input.address?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      state: input.state,
      createdAt: now,
      updatedAt: now,
    };

    writeRows([...rows, row]);

    return row;
  },

  async update(
    id: number,
    input: WorkerPartyInput,
  ): Promise<WorkerParty> {
    const validated = validateInput(input, id);
    const rows = readRows();
    const index = rows.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error("تعذر العثور على العامل أو الجهة المطلوبة.");
    }

    const updated: WorkerParty = {
      ...rows[index],
      name: validated.name,
      phone: input.phone?.trim() ?? "",
      type: input.type,
      balance: validated.balance,
      address: input.address?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      state: input.state,
      updatedAt: new Date().toISOString(),
    };

    rows[index] = updated;
    writeRows(rows);

    return updated;
  },

  async remove(id: number): Promise<void> {
    const rows = readRows();

    if (!rows.some((item) => item.id === id)) {
      throw new Error("تعذر العثور على العامل أو الجهة المطلوبة.");
    }

    writeRows(rows.filter((item) => item.id !== id));
  },

  async registerPayment(
    id: number,
    amount: number,
  ): Promise<WorkerParty> {
    const rows = readRows();
    const index = rows.findIndex((item) => item.id === id);

    if (index < 0) {
      throw new Error("تعذر العثور على المستفيد من الدفعة.");
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("قيمة الدفعة غير صالحة.");
    }

    const updated: WorkerParty = {
      ...rows[index],
      balance: rows[index].balance - numericAmount,
      updatedAt: new Date().toISOString(),
    };

    rows[index] = updated;
    writeRows(rows);

    return updated;
  },
};

export function getWorkerTypeLabel(type: WorkerPartyType) {
  return type === "agency" ? "جهة توريد عمال" : "عامل / موظف";
}