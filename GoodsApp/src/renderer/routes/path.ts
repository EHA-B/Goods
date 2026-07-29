export const PATHS = {
    DASHBOARD: "/",
    PRODUCTS: "/products",

    CUSTOMERS: "/customers",
    CUSTOMER_NEW: "/customers/new",
    CUSTOMER_DETAILS: "/customers/:customerId",
    CUSTOMER_EDIT: "/customers/:customerId/edit",

    INVENTORY: "/inventory",
    INVENTORY_DETAILS: "/inventory/:productId",
    INVENTORY_ADJUST: "/inventory/:productId/adjust",
    INVENTORY_BATCH_NEW: "/inventory/:productId/batches/new",

    SUPPLIERS: "/suppliers",
    PURCHASES: "/purchases",
    SALES: "/sales",
    CASHBOXES: "/cashboxes",
    TRANSACTIONS: "/transactions",
    USERS: "/users",
    REPORTS: "/reports",
    SETTINGS: "/settings",
} as const;