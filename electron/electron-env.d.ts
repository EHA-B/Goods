/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}

type ProductApiRecord = {
  id: number;
  name: string;
  code: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  isActive: number | boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductApiInput = {
  name: string;
  code: string | null;
  unit: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type SupplierApiRecord = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | string | null;
  notes: string | null;
  isActive: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

type SupplierApiInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number;
  notes?: string | null;
  isActive?: boolean;
};

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  stockliteApi: {
    products: {
      list(): Promise<ProductApiRecord[]>;
      get(id: number): Promise<ProductApiRecord>;
      create(input: ProductApiInput): Promise<ProductApiRecord>;
      update(
        id: number,
        input: Partial<ProductApiInput>,
      ): Promise<ProductApiRecord>;
      remove(id: number): Promise<{ success: boolean }>;
    };
    suppliers: {
      list(): Promise<SupplierApiRecord[]>;
      get(id: number): Promise<SupplierApiRecord>;
      create(input: SupplierApiInput): Promise<SupplierApiRecord>;
      update(
        id: number,
        input: Partial<SupplierApiInput>,
      ): Promise<SupplierApiRecord>;
      remove(id: number): Promise<{ success: boolean }>;
    };
  };
}
