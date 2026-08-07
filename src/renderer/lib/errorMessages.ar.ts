export const ERROR_MESSAGES_AR: Record<string, string> = {
  UNKNOWN_ERROR:
    "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",

  VALIDATION_ERROR:
    "يرجى التحقق من البيانات المدخلة ثم المحاولة مرة أخرى.",

  REQUIRED_FIELD:
    "يرجى تعبئة الحقول المطلوبة.",

  NOT_FOUND:
    "تعذر العثور على السجل المطلوب.",

  UNAUTHORIZED:
    "انتهت الجلسة أو لا تملك صلاحية تنفيذ العملية.",

  UNAUTHENTICATED:
    "انتهت جلسة العمل. يرجى تسجيل الدخول مجددًا.",

  FORBIDDEN:
    "لا تملك صلاحية تنفيذ هذه العملية.",

  FORBIDDEN_FIELD:
    "لا يمكن تعديل أحد الحقول المحددة.",

  INVALID_CREDENTIALS:
    "اسم المستخدم أو كلمة المرور غير صحيحة.",

  INVALID_CURRENT_PASSWORD:
    "كلمة المرور الحالية غير صحيحة.",

  PASSWORD_UNCHANGED:
    "يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.",

  SESSION_EXPIRED:
    "انتهت جلسة العمل. يرجى تسجيل الدخول مجددًا.",

  DUPLICATE_ENTRY:
    "هذه القيمة مستخدمة مسبقًا.",

  ALREADY_EXISTS:
    "يوجد سجل مماثل مسبقًا.",

  HAS_DEPENDENCIES:
    "لا يمكن حذف هذا السجل لأنه مرتبط ببيانات مستخدمة داخل النظام.",

  FOREIGN_KEY_CONSTRAINT:
    "لا يمكن حذف هذا السجل لوجود سجلات مرتبطة به.",

  SQLITE_CONSTRAINT:
    "لا يمكن تنفيذ العملية بسبب وجود بيانات مرتبطة بالسجل.",

  // المنتجات
  PRODUCT_IN_USE:
    "لا يمكن حذف المنتج لأنه مستخدم في فواتير أو دفعات مخزون أو حركات مخزون.",

  PRODUCT_NOT_FOUND:
    "المنتج المطلوب غير موجود.",

  INACTIVE_PRODUCT:
    "المنتج المحدد غير نشط.",

  DUPLICATE_PRODUCT_CODE:
    "كود المنتج مستخدم مسبقًا. اختر كودًا مختلفًا.",

  // العملاء
  CUSTOMER_IN_USE:
    "لا يمكن حذف العميل لأنه مرتبط بفواتير بيع أو دفعات مسجلة.",

  CUSTOMER_NOT_FOUND:
    "العميل المطلوب غير موجود.",

  INACTIVE_CUSTOMER:
    "العميل المحدد غير نشط.",

  CUSTOMER_REQUIRED_FOR_CREDIT:
    "يجب تحديد عميل عند البيع الآجل أو الجزئي.",

  // الموردون
  SUPPLIER_IN_USE:
    "لا يمكن حذف المورد لأنه مرتبط بفواتير شراء أو دفعات مخزون أو مدفوعات.",

  SUPPLIER_NOT_FOUND:
    "المورد المطلوب غير موجود.",

  INACTIVE_SUPPLIER:
    "المورد المحدد غير نشط.",

  SUPPLIER_REQUIRED:
    "يجب تحديد المورد لإتمام عملية الشراء.",

  // الصناديق
  CASHBOX_IN_USE:
    "لا يمكن حذف الصندوق لأنه يحتوي على رصيد أو حركات أو دفعات مرتبطة.",

  CASHBOX_NOT_FOUND:
    "تعذر العثور على الصندوق المحدد.",

  INACTIVE_CASHBOX:
    "الصندوق المحدد غير نشط.",

  INACTIVE_PARENT_CASHBOX:
    "الصندوق الأب المحدد غير نشط.",

  DUPLICATE_CASHBOX_NAME:
    "يوجد صندوق آخر بنفس الاسم.",

  CASHBOX_CURRENCY_MISMATCH:
    "عملة الصندوق لا تطابق عملة العملية.",

  CURRENCY_MISMATCH:
    "عملة العملية لا تطابق العملة المطلوبة.",

  CURRENCY_CHANGE_NOT_ALLOWED:
    "لا يمكن تغيير عملة هذا السجل بعد استخدامه في حركات مالية.",

  INVALID_CURRENCY:
    "العملة المحددة غير صالحة.",

  SAME_CASHBOX_TRANSFER:
    "يجب اختيار صندوقين مختلفين للتحويل.",

  INVALID_TRANSFER_AMOUNT:
    "مبلغ التحويل يجب أن يكون أكبر من صفر.",

  INVALID_TRANSFER_GROUP:
    "بيانات مجموعة التحويل غير صالحة.",

  TRANSFER_NOT_FOUND:
    "تعذر العثور على عملية التحويل.",

  TRANSFER_ALREADY_REVERSED:
    "تم عكس عملية التحويل مسبقًا.",

  TRANSFER_REQUIRES_GROUP_REVERSAL:
    "يجب عكس عملية التحويل كاملة بدل عكس حركة واحدة منها.",

  INSUFFICIENT_BALANCE:
    "رصيد الصندوق غير كافٍ لإتمام العملية.",

  INSUFFICIENT_BALANCE_FOR_REVERSAL:
    "رصيد الصندوق غير كافٍ لتنفيذ عملية العكس.",

  // قاعدة البيانات
  DATABASE_BUSY:
    "قاعدة البيانات مشغولة حاليًا. أعد المحاولة بعد لحظات.",

  DATABASE_READONLY:
    "تعذر حفظ التغييرات لأن قاعدة البيانات للقراءة فقط.",

  DATABASE_ERROR:
    "تعذر تنفيذ العملية على قاعدة البيانات.",

  DATABASE_NOT_INITIALIZED:
    "قاعدة البيانات غير مهيأة بشكل صحيح.",

  MIGRATION_ERROR:
    "تعذر تحديث قاعدة البيانات إلى الإصدار المطلوب.",

  // الملفات والنسخ الاحتياطي
  FILE_NOT_FOUND:
    "تعذر العثور على الملف المطلوب.",

  FILE_ACCESS_DENIED:
    "لا يمكن الوصول إلى الملف أو المجلد المحدد.",

  INVALID_BACKUP:
    "ملف النسخة الاحتياطية غير صالح أو غير متوافق.",

  BACKUP_FAILED:
    "تعذر إنشاء النسخة الاحتياطية.",

  RESTORE_FAILED:
    "تعذر استعادة النسخة الاحتياطية.",

  // IPC
  INVALID_RESPONSE:
    "وصلت استجابة غير متوقعة من النظام.",

  IPC_ERROR:
    "تعذر التواصل مع خدمة التطبيق الداخلية.",

  TIMEOUT:
    "استغرقت العملية وقتًا أطول من المتوقع. حاول مجددًا.",

  NETWORK_ERROR:
    "تعذر الاتصال بالخدمة المطلوبة.",

  // الطباعة
  PRINT_FAILED:
    "تعذر تجهيز مستند الطباعة.",

  PRINT_LOAD_FAILED:
    "تعذر تحميل بيانات مستند الطباعة.",

  // المخزون
  INSUFFICIENT_STOCK:
    "الكمية المتوفرة في المخزون غير كافية.",

  STOCK_BATCH_NOT_FOUND:
    "تعذر العثور على دفعة المخزون المحددة.",

  STOCK_BATCH_PRODUCT_MISMATCH:
    "دفعة المخزون المحددة لا تتبع المنتج المطلوب.",

  INACTIVE_STOCK_BATCH:
    "دفعة المخزون المحددة غير نشطة.",

  DUPLICATE_BATCH_CODE:
    "كود دفعة المخزون مستخدم مسبقًا.",

  INVALID_QUANTITY:
    "الكمية المدخلة غير صالحة.",

  INVALID_PRICE:
    "السعر المدخل غير صالح.",

  // الفواتير
  INVOICE_NOT_FOUND:
    "تعذر العثور على الفاتورة المطلوبة.",

  DUPLICATE_INVOICE_NUMBER:
    "رقم الفاتورة مستخدم مسبقًا.",

  INVOICE_ALREADY_CANCELLED:
    "تم إلغاء هذه الفاتورة مسبقًا.",

  INVOICE_ALREADY_PAID:
    "الفاتورة مدفوعة بالكامل.",

  INVOICE_NOT_PAYABLE:
    "لا يمكن تسجيل دفعة على هذه الفاتورة.",

  SALE_ALREADY_CANCELLED:
    "تم إلغاء فاتورة البيع مسبقًا.",

  SALE_INVOICE_LOCKED:
    "فاتورة البيع مقفلة ولا يمكن تعديلها.",

  SALE_ITEM_INVALID:
    "يوجد صنف غير صالح داخل فاتورة البيع.",

  SALE_CANNOT_BE_CANCELLED_CASHBOX_BALANCE:
    "لا يمكن إلغاء فاتورة البيع لأن رصيد الصندوق لا يكفي لعكس الحركة المالية.",

  PURCHASE_ALREADY_CANCELLED:
    "تم إلغاء فاتورة الشراء مسبقًا.",

  PURCHASE_NOT_FOUND:
    "فاتورة الشراء المطلوبة غير موجودة.",

  PURCHASE_INVOICE_LOCKED:
    "فاتورة الشراء مقفلة ولا يمكن تعديلها.",

  PURCHASE_ITEM_INVALID:
    "يوجد صنف غير صالح داخل فاتورة الشراء.",

  PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED:
    "لا يمكن إلغاء فاتورة الشراء لأن جزءًا من مخزونها تم استخدامه أو بيعه.",

  DUPLICATE_PURCHASE_PRODUCT:
    "لا يمكن إضافة نفس المنتج أكثر من مرة في فاتورة الشراء.",

  INVALID_DISCOUNT:
    "قيمة الخصم غير صالحة.",

  // الدفعات
  INVALID_PAYMENT_AMOUNT:
    "قيمة الدفعة غير صالحة.",

  PAYMENT_AMOUNT_INVALID:
    "قيمة الدفعة غير صالحة.",

  PAYMENT_EXCEEDS_REMAINING:
    "قيمة الدفعة أكبر من المبلغ المتبقي.",

  PAYMENT_EXCEEDS_OUTSTANDING:
    "قيمة الدفعة أكبر من الرصيد المستحق على الفاتورة.",

  PAYMENT_NOT_FOUND:
    "تعذر العثور على الدفعة المطلوبة.",

  PAYMENT_ALREADY_REVERSED:
    "تم عكس هذه الدفعة مسبقًا.",

  REVERSAL_REASON_REQUIRED:
    "يرجى إدخال سبب العكس.",

  CANNOT_REVERSE_REVERSAL:
    "لا يمكن عكس حركة عكس سابقة.",

  CANNOT_REVERSE_OPENING_BALANCE:
    "لا يمكن عكس حركة الرصيد الافتتاحي.",

  MOVEMENT_ALREADY_REVERSED:
    "تم عكس هذه الحركة مسبقًا.",

  NOT_REVERSIBLE:
    "هذه الحركة لا يمكن عكسها.",

  // العملات
  INVALID_EXCHANGE_RATE:
    "سعر الصرف غير صالح. أدخل قيمة أكبر من صفر.",

  UNSUPPORTED_CURRENCY:
    "العملة المحددة غير مدعومة.",

  // المعاملات
  TRANSACTION_NOT_FOUND:
    "تعذر العثور على المعاملة المطلوبة.",

  TRANSACTION_ALREADY_CANCELLED:
    "تم إلغاء هذه المعاملة مسبقًا.",

  INVALID_TRANSACTION_DATE:
    "تاريخ المعاملة غير صالح.",

  // التصنيفات
  CATEGORY_IN_USE:
    "لا يمكن حذف التصنيف لأنه مستخدم في معاملات مسجلة.",

  CATEGORY_TYPE_LOCKED:
    "لا يمكن تغيير نوع هذا التصنيف بعد استخدامه.",

  CATEGORY_TYPE_MISMATCH:
    "نوع التصنيف لا يتوافق مع نوع المعاملة.",

  INACTIVE_CATEGORY:
    "التصنيف المحدد غير نشط.",

  // الأمانة
  CONSIGNMENT_ALREADY_CLOSED:
    "تمت تسوية فاتورة الأمانة مسبقًا.",

  CONSIGNMENT_ALREADY_REVERSED:
    "تم عكس هذه التسوية مسبقًا.",

  CONSIGNMENT_SETTLEMENT_ALREADY_REVERSED:
    "تم عكس تسوية الأمانة مسبقًا.",

  CONSIGNMENT_SETTLEMENT_NOT_FOUND:
    "تعذر العثور على تسوية الأمانة.",

  CONSIGNMENT_SALES_CHANGED:
    "تغيرت بيانات المبيعات بعد المعاينة. حدّث المعاينة ثم حاول مجددًا.",

  CONSIGNMENT_CURRENCY_NOT_SUPPORTED:
    "العملة المحددة غير مدعومة لفاتورة الأمانة.",

  NOT_CONSIGNMENT_INVOICE:
    "الفاتورة المحددة ليست فاتورة أمانة.",

  INVALID_COMMISSION_PERCENTAGE:
    "نسبة العمولة غير صالحة.",

  INVALID_REMAINING_STOCK_POLICY:
    "طريقة معالجة الكمية المتبقية غير صالحة.",

  INVALID_SETTLEMENT_DATE:
    "تاريخ التسوية غير صالح.",

  INSUFFICIENT_SETTLEMENT_BALANCE:
    "رصيد الصندوق غير كافٍ لإتمام التسوية.",

  INVALID_ESTIMATED_PURCHASE_PRICE:
    "سعر الشراء المتوقع لا يمكن أن يكون قيمة سالبة.",

  CONSIGNMENT_INITIAL_PAYMENT_NOT_ALLOWED:
    "لا يمكن تسجيل دفعة أولية عند استلام فاتورة أمانة.",

  // الإشعارات
  NOTIFICATIONS_LOAD_FAILED:
    "تعذر تحميل الإشعارات. يرجى إعادة تشغيل التطبيق والمحاولة مجددًا.",

  NOTIFICATIONS_TABLE_MISSING:
    "جدول الإشعارات غير موجود في قاعدة البيانات.",

  NOTIFICATION_UPDATE_FAILED:
    "تعذر تحديث حالة الإشعار.",

  // المستخدم
  INACTIVE_USER:
    "هذا الحساب غير نشط.",
};

export const FIELD_MESSAGES_AR: Record<string, string> = {
  name: "الاسم مطلوب.",
  username: "اسم المستخدم مطلوب.",
  password: "كلمة المرور مطلوبة.",
  currentPassword: "كلمة المرور الحالية مطلوبة.",
  newPassword: "كلمة المرور الجديدة مطلوبة.",

  product_id: "يرجى اختيار المنتج.",
  supplier_id: "يرجى اختيار المورد.",
  customer_id: "يرجى اختيار العميل.",
  cashbox_id: "يرجى اختيار الصندوق.",
  category_id: "يرجى اختيار التصنيف.",

  quantity:
    "الكمية يجب أن تكون أكبر من صفر.",

  amount:
    "المبلغ يجب أن يكون أكبر من صفر.",

  unit_price:
    "سعر الوحدة يجب أن يكون أكبر من صفر.",

  purchase_price:
    "سعر الشراء غير صالح.",

  estimated_purchase_price:
    "سعر الشراء المتوقع غير صالح.",

  exchange_rate:
    "سعر الصرف يجب أن يكون أكبر من صفر.",

  invoice_date:
    "تاريخ الفاتورة مطلوب.",

  transaction_date:
    "تاريخ العملية مطلوب.",
};