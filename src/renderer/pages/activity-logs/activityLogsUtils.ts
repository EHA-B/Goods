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
export function stringifyValue(value:unknown){ if(value===null||value===undefined) return "—"; if(typeof value === "boolean") return value ? "نعم" : "لا"; if(typeof value === "object") return JSON.stringify(value,null,2); return String(value); }
