import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import InventoryPage from "../pages/inventory/InventoryPage";
import ProductInventoryDetailsPage from "../pages/inventory/ProductInventoryDetailsPage";
import StockAdjustmentPage from "../pages/inventory/StockAdjustmentPage";
import StockBatchFormPage from "../pages/inventory/StockBatchFormPage";
import StockMovementDetailsPage from "../pages/inventory/StockMovementDetailsPage";
import { InventoryProvider } from "../pages/inventory/InventoryContext";
import ProductsPage from "../pages/products/ProductsPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import { ProductsProvider } from "../pages/products/ProductsContext";
import CustomersPage from "../pages/customers/CustomersPage";
import CustomerFormPage from "../pages/customers/CustomerFormPage";
import CustomerDetailsPage from "../pages/customers/CustomerDetailsPage";
import { CustomersProvider } from "../pages/customers/CustomersContext";
import { PATHS } from "./path";

function AppRouter() {
  return (
    <HashRouter>
      <ProductsProvider>
        <InventoryProvider>
          <CustomersProvider>
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path={PATHS.PRODUCTS} element={<ProductsPage />} />
                <Route path={PATHS.PRODUCT_NEW} element={<ProductFormPage />} />
                <Route path={PATHS.PRODUCT_EDIT} element={<ProductFormPage />} />
                <Route path={PATHS.INVENTORY} element={<InventoryPage />} />
                <Route path={PATHS.INVENTORY_DETAILS} element={<ProductInventoryDetailsPage />} />
                <Route path={PATHS.INVENTORY_ADJUST} element={<StockAdjustmentPage />} />
                <Route path={PATHS.INVENTORY_BATCH_NEW} element={<StockBatchFormPage />} />
                <Route path={PATHS.INVENTORY_MOVEMENT_DETAILS} element={<StockMovementDetailsPage />} />
                <Route path={PATHS.CUSTOMERS} element={<CustomersPage />} />
                <Route path={PATHS.CUSTOMER_NEW} element={<CustomerFormPage />} />
                <Route path={PATHS.CUSTOMER_DETAILS} element={<CustomerDetailsPage />} />
                <Route path={PATHS.CUSTOMER_EDIT} element={<CustomerFormPage />} />
                <Route path="*" element={<Navigate to={PATHS.DASHBOARD} replace />} />
              </Route>
            </Routes>
          </CustomersProvider>
        </InventoryProvider>
      </ProductsProvider>
    </HashRouter>
  );
}

export default AppRouter;
