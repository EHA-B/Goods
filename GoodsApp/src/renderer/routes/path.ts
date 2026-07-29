export const PATHS = {
    DASHBOARD: "/",
    PRODUCTS: "/products",
    PRODUCT_NEW: "/products/new",
    PRODUCT_EDIT: "/products/:productId/edit",

    CUSTOMERS: "/customers",
    CUSTOMER_NEW: "/customers/new",
    CUSTOMER_DETAILS: "/customers/:customerId",
    CUSTOMER_EDIT: "/customers/:customerId/edit",

    INVENTORY: "/inventory",
    INVENTORY_DETAILS: "/inventory/:productId",
    INVENTORY_ADJUST: "/inventory/:productId/adjust",
    INVENTORY_BATCH_NEW: "/inventory/:productId/batches/new",
    INVENTORY_MOVEMENT_DETAILS: "/inventory/:productId/movements/:movementId",

    SUPPLIERS: "/suppliers",
    SUPPLIER_NEW: "/suppliers/new",
    SUPPLIER_DETAILS: "/suppliers/:supplierId",
    SUPPLIER_EDIT: "/suppliers/:supplierId/edit",
    PURCHASES: "/purchases",
    SALES: "/sales",
    CASHBOXES: "/cashboxes",
    TRANSACTIONS: "/transactions",
    USERS: "/users",
    REPORTS: "/reports",
    SETTINGS: "/settings",
} as const;