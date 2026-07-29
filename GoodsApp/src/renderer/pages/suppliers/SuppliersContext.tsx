import { createContext, useContext, useMemo, useState } from "react";
import type { Supplier, SupplierBatch, SupplierMovement } from "../../components/suppliers/types";

const initialSuppliers: Supplier[] = [
  { id: 1, name: "شركة الشام للتجارة", phone: "011 555 4200", email: "sales@alsham.example", address: "دمشق - البرامكة", balance: 485000, notes: "التوريد يومي الأحد والأربعاء.", isActive: true, createdAt: "2026-06-10T09:00:00.000Z", updatedAt: "2026-07-26T11:30:00.000Z" },
  { id: 2, name: "مؤسسة الهدى للمواد الغذائية", phone: "0944 210 870", email: "", address: "ريف دمشق - صحنايا", balance: 0, notes: "", isActive: true, createdAt: "2026-06-18T10:15:00.000Z", updatedAt: "2026-07-20T08:00:00.000Z" },
  { id: 3, name: "مستودع النخبة", phone: "0933 887 410", email: "info@elite.example", address: "دمشق - القابون", balance: -120000, notes: "يوجد مبلغ مقدم للحساب القادم.", isActive: true, createdAt: "2026-07-02T12:00:00.000Z", updatedAt: "2026-07-24T15:20:00.000Z" },
  { id: 4, name: "شركة الشرق", phone: "011 442 1880", email: "", address: "حلب - الجميلية", balance: 75000, notes: "موقوف مؤقتًا.", isActive: false, createdAt: "2026-05-15T08:00:00.000Z", updatedAt: "2026-07-12T13:00:00.000Z" },
];

const initialMovements: SupplierMovement[] = [
  { id: 1, supplierId: 1, type: "purchase", reference: "PUR-00142", date: "2026-07-27", description: "فاتورة شراء مواد تنظيف", total: 620000, paid: 300000, remaining: 320000, status: "confirmed" },
  { id: 2, supplierId: 1, type: "payment", reference: "PAY-00081", date: "2026-07-25", description: "دفعة نقدية للمورد", total: 135000, paid: 135000, remaining: 0, status: "paid" },
  { id: 3, supplierId: 1, type: "consignment", reference: "CON-00019", date: "2026-07-18", description: "بضاعة أمانة - مشروبات", total: 165000, paid: 0, remaining: 165000, status: "confirmed" },
  { id: 4, supplierId: 2, type: "purchase", reference: "PUR-00138", date: "2026-07-22", description: "فاتورة شراء مواد غذائية", total: 280000, paid: 280000, remaining: 0, status: "paid" },
  { id: 5, supplierId: 3, type: "stock_batch", reference: "BAT-00412", date: "2026-07-24", description: "استلام دفعة مخزون", total: 450000, paid: 0, remaining: 0, status: "received" },
];

const initialBatches: SupplierBatch[] = [
  { id: 1, supplierId: 1, productName: "سائل تنظيف 1 لتر", batchCode: "BAT-00418", originalQuantity: 120, remainingQuantity: 84, purchasePrice: 4500, receivedAt: "2026-07-27", expiryDate: "2028-01-10" },
  { id: 2, supplierId: 1, productName: "مناديل ورقية", batchCode: "BAT-00419", originalQuantity: 200, remainingQuantity: 176, purchasePrice: 2100, receivedAt: "2026-07-27" },
  { id: 3, supplierId: 3, productName: "قهوة مطحونة 500غ", batchCode: "BAT-00412", originalQuantity: 90, remainingQuantity: 61, purchasePrice: 5000, receivedAt: "2026-07-24", expiryDate: "2027-04-30" },
];

type SupplierInput = Omit<Supplier, "id" | "createdAt" | "updatedAt">;
type ContextValue = {
  suppliers: Supplier[];
  movements: SupplierMovement[];
  batches: SupplierBatch[];
  getSupplier: (id: number) => Supplier | undefined;
  saveSupplier: (input: SupplierInput, id?: number) => Supplier;
  deleteSupplier: (id: number) => void;
};

const SuppliersContext = createContext<ContextValue | null>(null);

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [movements] = useState(initialMovements);
  const [batches] = useState(initialBatches);
  const value = useMemo<ContextValue>(() => ({
    suppliers, movements, batches,
    getSupplier: (id) => suppliers.find((supplier) => supplier.id === id),
    saveSupplier: (input, id) => {
      const now = new Date().toISOString();
      let saved: Supplier;
      if (id) {
        const current = suppliers.find((supplier) => supplier.id === id);
        saved = { ...input, id, createdAt: current?.createdAt ?? now, updatedAt: now };
        setSuppliers((items) => items.map((item) => item.id === id ? saved : item));
      } else {
        saved = { ...input, id: Date.now(), createdAt: now, updatedAt: now };
        setSuppliers((items) => [saved, ...items]);
      }
      return saved;
    },
    deleteSupplier: (id) => setSuppliers((items) => items.filter((item) => item.id !== id)),
  }), [suppliers, movements, batches]);
  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
}

export function useSuppliers() {
  const context = useContext(SuppliersContext);
  if (!context) throw new Error("useSuppliers must be used inside SuppliersProvider");
  return context;
}
