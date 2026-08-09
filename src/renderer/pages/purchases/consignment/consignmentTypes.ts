export type RemainingStockPolicy = "return_to_supplier" | "spoilage";
export type SettlementStatus = "pending" | "partially_settled" | "settled" | "reversed";

export type ConsignmentInvoiceItemSummary = {
  purchase_invoice_item_id: number | null;
  product_id: number;
  product_name: string;
  stock_batch_id: number;
  batch_code: string | null;
  received_quantity: number;
  sold_quantity: number;
  remaining_quantity: number;
  total_sales_amount: number;
  expiry_date: string | null;
};

export type ConsignmentSettlement = {
  id: number;
  purchase_invoice_id: number;
  settlement_number: string;
  settlement_date: string;
  total_sales_amount: number;
  commission_percentage: number;
  commission_amount: number;
  supplier_share: number;
  cashbox_id: number;
  cashbox_name: string;
  currency: string;
  remaining_stock_policy: RemainingStockPolicy;
  spoilage_quantity: number;
  returned_quantity: number;
  carried_quantity: number;
  status: "completed" | "reversed";
  reversal_reason?: string | null;
  notes: string | null;
  created_at: string;
  items?: unknown[];
};

export type ConsignmentInvoiceSummary = {
  invoice: {
    id: number;
    invoice_number: string;
    invoice_date: string;
    supplier_id: number;
    supplier_name: string;
    invoice_type: "consignment";
    status: string;
    settlement_status: SettlementStatus;
    currency: string;
  };
  sales: { total_sales_amount: number; sold_quantity: number; sales_count: number };
  stock: { received_quantity: number; sold_quantity: number; remaining_quantity: number; damaged_quantity: number; returned_quantity: number };
  items: ConsignmentInvoiceItemSummary[];
  existing_settlement: ConsignmentSettlement | null;
};

export type CloseConsignmentInput = {
  commission_percentage: number;
  cashbox_id: number;
  settlement_date: string;
  remaining_stock_policy: RemainingStockPolicy;
  exchange_rate?: number;
  notes?: string | null;
  calculation_hash?: string;
};

export type ConsignmentClosingPreview = {
  total_sales_amount: number;
  commission_percentage: number;
  commission_amount: number;
  supplier_share: number;
  remaining_quantity: number;
  currency: string;
  cashbox_balance: number;
  balance_after_settlement: number;
  can_submit: boolean;
  warnings: string[];
  calculation_hash: string;
};

export type ConsignmentCashbox = { id: number; name: string; currency: string; balance: number; isActive: boolean };
