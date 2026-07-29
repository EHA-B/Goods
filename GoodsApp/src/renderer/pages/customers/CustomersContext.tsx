import { createContext, useContext, useMemo, useState } from "react";
import type { Customer, CustomerMovement } from "../../components/customers/types";

const initialCustomers: Customer[] = [
  { id: 1, name: "أحمد الخطيب", phone: "0999 111 222", address: "دمشق - المزة", balance: 125000, notes: "يفضل التواصل عبر الهاتف.", isActive: true, createdAt: "2026-07-01T10:00:00.000Z", updatedAt: "2026-07-25T12:00:00.000Z" },
  { id: 2, name: "مؤسسة النور", phone: "011 555 4100", address: "ريف دمشق - جرمانا", balance: 0, notes: "", isActive: true, createdAt: "2026-07-03T08:30:00.000Z", updatedAt: "2026-07-03T08:30:00.000Z" },
  { id: 3, name: "سارة محمود", phone: "0988 444 221", address: "دمشق - الشعلان", balance: -45000, notes: "لها دفعة مقدمة.", isActive: true, createdAt: "2026-07-08T14:00:00.000Z", updatedAt: "2026-07-21T09:15:00.000Z" },
];

const initialMovements: CustomerMovement[] = [
  { id: 1, customerId: 1, type: "sale", reference: "SAL-00125", date: "2026-07-27", total: 180000, paid: 100000, remaining: 80000 },
  { id: 2, customerId: 1, type: "purchase", reference: "PUR-00018", date: "2026-07-20", total: 55000, paid: 10000, remaining: 45000, notes: "شراء بضاعة من العميل" },
  { id: 3, customerId: 1, type: "sale", reference: "SAL-00102", date: "2026-07-10", total: 95000, paid: 95000, remaining: 0 },
  { id: 4, customerId: 2, type: "sale", reference: "SAL-00131", date: "2026-07-28", total: 62000, paid: 62000, remaining: 0 },
];

type CustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;

type CustomersContextValue = {
  customers: Customer[];
  movements: CustomerMovement[];
  getCustomer: (id: number) => Customer | undefined;
  saveCustomer: (input: CustomerInput, id?: number) => Customer;
  deleteCustomer: (id: number) => void;
};

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [movements] = useState(initialMovements);

  const value = useMemo<CustomersContextValue>(() => ({
    customers,
    movements,
    getCustomer: (id) => customers.find((customer) => customer.id === id),
    saveCustomer: (input, id) => {
      const now = new Date().toISOString();
      let saved: Customer;
      if (id) {
        const current = customers.find((customer) => customer.id === id);
        saved = { ...input, id, createdAt: current?.createdAt ?? now, updatedAt: now };
        setCustomers((items) => items.map((item) => item.id === id ? saved : item));
      } else {
        saved = { ...input, id: Date.now(), createdAt: now, updatedAt: now };
        setCustomers((items) => [saved, ...items]);
      }
      return saved;
    },
    deleteCustomer: (id) => setCustomers((items) => items.filter((item) => item.id !== id)),
  }), [customers, movements]);

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers() {
  const context = useContext(CustomersContext);
  if (!context) throw new Error("useCustomers must be used inside CustomersProvider");
  return context;
}
