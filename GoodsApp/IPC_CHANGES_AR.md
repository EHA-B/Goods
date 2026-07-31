# التغييرات الخاصة بـ IPC

## الملفات الجديدة

- `src/controllers/ipc.ts`
  - سجل مركزي للـ Controllers والـ methods المسموحة.
  - قناة IPC واحدة آمنة: `stocklite:controllers:invoke`.
  - توحيد الأخطاء وإرجاع `code` و`message` للواجهة.
  - منع استدعاء Controller أو method غير موجودة في القائمة المسموحة.

- `src/database/databaseManager.js`
  - جسر توافق مع ملفات Controllers الحالية التي تستخدم sqlite3 callbacks.
  - يفتح نفس قاعدة البيانات الموجودة في `app.getPath('userData')`.
  - يفعّل foreign keys وbusy timeout.

- `src/controllers/package.json` و`src/database/package.json`
  - تشغيل ملفات JavaScript القديمة بصيغة CommonJS داخل مشروع معرف كـ ESM.

- `src/renderer/types/stocklite-api.d.ts`
  - تعريف TypeScript كامل لـ `window.stockliteApi`.

- `src/renderer/services/api.ts`
  - اختصار للاستخدام داخل صفحات الواجهة: `import { api } from ...`.

- `IPC_API_GUIDE.md`
  - أمثلة CRUD والعمليات الخاصة ومعالجة الأخطاء.

## الملفات المعدلة

- `electron/main.ts`
  - تسجيل IPC بعد تهيئة قاعدة البيانات.
  - إغلاق Knex عند إغلاق التطبيق.
  - تصحيح مسار preload إلى `preload.mjs`.

- `electron/preload.ts`
  - إضافة `window.stockliteApi`.
  - APIs واضحة للمنتجات والعملاء والموردين والمبيعات والمشتريات والصناديق وباقي Controllers.
  - تحويل أخطاء IPC إلى JavaScript Error عادي مع `error.code`.
  - الإبقاء على `window.ipcRenderer` للتوافق القديم فقط.

- `electron-builder.json5`
  - نسخ ملفات Controllers وجسر قاعدة البيانات إلى موارد النسخة النهائية.

- `src/controllers/customerController.js`
  - إصلاح `dbManager` إلى `dbmanager`.
  - إصلاح INSERT وعدد الأعمدة والقيم.
  - دعم أسماء الحقول القديمة والجديدة.
  - إضافة `getAllCustomers` و`deleteCustomer`.

- `src/controllers/cashboxController.js`
  - إعادة تفعيل `deleteCashbox`.

## طريقة الاستخدام

```ts
import { api } from "../../services/api";

const products = await api.products.list();
const customer = await api.customers.create({ name: "عميل جديد" });
await api.cashboxes.remove(3);
```
