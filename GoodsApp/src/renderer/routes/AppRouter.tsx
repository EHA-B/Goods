import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import DashboardPage from "../pages/dashboard/DashboardPage";
import ProductsPage from "../pages/products/ProductsPage";

// الصفحات غير الجاهزة حاليًا
// import InventoryPage from "../pages/inventory/InventoryPage";
// import CustomersPage from "../pages/customers/CustomersPage";
// import SuppliersPage from "../pages/suppliers/SuppliersPage";
// import SalesPage from "../pages/sales/SalesPage";
// import PurchasesPage from "../pages/purchases/PurchasesPage";
// import CashboxesPage from "../pages/cashboxes/CashboxesPage";
// import TransactionsPage from "../pages/transactions/TransactionsPage";
// import SettingsPage from "../pages/settings/SettingsPage";

import { PATHS } from "./path";

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* لوحة التحكم */}
          <Route index element={<DashboardPage />} />

          {/* المنتجات */}
          <Route path={PATHS.PRODUCTS} element={<ProductsPage />} />

          {/* المخزون */}
          {/* <Route path={PATHS.INVENTORY} element={<InventoryPage />} /> */}

          {/* العملاء */}
          {/* <Route path={PATHS.CUSTOMERS} element={<CustomersPage />} /> */}

          {/* الموردون */}
          {/* <Route path={PATHS.SUPPLIERS} element={<SuppliersPage />} /> */}

          {/* المبيعات */}
          {/* <Route path={PATHS.SALES} element={<SalesPage />} /> */}

          {/* المشتريات */}
          {/* <Route path={PATHS.PURCHASES} element={<PurchasesPage />} /> */}

          {/* الصناديق */}
          {/* <Route path={PATHS.CASHBOXES} element={<CashboxesPage />} /> */}

          {/* المعاملات المالية */}
          {/* 
          <Route
            path={PATHS.TRANSACTIONS}
            element={<TransactionsPage />}
          />
          */}

          {/* الإعدادات */}
          {/* <Route path={PATHS.SETTINGS} element={<SettingsPage />} /> */}

          {/* أي رابط غير معروف يرجع للوحة التحكم */}
          <Route
            path="*"
            element={<Navigate to={PATHS.DASHBOARD} replace />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;