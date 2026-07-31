ملفات ربط المنتجات مع الباك

1) انسخ جميع المجلدات الموجودة هنا فوق نفس المسارات داخل GoodsApp ووافق على الاستبدال.
2) احذف يدويًا هذين الملفين إن كانا موجودين:
   src/renderer/pages/products/ProductsContext.tsx
   src/renderer/pages/products/ProductDialog.tsx
3) تأكد أن AppRouter.tsx لا يحتوي ProductsProvider.
4) شغّل:
   npm run dev

لا تنسخ vite.config.ts من هذه الحزمة؛ استخدم النسخة التي أصلحت 404 لديك.
