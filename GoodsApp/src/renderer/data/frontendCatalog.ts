export type LookupEntity = { id: number; name: string; isActive: boolean };
export type ProductLookup = LookupEntity & { code: string; unit: string };
export type StockBatchLookup = {
  id: number;
  productId: number;
  batchCode: string;
  supplierId: number;
  availableQuantity: number;
  costPrice: number;
  suggestedPrice: number;
  receivedDate: string;
  expiryDate?: string;
  isActive: boolean;
};

const suppliers: LookupEntity[] = [
  { id: 1, name: "شركة النور للتجارة", isActive: true },
  { id: 2, name: "مؤسسة الخير", isActive: true },
  { id: 3, name: "مستودع الشام", isActive: true },
];
const customers: LookupEntity[] = [
  { id: 1, name: "أحمد الخطيب", isActive: true },
  { id: 2, name: "مؤسسة النور", isActive: true },
  { id: 3, name: "سارة محمود", isActive: true },
];
const products: ProductLookup[] = [
  { id: 1, name: "زيت نباتي 1 لتر", code: "PRD-001", unit: "عبوة", isActive: true },
  { id: 2, name: "سكر 1 كغ", code: "PRD-002", unit: "كغ", isActive: true },
  { id: 3, name: "أرز 1 كغ", code: "PRD-003", unit: "كغ", isActive: true },
];
const cashboxes: LookupEntity[] = [
  { id: 1, name: "الصندوق الرئيسي", isActive: true },
  { id: 2, name: "صندوق الفرع", isActive: true },
];
const saleTypes = [
  { id: 1, name: "بيع مباشر", commissionPercentage: 0, isActive: true },
  { id: 2, name: "عمولة 5%", commissionPercentage: 5, isActive: true },
  { id: 3, name: "عمولة 10%", commissionPercentage: 10, isActive: true },
];
const stockBatches: StockBatchLookup[] = [
  { id: 1, productId: 1, batchCode: "B-2407-01", supplierId: 1, availableQuantity: 36, costPrice: 9000, suggestedPrice: 12000, receivedDate: "2026-07-25", expiryDate: "2027-07-25", isActive: true },
  { id: 2, productId: 2, batchCode: "B-2407-11", supplierId: 1, availableQuantity: 44, costPrice: 4800, suggestedPrice: 6000, receivedDate: "2026-07-25", expiryDate: "2027-03-10", isActive: true },
  { id: 3, productId: 3, batchCode: "B-2407-19", supplierId: 2, availableQuantity: 18, costPrice: 5000, suggestedPrice: 6200, receivedDate: "2026-07-28", expiryDate: "2027-01-15", isActive: true },
];

export const frontendCatalog = {
  suppliers: () => suppliers.filter((item) => item.isActive),
  customers: () => customers.filter((item) => item.isActive),
  products: () => products.filter((item) => item.isActive),
  cashboxes: () => cashboxes.filter((item) => item.isActive),
  saleTypes: () => saleTypes.filter((item) => item.isActive),
  stockBatches: () => stockBatches.filter((item) => item.isActive && item.availableQuantity > 0),
  batchesForProduct: (productId: number) => stockBatches.filter((item) => item.productId === productId && item.isActive && item.availableQuantity > 0),
  product: (id: number) => products.find((item) => item.id === id),
  supplier: (id: number) => suppliers.find((item) => item.id === id),
  batch: (id: number) => stockBatches.find((item) => item.id === id),
  batchDisplayName: (id: number) => {
    const batch = stockBatches.find((item) => item.id === id);
    if (!batch) return "دفعة غير معروفة";
    const product = products.find((item) => item.id === batch.productId);
    return `${product?.name ?? "مادة غير معروفة"} — ${batch.batchCode} — المتاح ${batch.availableQuantity} ${product?.unit ?? ""}`;
  },
};
