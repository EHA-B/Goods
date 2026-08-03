# واجهة إغلاق فاتورة الأمانة

تم تجهيز واجهة كاملة مستقلة عن الباك حاليًا وتشمل:

- صفحة متابعة مبيعات وكميات فاتورة الأمانة.
- صفحة إغلاق وتسوية الفاتورة.
- معاينة العمولة وحصة المورد ورصيد الصندوق.
- سياسات معالجة المتبقي: إرجاع، تلف، ترحيل.
- نافذة تأكيد تمنع الإرسال المكرر.
- صفحة نتيجة التسوية والطباعة.
- Mock Service مستقل يسهل استبداله لاحقًا بالـ API.

المسارات:

- `/purchases/:purchaseId/consignment`
- `/purchases/:purchaseId/close-consignment`
- `/purchases/:purchaseId/consignment-settlement`

عند تجهيز الباك، يتم تعديل `consignmentService.ts` فقط لربط:

- getConsignmentSummary
- previewConsignmentClosing
- closeConsignment
- getConsignmentSettlement
