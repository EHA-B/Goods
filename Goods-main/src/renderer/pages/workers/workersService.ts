import { getArabicErrorMessage } from "../../lib/errorNormalizer";

export type WorkerType = "employee" | "worker";
export type WorkerState = "active" | "inactive";

export type Worker = {
  id: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  type: WorkerType;
  notes: string;
  state: WorkerState;
  createdAt: string;
  updatedAt: string;
};

export type WorkerInput = {
  name: string;
  phone?: string;
  address?: string;
  balance?: number;
  type: WorkerType;
  notes?: string;
  state: WorkerState;
};

export type WorkerPayment = {
  id: number;
  workerId: number;
  cashboxId: number;
  cashboxName: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountBase: number;
  paymentDate: string;
  notes: string;
  status: "active" | "reversed";
  reversalReason: string;
  reversedPaymentId: number | null;
  cashboxTransactionId: number | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RecordWorkerPaymentInput = {
  workerId: number;
  cashboxId: number;
  amount: number;
  paymentDate: string;
  notes?: string;
};

type WorkerApi = {
  list(): Promise<unknown[]>;
  get(id: number): Promise<unknown>;
  create(input: unknown): Promise<unknown>;
  update(id: number, input: unknown): Promise<unknown>;
  remove(id: number): Promise<unknown>;
  recordPayment(input: unknown): Promise<unknown>;
  reversePayment(paymentId: number, reason: string): Promise<unknown>;
  getPayments(workerId: number): Promise<unknown[]>;
};

function api(): WorkerApi {
  return (
    window.stockliteApi as typeof window.stockliteApi & {
      workers: WorkerApi;
    }
  ).workers;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function mapWorker(value: unknown): Worker {
  const row = asRecord(value);

  return {
    id: numberValue(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    balance: numberValue(row.balance),
    type: row.type === "employee" ? "employee" : "worker",
    notes: String(row.notes ?? ""),
    state: row.state === "inactive" ? "inactive" : "active",
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

function mapPayment(value: unknown): WorkerPayment {
  const row = asRecord(value);

  return {
    id: numberValue(row.id),
    workerId: numberValue(row.worker_id ?? row.workerId),
    cashboxId: numberValue(row.cashbox_id ?? row.cashboxId),
    cashboxName: String(row.cashbox_name ?? row.cashboxName ?? ""),
    amount: numberValue(row.amount),
    currency: String(row.currency ?? "SYP"),
    exchangeRate: numberValue(row.exchange_rate ?? row.exchangeRate ?? 1),
    amountBase: numberValue(row.amount_base ?? row.amountBase ?? row.amount),
    paymentDate: String(row.payment_date ?? row.paymentDate ?? ""),
    notes: String(row.notes ?? ""),
    status: row.status === "reversed" ? "reversed" : "active",
    reversalReason: String(row.reversal_reason ?? row.reversalReason ?? ""),
    reversedPaymentId: nullableNumber(
      row.reversed_payment_id ?? row.reversedPaymentId,
    ),
    cashboxTransactionId: nullableNumber(
      row.cashbox_transaction_id ?? row.cashboxTransactionId,
    ),
    balanceBefore: nullableNumber(row.balance_before ?? row.balanceBefore),
    balanceAfter: nullableNumber(row.balance_after ?? row.balanceAfter),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

export function getWorkerTypeLabel(type: WorkerType) {
  return type === "employee" ? "موظف" : "عامل";
}

export function getWorkerStateLabel(state: WorkerState) {
  return state === "active" ? "نشط" : "غير نشط";
}

export function getWorkerErrorMessage(error: unknown) {
  return getArabicErrorMessage(
    error,
    "تعذر تنفيذ العملية على سجل العمال والموظفين.",
  );
}

export const workersService = {
  async list(): Promise<Worker[]> {
    const rows = await api().list();
    return rows.map(mapWorker);
  },

  async get(id: number): Promise<Worker> {
    return mapWorker(await api().get(id));
  },

  async create(input: WorkerInput): Promise<Worker> {
    return mapWorker(
      await api().create({
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        balance: Number(input.balance ?? 0),
        type: input.type,
        notes: input.notes?.trim() || null,
        state: input.state,
      }),
    );
  },

  async update(id: number, input: WorkerInput): Promise<Worker> {
    return mapWorker(
      await api().update(id, {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        balance: Number(input.balance ?? 0),
        type: input.type,
        notes: input.notes?.trim() || null,
        state: input.state,
      }),
    );
  },

  remove(id: number) {
    return api().remove(id);
  },

  async getPayments(workerId: number): Promise<WorkerPayment[]> {
    const rows = await api().getPayments(workerId);
    return rows.map(mapPayment);
  },

  async recordPayment(input: RecordWorkerPaymentInput) {
    const result = asRecord(
      await api().recordPayment({
        worker_id: input.workerId,
        cashbox_id: input.cashboxId,
        amount: input.amount,
        payment_date: input.paymentDate,
        notes: input.notes?.trim() || null,
      }),
    );

    return {
      payment: mapPayment(result.payment),
      worker: mapWorker(result.worker),
      cashbox: result.cashbox,
    };
  },

  async reversePayment(paymentId: number, reason: string) {
    const result = asRecord(
      await api().reversePayment(paymentId, reason.trim()),
    );

    return {
      reversedPayment: mapPayment(result.reversedPayment),
      worker: mapWorker(result.worker),
      cashbox: result.cashbox,
    };
  },
};
