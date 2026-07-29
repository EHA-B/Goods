import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "../../components/products/ProductsTable";

const initialProducts: Product[] = [
  { id: 1, name: "مياه معدنية", code: "PRD-001", category: "مشروبات", quantity: 48, unit: "قطعة", salePrice: 2500, status: "available" },
  { id: 2, name: "عصير برتقال", code: "PRD-002", category: "مشروبات", quantity: 8, unit: "علبة", salePrice: 4500, status: "low" },
  { id: 3, name: "سكر أبيض", code: "PRD-003", category: "مواد غذائية", quantity: 0, unit: "كيس", salePrice: 12000, status: "out" },
  { id: 4, name: "مناديل ورقية", code: "PRD-004", category: "مستلزمات منزلية", quantity: 22, unit: "علبة", salePrice: 7000, status: "available" },
  { id: 5, name: "زيت نباتي", code: "PRD-005", category: "مواد غذائية", quantity: 14, unit: "عبوة", salePrice: 28000, status: "available" },
];

type ProductInput = Omit<Product, "id">;
type ProductsContextValue = {
  products: Product[];
  getProduct: (id: number) => Product | undefined;
  saveProduct: (input: ProductInput, id?: number) => Product;
  deleteProduct: (id: number) => void;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState(initialProducts);
  const value = useMemo<ProductsContextValue>(() => ({
    products,
    getProduct: (id) => products.find((product) => product.id === id),
    saveProduct: (input, id) => {
      const saved = { ...input, id: id ?? Date.now() };
      setProducts((items) => id ? items.map((item) => item.id === id ? saved : item) : [saved, ...items]);
      return saved;
    },
    deleteProduct: (id) => setProducts((items) => items.filter((item) => item.id !== id)),
  }), [products]);
  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error("useProducts must be used inside ProductsProvider");
  return context;
}
