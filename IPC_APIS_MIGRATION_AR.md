# توحيد IPC APIs

تم اعتماد ملف APIs موحد كمصدر وحيد لقنوات Electron:

- `electron/apis/Apis.ts`

## ما تم تغييره

- حذف ملفات IPC المنفصلة القديمة الخاصة بالمنتجات والعملاء والموردين والمخزون والصناديق وDebug.
- تعديل `electron/main.ts` ليستورد ملف APIs الموحد مرة واحدة فقط.
- تعديل `electron/preload.ts` لاستخدام قنوات `api:*` الجديدة.
- إضافة Wrapper موحد يفك استجابة `{ success, data, error }` ويرمي خطأ واضحًا للفرونت.
- الحفاظ على واجهات الفرونت الحالية مثل `window.stockliteApi.products.list()` حتى لا تتغير صفحات المنتجات والعملاء والموردين.
- إضافة جميع أقسام API المتاحة إلى `window.stockliteApi` تمهيدًا لربط بقية الوحدات.
- إضافة طبقة توافق CommonJS للـ Controllers القديمة وقاعدة SQLite.
- تحديث إعداد electron-builder لإدراج ملفات Controllers وطبقة قاعدة البيانات في نسخة الإنتاج.

## التشغيل

```powershell
npm install
npm run dev
```
