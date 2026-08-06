import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoginPage from "../pages/auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import DashboardPage from "../pages/dashboard/DashboardPage";
import InventoryPage from "../pages/inventory/InventoryPage";
import ProductInventoryDetailsPage from "../pages/inventory/ProductInventoryDetailsPage";
import StockAdjustmentPage from "../pages/inventory/StockAdjustmentPage";
import StockBatchFormPage from "../pages/inventory/StockBatchFormPage";
import StockMovementDetailsPage from "../pages/inventory/StockMovementDetailsPage";
import ProductsPage from "../pages/products/ProductsPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import CustomersPage from "../pages/customers/CustomersPage";
import CustomerFormPage from "../pages/customers/CustomerFormPage";
import CustomerDetailsPage from "../pages/customers/CustomerDetailsPage";
import SuppliersPage from "../pages/suppliers/SuppliersPage";
import SupplierFormPage from "../pages/suppliers/SupplierFormPage";
import SupplierDetailsPage from "../pages/suppliers/SupplierDetailsPage";
import SalesPage from "../pages/sales/SalesPage";
import SaleFormPage from "../pages/sales/SaleFormPage";
import SaleDetailsPage from "../pages/sales/SaleDetailsPage";
import SalePaymentPage from "../pages/sales/SalePaymentPage";
import PurchasesPage from "../pages/purchases/PurchasesPage";
import PurchaseFormPage from "../pages/purchases/PurchaseFormPage";
import PurchaseDetailsPage from "../pages/purchases/PurchaseDetailsPage";
import PurchasePaymentPage from "../pages/purchases/PurchasePaymentPage";
import ConsignmentOverviewPage from "../pages/purchases/consignment/ConsignmentOverviewPage";
import CloseConsignmentPage from "../pages/purchases/consignment/CloseConsignmentPage";
import ConsignmentSettlementDetailsPage from "../pages/purchases/consignment/ConsignmentSettlementDetailsPage";
import CashboxesPage from "../pages/cashboxes/CashboxesPage";
import CashboxFormPage from "../pages/cashboxes/CashboxFormPage";
import CashboxDetailsPage from "../pages/cashboxes/CashboxDetailsPage";
import CashboxTransactionFormPage from "../pages/cashboxes/CashboxTransactionFormPage";
import CashboxTransferPage from "../pages/cashboxes/CashboxTransferPage";
import CashboxMovementsPage from "../pages/cashboxes/CashboxMovementsPage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import TransactionFormPage from "../pages/transactions/TransactionFormPage";
import TransactionDetailsPage from "../pages/transactions/TransactionDetailsPage";
import TransactionCategoriesPage from "../pages/cashboxes/TransactionCategoriesPage";
import TransactionCategoryFormPage from "../pages/cashboxes/TransactionCategoryFormPage";
import SettingsPage from "../pages/settings/SettingsPage";
import CompanySettingsPage from "../pages/settings/CompanySettingsPage";
import BackupSettingsPage from "../pages/settings/BackupSettingsPage";
import AboutSettingsPage from "../pages/settings/AboutSettingsPage";
import AppearanceSettingsPage from "../pages/settings/AppearanceSettingsPage";
import SecuritySettingsPage from "../pages/settings/SecuritySettingsPage";
import InvoicePrintPage from "../pages/invoices/InvoicePrintPage";
import DocumentPrintPage from "../pages/invoices/DocumentPrintPage";
import ActivityLogsPage from "../pages/activity-logs/ActivityLogsPage";
import ActivityLogDetailsPage from "../pages/activity-logs/ActivityLogDetailsPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import NotificationSettingsPage from "../pages/settings/NotificationSettingsPage";
import HelpCenterPage from "../pages/help/HelpCenterPage";
import HelpArticlePage from "../pages/help/HelpArticlePage";
import HelpFaqPage from "../pages/help/HelpFaqPage";
import { PATHS } from "./path";

function AppRouter() {
  return (
    <HashRouter>
      <Routes>
                <Route path={PATHS.LOGIN} element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
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
                    <Route path={PATHS.SUPPLIERS} element={<SuppliersPage />} />
                    <Route path={PATHS.SUPPLIER_NEW} element={<SupplierFormPage />} />
                    <Route path={PATHS.SUPPLIER_DETAILS} element={<SupplierDetailsPage />} />
                    <Route path={PATHS.SUPPLIER_EDIT} element={<SupplierFormPage />} />
                    <Route path={PATHS.SALES} element={<SalesPage />} />
                    <Route path={PATHS.SALE_NEW} element={<SaleFormPage />} />
                    <Route path={PATHS.SALE_DETAILS} element={<SaleDetailsPage />} />
                    <Route path={PATHS.SALE_PAYMENT_NEW} element={<SalePaymentPage />} />
                    <Route path={PATHS.SALE_PRINT} element={<InvoicePrintPage type="sale" />} />
                    <Route path={PATHS.PURCHASES} element={<PurchasesPage />} />
                    <Route path={PATHS.PURCHASE_NEW} element={<PurchaseFormPage />} />
                    <Route path={PATHS.PURCHASE_DETAILS} element={<PurchaseDetailsPage />} />
                    <Route path={PATHS.PURCHASE_PAYMENT_NEW} element={<PurchasePaymentPage />} />
                    <Route path={PATHS.PURCHASE_PRINT} element={<InvoicePrintPage type="purchase" />} />
                    <Route path={PATHS.PRINT_PAYMENT} element={<DocumentPrintPage kind="payment" />} />
                    <Route path={PATHS.PRINT_TRANSACTION} element={<DocumentPrintPage kind="transaction" />} />
                    <Route path={PATHS.PRINT_TRANSFER} element={<DocumentPrintPage kind="transfer" />} />
                    <Route path={PATHS.PRINT_CUSTOMER_STATEMENT} element={<DocumentPrintPage kind="customer" />} />
                    <Route path={PATHS.PRINT_SUPPLIER_STATEMENT} element={<DocumentPrintPage kind="supplier" />} />
                    <Route path={PATHS.PRINT_CASHBOX_STATEMENT} element={<DocumentPrintPage kind="cashbox" />} />
                    <Route path={PATHS.PRINT_CONSIGNMENT} element={<DocumentPrintPage kind="consignment" />} />
                    <Route path={PATHS.PURCHASE_CONSIGNMENT} element={<ConsignmentOverviewPage />} />
                    <Route path={PATHS.PURCHASE_CLOSE_CONSIGNMENT} element={<CloseConsignmentPage />} />
                    <Route path={PATHS.PURCHASE_CONSIGNMENT_SETTLEMENT} element={<ConsignmentSettlementDetailsPage />} />
                    <Route path={PATHS.CASHBOXES} element={<CashboxesPage />} />
                    <Route path={PATHS.CASHBOX_NEW} element={<CashboxFormPage />} />
                    <Route path={PATHS.CASHBOX_DETAILS} element={<CashboxDetailsPage />} />
                    <Route path={PATHS.CASHBOX_EDIT} element={<CashboxFormPage />} />
                    <Route path={PATHS.CASHBOX_TRANSACTION_NEW} element={<CashboxTransactionFormPage />} />
                    <Route path={PATHS.CASHBOX_MOVEMENTS} element={<CashboxMovementsPage />} />
                    <Route path={PATHS.CASHBOX_TRANSFER_NEW} element={<CashboxTransferPage />} />
                    <Route path={PATHS.TRANSACTIONS} element={<TransactionsPage />} />
                    <Route path={PATHS.TRANSACTION_NEW} element={<TransactionFormPage />} />
                    <Route path={PATHS.TRANSACTION_DETAILS} element={<TransactionDetailsPage />} />
                    <Route path={PATHS.TRANSACTION_EDIT} element={<TransactionFormPage />} />
                    <Route path={PATHS.TRANSACTION_CATEGORIES} element={<TransactionCategoriesPage />} />
                    <Route path={PATHS.TRANSACTION_CATEGORY_NEW} element={<TransactionCategoryFormPage />} />
                    <Route path={PATHS.TRANSACTION_CATEGORY_EDIT} element={<TransactionCategoryFormPage />} />
                    <Route path={PATHS.ACTIVITY_LOGS} element={<ActivityLogsPage />} />
                    <Route path={PATHS.ACTIVITY_LOG_DETAILS} element={<ActivityLogDetailsPage />} />
                    <Route path={PATHS.NOTIFICATIONS} element={<NotificationsPage />} />
                    <Route path={PATHS.HELP} element={<HelpCenterPage />} />
                    <Route path={PATHS.HELP_FAQ} element={<HelpFaqPage />} />
                    <Route path={PATHS.HELP_ARTICLE} element={<HelpArticlePage />} />
                    <Route path={PATHS.SETTINGS} element={<SettingsPage />} />
                    <Route path={PATHS.SETTINGS_COMPANY} element={<CompanySettingsPage />} />
                    <Route path={PATHS.SETTINGS_BACKUP} element={<BackupSettingsPage />} />
                    <Route path={PATHS.SETTINGS_ABOUT} element={<AboutSettingsPage />} />
                    <Route path={PATHS.SETTINGS_APPEARANCE} element={<AppearanceSettingsPage />} />
                    <Route path={PATHS.SETTINGS_SECURITY} element={<SecuritySettingsPage />} />
                    <Route path={PATHS.SETTINGS_NOTIFICATIONS} element={<NotificationSettingsPage />} />
                    <Route path="*" element={<Navigate to={PATHS.DASHBOARD} replace />} />
                  </Route>
                </Route>
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
