type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function readString(
  value: unknown,
) {
  return typeof value === "string"
    ? value
    : "";
}

function collectErrorRecords(
  error: unknown,
) {
  const records: UnknownRecord[] =
    [];

  const push = (
    value: unknown,
  ) => {
    if (
      isRecord(value) &&
      !records.includes(value)
    ) {
      records.push(value);
    }
  };

  push(error);

  if (isRecord(error)) {
    push(error.error);
    push(error.cause);
    push(error.details);
    push(error.data);
    push(error.response);

    if (isRecord(error.error)) {
      push(error.error.details);
      push(error.error.data);
    }

    if (isRecord(error.response)) {
      push(error.response.error);
      push(error.response.data);
    }
  }

  return records;
}

function extractErrorCode(
  error: unknown,
) {
  for (const record of collectErrorRecords(
    error,
  )) {
    const candidates = [
      record.code,
      record.errorCode,
      record.error_code,
      record.name,
    ];

    for (const candidate of candidates) {
      const value =
        readString(candidate)
          .trim()
          .toUpperCase();

      if (value) {
        return value;
      }
    }
  }

  return "";
}

function extractErrorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  for (const record of collectErrorRecords(
    error,
  )) {
    const candidates = [
      record.message,
      record.errorMessage,
      record.error_message,
      record.reason,
    ];

    for (const candidate of candidates) {
      const value =
        readString(candidate).trim();

      if (value) {
        return value;
      }
    }
  }

  return readString(error).trim();
}

const EDIT_ERROR_MESSAGES: Record<
  string,
  string
> = {
  INVALID_PASSWORD:
    "كلمة المرور غير صحيحة. تأكد من كلمة مرور المستخدم الحالي وحاول مرة أخرى.",

  WRONG_PASSWORD:
    "كلمة المرور غير صحيحة. تأكد من كلمة مرور المستخدم الحالي وحاول مرة أخرى.",

  UNAUTHENTICATED:
    "انتهت جلسة المستخدم. سجّل الدخول من جديد ثم حاول تعديل الفاتورة.",

  UNAUTHORIZED:
    "ليس لديك صلاحية لتعديل هذه الفاتورة.",

  INVOICE_NOT_FOUND:
    "تعذر العثور على الفاتورة المطلوبة.",

  SALE_INVOICE_NOT_FOUND:
    "تعذر العثور على فاتورة البيع المطلوبة.",

  PURCHASE_INVOICE_NOT_FOUND:
    "تعذر العثور على فاتورة الشراء المطلوبة.",

  PURCHASE_EDIT_STOCK_LOCK:
    "لا يمكن تعديل فاتورة الشراء لأن إحدى دفعاتها عليها حركة لاحقة مثل بيع أو تسوية أو حركة مخزون. عالج الحركات المرتبطة أولًا ثم حاول من جديد.",

  PURCHASE_EDIT_SETTLEMENT_LOCK:
    "لا يمكن تعديل فاتورة الأمانة بعد إنشاء تسوية لها. اعكس التسوية أو عالجها أولًا ثم حاول من جديد.",

  INVOICE_EDIT_PAYMENT_LOCK:
    "لا يمكن تعديل هذه البيانات لأن الفاتورة مرتبطة بدفعات مالية. اعكس الدفعات المرتبطة أولًا ثم حاول من جديد.",

  INVOICE_EDIT_BELOW_PAID:
    "لا يمكن حفظ التعديل لأن إجمالي الفاتورة الجديد أقل من المبلغ المدفوع. اعكس جزءًا من الدفعات أولًا.",

  INVOICE_EDIT_RELATION_LOCK:
    "لا يمكن تعديل هذه الفاتورة لأنها مرتبطة بحركات لاحقة. عالج الحركات المرتبطة أولًا ثم حاول من جديد.",

  INVOICE_EDIT_SCHEMA_ERROR:
    "تعذر تجهيز قاعدة البيانات لتعديل الفاتورة. أعد تشغيل التطبيق ثم حاول مرة أخرى.",

  INVOICE_EDIT_FAILED:
    "تعذر حفظ تعديل الفاتورة. يرجى المحاولة مرة أخرى.",
};

const MESSAGE_REASON_PATTERNS: Array<
  [RegExp, string]
> = [
  [
    /PURCHASE_EDIT_STOCK_LOCK/i,
    "PURCHASE_EDIT_STOCK_LOCK",
  ],
  [
    /PURCHASE_EDIT_SETTLEMENT_LOCK/i,
    "PURCHASE_EDIT_SETTLEMENT_LOCK",
  ],
  [
    /INVOICE_EDIT_PAYMENT_LOCK/i,
    "INVOICE_EDIT_PAYMENT_LOCK",
  ],
  [
    /INVOICE_EDIT_BELOW_PAID/i,
    "INVOICE_EDIT_BELOW_PAID",
  ],
  [
    /INVOICE_EDIT_RELATION_LOCK/i,
    "INVOICE_EDIT_RELATION_LOCK",
  ],
  [
    /INVALID_PASSWORD|WRONG_PASSWORD/i,
    "INVALID_PASSWORD",
  ],
  [
    /password.*incorrect|incorrect.*password/i,
    "INVALID_PASSWORD",
  ],
  [
    /دفعة.*حركة لاحقة|حركة لاحقة.*دفعة/i,
    "PURCHASE_EDIT_STOCK_LOCK",
  ],
  [
    /تسوية.*أمانة|أمانة.*تسوية/i,
    "PURCHASE_EDIT_SETTLEMENT_LOCK",
  ],
  [
    /دفعات.*مرتبطة|مرتبطة.*دفعات/i,
    "INVOICE_EDIT_PAYMENT_LOCK",
  ],
  [
    /أقل من.*المدفوع|المدفوع.*أقل/i,
    "INVOICE_EDIT_BELOW_PAID",
  ],
];

export function getInvoiceEditErrorMessage(
  error: unknown,
) {
  const code =
    extractErrorCode(error);

  if (
    code &&
    EDIT_ERROR_MESSAGES[code]
  ) {
    return EDIT_ERROR_MESSAGES[
      code
    ];
  }

  const message =
    extractErrorMessage(error);

  for (const [
    pattern,
    mappedCode,
  ] of MESSAGE_REASON_PATTERNS) {
    if (pattern.test(message)) {
      return EDIT_ERROR_MESSAGES[
        mappedCode
      ];
    }
  }

  /*
   * إذا وصلتنا رسالة عربية مفهومة من الباك
   * وليست رسالة تقنية/SQLite، نعرض السبب نفسه.
   */
  if (
    message &&
    /[\u0600-\u06FF]/.test(
      message,
    ) &&
    !/SQLITE|constraint|stack|trace|database|unknown error/i.test(
      message,
    )
  ) {
    return message;
  }

  return (
    "تعذر حفظ تعديل الفاتورة. " +
    "يرجى المحاولة مرة أخرى."
  );
}
