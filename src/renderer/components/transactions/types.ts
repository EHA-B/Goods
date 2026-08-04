export type TransactionDirection = "income" | "expense";
export type FinancialTransactionStatus = "active" | "cancelled";

export type FinancialTransaction = {
  referenceNumber: any;
  id: number;
  type: TransactionDirection; // using 'type' instead of 'direction' as per plan
  category_id: number;
  category_name: string;
  cashbox_id: number;
  cashbox_name: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  reference_number: string | null;
  notes: string | null;
  status: FinancialTransactionStatus;
  cashbox_transaction_id: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionCategory = {
  id: number;
  name: string;
  type: TransactionDirection;
  isActive: boolean;
  description: string | null;
  transactionCount: number;
};
