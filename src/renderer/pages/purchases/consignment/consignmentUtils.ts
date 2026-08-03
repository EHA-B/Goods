import type { RemainingStockPolicy, SettlementStatus } from "./consignmentTypes";

export const money = (value: number, currency = "SYP") => `${Number(value || 0).toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;
export const policyLabels: Record<RemainingStockPolicy, string> = {
  return_to_supplier: "إعادة المتبقي للمورد",
  spoilage: "اعتبار المتبقي تالفًا",
  carry_forward: "ترحيل المتبقي لفترة لاحقة",
};
export const statusLabels: Record<SettlementStatus | "completed", string> = {
  pending: "بانتظار التسوية",
  partially_settled: "مسواة جزئيًا",
  settled: "تمت التسوية",
  reversed: "تم عكس التسوية",
  completed: "مكتملة",
};
