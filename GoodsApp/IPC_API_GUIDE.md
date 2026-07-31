# StockLite IPC API

The renderer communicates with controllers through the safe API exposed by the preload script:

```ts
window.stockliteApi
```

Renderer pages should not import files from `src/controllers` and should not call `ipcRenderer` directly.

## Basic CRUD examples

```ts
const products = await window.stockliteApi.products.list();
const product = await window.stockliteApi.products.get(1);

const created = await window.stockliteApi.products.create({
  name: "منتج جديد",
  unit: "قطعة",
  category: "عام",
  isActive: 1,
});

await window.stockliteApi.products.update(1, {
  name: "اسم معدل",
});

await window.stockliteApi.products.remove(1);
```

A short renderer import is also available:

```ts
import { api } from "../../services/api";

const suppliers = await api.suppliers.list();
```

## Specialized operations

```ts
await api.products.listStock({ page: 1, limit: 20 });
await api.products.getWithStock(productId);
await api.products.createStock(payload);
await api.products.updateStock(productId, payload);

await api.purchaseInvoices.createFull(payload);
await api.purchaseInvoices.getSalesDetails(invoiceId);
await api.purchaseInvoices.closeCommission(invoiceId, payload);

await api.saleInvoices.getFull(invoiceId);
await api.saleInvoices.createProcess(payload);
```

## Error handling

Controller errors are converted to normal JavaScript errors. The controller error code is available in `error.code`.

```ts
try {
  await api.products.get(999999);
} catch (error) {
  const controllerError = error as Error & { code?: string };
  console.error(controllerError.code, controllerError.message);
}
```

## IPC security

Only controllers and methods declared in `src/controllers/ipc.ts` can be invoked. Unknown controllers and methods are rejected before loading controller code.
