import type { ActivityLogSeverity } from "./activityLogsTypes";
export const actionLabels: Record<string,string> = { "cashbox.transfer":"تحويل بين صندوقين", "product.update":"تعديل منتج", "stock.adjust":"تسوية مخزون", "supplier.create":"إضافة مورد", "transaction.delete":"حذف معاملة", "customer.update":"تعديل عميل", "settings.update":"تعديل إعدادات" };
export function formatActivityDate(value:string){ return new Intl.DateTimeFormat("ar-SY",{dateStyle:"medium",timeStyle:"short",hour12:true}).format(new Date(value)); }
export function severityLabel(value:ActivityLogSeverity){ return value === "critical" ? "حساس" : value === "warning" ? "تحذير" : "معلومات"; }
export function stringifyValue(value:unknown){ if(value===null||value===undefined) return "—"; if(typeof value === "boolean") return value ? "نعم" : "لا"; if(typeof value === "object") return JSON.stringify(value); return String(value); }
