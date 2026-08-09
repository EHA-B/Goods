export const SALE_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  confirmed: "مؤكدة",
  partially_paid: "مدفوعة جزئيًا",
  paid_partially: "مدفوعة جزئيًا",
  paid: "مدفوعة بالكامل",
  cancelled: "ملغاة",
};

export const PAYMENT_STATUS_AR: Record<string, string> = {
  active: "فعالة",
  reversed: "معكوسة",
  cancelled: "ملغاة",
  pending: "معلقة",
  completed: "مكتملة",
};

export const PURCHASE_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  confirmed: "مؤكدة",
  partially_paid: "مدفوعة جزئيًا",
  paid_partially: "مدفوعة جزئيًا",
  paid: "مدفوعة بالكامل",
  cancelled: "ملغاة",
};

export function getSaleStatusLabel(status?: string | null) {
  if (!status) return "—";

  return SALE_STATUS_AR[status] ?? status;
}

export function getPaymentStatusLabel(status?: string | null) {
  if (!status) return "—";

  return PAYMENT_STATUS_AR[status] ?? status;
}

export function getPurchaseStatusLabel(status?: string | null) {
  if (!status) return "—";

  return PURCHASE_STATUS_AR[status] ?? status;
}