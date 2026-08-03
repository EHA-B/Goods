import type { FinancialTransaction, TransactionDirection } from "../../components/transactions/types";

export type TransactionCategory = {
  id: number;
  name: string;
  type: TransactionDirection;
  description: string;
  isActive: boolean;
  transactionCount: number;
};

type CategoryRow = {
  id: number;
  name: string;
  type: TransactionDirection;
  description?: string | null;
  isActive?: number | boolean | null;
};

type TransactionRow = {
  id: number;
  category_id: number;
  cashbox_id: number;
  amount: number | string;
  direction: TransactionDirection;
  transaction_date: string;
  description?: string | null;
  reference_number?: string | null;
  notes?: string | null;
};

type CashboxLite = { id: number; name: string; isActive: number | boolean; balance: number; currency: string };

const toBoolean = (value: number | boolean | null | undefined) => value === true || value === 1;
const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

async function loadRows() {
  const [transactionRows, categoryRows, cashboxes] = await Promise.all([
    window.stockliteApi.transactions.list() as Promise<TransactionRow[]>,
    window.stockliteApi.transactionCategories.list() as Promise<CategoryRow[]>,
    window.stockliteApi.cashboxes.list() as Promise<CashboxLite[]>,
  ]);

  const categoryMap = new Map(categoryRows.map((item) => [Number(item.id), item]));
  const cashboxMap = new Map(cashboxes.map((item) => [Number(item.id), item]));

  const transactions: FinancialTransaction[] = transactionRows.map((item) => ({
    id: Number(item.id),
    categoryId: Number(item.category_id),
    categoryName: categoryMap.get(Number(item.category_id))?.name ?? "فئة غير معروفة",
    cashboxId: Number(item.cashbox_id),
    cashboxName: cashboxMap.get(Number(item.cashbox_id))?.name ?? "صندوق غير معروف",
    amount: toNumber(item.amount),
    direction: item.direction,
    transactionDate: item.transaction_date,
    description: item.description ?? "",
    referenceNumber: item.reference_number ?? "",
    notes: item.notes ?? "",
  }));

  const counts = new Map<number, number>();
  for (const transaction of transactions) {
    counts.set(transaction.categoryId, (counts.get(transaction.categoryId) ?? 0) + 1);
  }

  const categories: TransactionCategory[] = categoryRows.map((item) => ({
    id: Number(item.id),
    name: item.name,
    type: item.type,
    description: item.description ?? "",
    isActive: toBoolean(item.isActive),
    transactionCount: counts.get(Number(item.id)) ?? 0,
  }));

  return { transactions, categories, cashboxes };
}

export const transactionsService = {
  loadAll: loadRows,

  async getTransaction(id: number) {
    const { transactions } = await loadRows();
    return transactions.find((item) => item.id === id);
  },

  async createTransaction(input: Omit<FinancialTransaction, "id" | "categoryName" | "cashboxName">) {
    return window.stockliteApi.transactions.create({
      category_id: input.categoryId,
      cashbox_id: input.cashboxId,
      amount: input.amount,
      direction: input.direction,
      transaction_date: input.transactionDate,
      description: input.description || null,
      reference_number: input.referenceNumber || null,
      notes: input.notes || null,
    });
  },

  async updateTransaction(id: number, input: Omit<FinancialTransaction, "id" | "categoryName" | "cashboxName">) {
    return window.stockliteApi.transactions.update(id, {
      category_id: input.categoryId,
      cashbox_id: input.cashboxId,
      amount: input.amount,
      direction: input.direction,
      transaction_date: input.transactionDate,
      description: input.description || null,
      reference_number: input.referenceNumber || null,
      notes: input.notes || null,
    });
  },

  removeTransaction: (id: number) => window.stockliteApi.transactions.remove(id),

  getCategory: (id: number) => window.stockliteApi.transactionCategories.get(id) as Promise<CategoryRow>,

  createCategory(input: Omit<TransactionCategory, "id" | "transactionCount">) {
    return window.stockliteApi.transactionCategories.create({
      name: input.name,
      type: input.type,
      description: input.description || null,
      isActive: input.isActive,
    });
  },

  updateCategory(id: number, input: Omit<TransactionCategory, "id" | "transactionCount">) {
    return window.stockliteApi.transactionCategories.update(id, {
      name: input.name,
      type: input.type,
      description: input.description || null,
      isActive: input.isActive,
    });
  },

  removeCategory: (id: number) => window.stockliteApi.transactionCategories.remove(id),
};
