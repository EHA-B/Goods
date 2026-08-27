import type { ActivityLogSeverity } from "./activityLogsTypes";
export const actionLabels: Record<string,string> = {
  auth_login:"تسجيل الدخول", auth_logout:"تسجيل الخروج", password_changed:"تغيير كلمة المرور",
  sale_created:"إنشاء فاتورة بيع", sale_edited:"تعديل فاتورة بيع", sale_cancelled:"إلغاء فاتورة بيع", sale_payment_recorded:"تسجيل دفعة بيع", sale_payment_reversed:"عكس دفعة بيع",
  purchase_created:"إنشاء فاتورة شراء", purchase_edited:"تعديل فاتورة شراء", purchase_cancelled:"إلغاء فاتورة شراء", purchase_payment_recorded:"تسجيل دفعة شراء", purchase_payment_reversed:"عكس دفعة شراء",
  purchase_commission_closed:"إغلاق تسوية أمانة", purchase_commission_reversed:"عكس تسوية أمانة",
  backup_created:"إنشاء نسخة احتياطية", backup_restored:"استعادة نسخة احتياطية",
};
export const moduleLabels: Record<string,string> = {
  sale_invoices:"المبيعات", purchase_invoices:"المشتريات", payments:"الدفعات", products:"المنتجات", customers:"العملاء", suppliers:"الموردون",
  cashboxes:"الصناديق", cashbox_transactions:"حركات الصناديق", transactions:"المعاملات المالية", transaction_categories:"تصنيفات المعاملات",
  stock_batches:"دفعات المخزون", stock_adjustments:"تسويات المخزون", settings:"الإعدادات", users:"المصادقة", backups:"النسخ الاحتياطي",
  consignment_settlements:"الأمانة",
};
export function formatActivityDate(value:string){ return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",hour12:true}).format(new Date(value)); }
export function severityLabel(value:ActivityLogSeverity){ return value === "critical" ? "حساس" : value === "warning" ? "تحذير" : "معلومات"; }
export const activityFieldLabels: Record<string, string> = {
  id: "المعرّف", invoice: "بيانات الفاتورة", items: "الأصناف", batches: "دفعات المخزون",
  invoice_number: "رقم الفاتورة", invoice_date: "تاريخ الفاتورة", invoice_type: "نوع الفاتورة",
  customer_id: "العميل", supplier_id: "المورد", product_id: "المنتج", stock_batch_id: "دفعة المخزون",
  sale_type_id: "نوع البيع", cashbox_id: "الصندوق", category_id: "الفئة", worker_id: "العامل / الجهة",
  subtotal: "المجموع الفرعي", discount: "الخصم", discount_amount: "قيمة الخصم", tax: "الضريبة",
  transport_cost: "تكلفة النقل", emptying_cost: "تكلفة العتالة", total: "الإجمالي",
  paid_amount: "المبلغ المدفوع", remaining_amount: "المبلغ المتبقي", amount: "المبلغ",
  balance: "الرصيد", balance_before: "الرصيد قبل", balance_after: "الرصيد بعد",
  quantity: "الكمية", remaining_quantity: "الكمية المتبقية", quantity_before: "الكمية قبل", quantity_after: "الكمية بعد",
  unit_price: "سعر الوحدة", purchase_price: "سعر الشراء", sale_price: "سعر البيع", cost_price: "التكلفة",
  line_total: "إجمالي السطر", profit: "الربح", batch_code: "كود الدفعة",
  currency: "العملة", exchange_rate: "سعر الصرف", status: "الحالة", settlement_status: "حالة التسوية",
  direction: "الاتجاه", type: "النوع", payment_type: "نوع الدفعة", party_type: "نوع الحساب", party_id: "الحساب",
  payment_date: "تاريخ الدفعة", transaction_date: "تاريخ العملية", reference_number: "رقم المرجع",
  notes: "ملاحظات", description: "البيان", reason: "السبب", cancellation_reason: "سبب الإلغاء",
  created_at: "تاريخ الإنشاء", updated_at: "آخر تحديث", received_date: "تاريخ الاستلام", expiry_date: "تاريخ الانتهاء",
  isActive: "نشط", is_edited: "معدّلة", edit_count: "عدد التعديلات", last_edited_at: "آخر تعديل", last_edited_by: "آخر مستخدم عدّل",
  added_items: "عدد الأصناف المضافة", added_total: "إجمالي الإضافة", settlement_id: "رقم التسوية",
};

export function activityFieldLabel(key: string) {
  return activityFieldLabels[key] ?? key.replace(/_/g, " ");
}

const valueLabels: Record<string, string> = {
  active: "فعال", cancelled: "ملغاة", confirmed: "مؤكدة", paid: "مدفوعة", partially_paid: "مدفوعة جزئيًا",
  draft: "مسودة", settled: "تمت التسوية", pending: "بانتظار التسوية", reversed: "معكوسة",
  standard: "عادية", consignment: "أمانة", income: "إيراد", expense: "مصروف", in: "دخول", out: "خروج",
  sale: "مبيعات", purchase: "مشتريات", customer: "عميل", supplier: "مورد", SYP: "ل.س", USD: "دولار",
};
export function stringifyValue(value:unknown){
  if(value===null||value===undefined||value==="") return "—";
  if(typeof value === "boolean") return value ? "نعم" : "لا";
  if(typeof value === "number") return Number(value).toLocaleString("en-US", { maximumFractionDigits: 3 });
  if(typeof value === "string") return valueLabels[value] ?? value;
  return String(value);
}
