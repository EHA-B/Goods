import type { TransactionCategory, TransactionDirection } from "../../components/transactions/types";

type CashboxLite = { id: number; name: string; isActive: number | boolean; balance: number; currency: string };

const toBoolean = (value: number | boolean | null | undefined) => value === true || value === 1;

export const transactionsService = {
  async list(filters?: any, pagination?: any) {
    const response = await window.stockliteApi.transactions.list(filters, pagination);
    
    // Map items to frontend models
    const items = response.items.map((item: any) => ({
      id: Number(item.id),
      type: item.direction,
      category_id: Number(item.category_id),
      category_name: item.category_name || "فئة غير معروفة",
      cashbox_id: Number(item.cashbox_id),
      cashbox_name: item.cashbox_name || "صندوق غير معروف",
      amount: Number(item.amount),
      transaction_date: item.transaction_date,
      description: item.description || null,
      reference_number: item.reference_number || null,
      notes: item.notes || null,
      status: item.status,
      cashbox_transaction_id: item.cashbox_transaction_id ? Number(item.cashbox_transaction_id) : null,
      cancelled_at: item.cancelled_at || null,
      cancellation_reason: item.cancellation_reason || null,
      created_at: item.created_at || "",
      updated_at: item.updated_at || "",
    }));

    return {
      items,
      pagination: response.pagination,
    };
  },

  getDetails(id: number) {
    return window.stockliteApi.transactions.getDetails(id);
  },

  createFinancial(input: {
    type: TransactionDirection;
    categoryId: number;
    cashboxId: number;
    amount: number;
    transactionDate: string;
    description?: string;
    referenceNumber?: string;
    notes?: string;
  }) {
    return window.stockliteApi.transactions.createFinancial({
      type: input.type,
      category_id: input.categoryId,
      cashbox_id: input.cashboxId,
      amount: input.amount,
      transaction_date: input.transactionDate,
      description: input.description || null,
      reference_number: input.referenceNumber || null,
      notes: input.notes || null,
    });
  },

  cancel(id: number, reason: string) {
    return window.stockliteApi.transactions.cancel(id, reason);
  },

  getSummary(filters?: any) {
    return window.stockliteApi.transactions.summary(filters);
  },

  // Categories API (keep existing mapping)
  async loadCategories() {
    const rows = await window.stockliteApi.transactionCategories.list();
    return (rows as any[]).map((item) => ({
      id: Number(item.id),
      name: item.name,
      type: item.type,
      description: item.description ?? "",
      isActive: toBoolean(item.isActive),
      transactionCount: 0, // We'll rely on backend counts if provided or ignore on list
    }));
  },

  getCategory: (id: number) => window.stockliteApi.transactionCategories.get(id),

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
  
  async loadCashboxes() {
    const rows = await window.stockliteApi.cashboxes.list();
    return rows as CashboxLite[];
  }
};
