import {
  ERROR_MESSAGES_AR,
  FIELD_MESSAGES_AR,
} from "./errorMessages.ar";

export type NormalizedAppError = {
  code: string;
  message: string;
  field?: string;
  technicalMessage?: string;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(
  value: unknown,
): UnknownRecord | null {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value as UnknownRecord;
}

function asString(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizeCode(
  value: unknown,
): string {
  return asString(value)
    .trim()
    .toUpperCase();
}

function extractErrorInfo(error: unknown) {
  const root = asRecord(error);

  const nestedError =
    asRecord(root?.error);

  const cause =
    asRecord(root?.cause);

  const nestedCause =
    asRecord(nestedError?.cause);

  let code = normalizeCode(
    root?.code ??
      nestedError?.code ??
      cause?.code ??
      nestedCause?.code,
  );

  const field =
    asString(
      root?.field ??
        nestedError?.field ??
        cause?.field ??
        nestedCause?.field,
    ) || undefined;

  let technicalMessage = "";

  if (error instanceof Error) {
    technicalMessage =
      error.message || "";
  }

  if (!technicalMessage) {
    technicalMessage = asString(
      root?.message ??
        nestedError?.message ??
        cause?.message ??
        nestedCause?.message ??
        error,
    );
  }

  /*
   * Electron أحيانًا يغلف الخطأ بهذا الشكل:
   *
   * Error invoking remote method '...':
   * Error: ...
   */
  technicalMessage =
    technicalMessage
      .replace(
        /^Error invoking remote method ['"].*?['"]:\s*/i,
        "",
      )
      .replace(
        /^Error:\s*/i,
        "",
      )
      .trim();

  /*
   * أحيانًا يصل الكود داخل النص نفسه.
   */
  if (!code) {
    const codeMatch =
      technicalMessage.match(
        /\b([A-Z][A-Z0-9_]{2,})\b/,
      );

    if (codeMatch?.[1]) {
      const possibleCode =
        codeMatch[1].toUpperCase();

      if (
        ERROR_MESSAGES_AR[
          possibleCode
        ]
      ) {
        code = possibleCode;
      }
    }
  }

  return {
    code,
    field,
    technicalMessage,
  };
}

/*
 * مهم جدًا:
 * إذا ضاع error.code أثناء IPC،
 * نستخرج السبب من رسالة الباك نفسها.
 */
const MESSAGE_PATTERNS: Array<
  [RegExp, string]
> = [
  /*
   * تعديل الفواتير
   * مهم كـ fallback إذا ضاع error.code أثناء IPC.
   */
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

  /*
   * المنتجات
   */
  [
    /cannot delete product because it is referenced/i,
    "PRODUCT_IN_USE",
  ],

  [
    /product.*referenced by existing records/i,
    "PRODUCT_IN_USE",
  ],

  [
    /product.*linked.*invoice|product.*linked.*stock/i,
    "PRODUCT_IN_USE",
  ],

  /*
   * كلمات المرور
   */
  [
    /INVALID_PASSWORD/i,
    "INVALID_PASSWORD",
  ],

  [
    /كلمة المرور غير صحيحة/i,
    "INVALID_PASSWORD",
  ],

  [
    /invalid[_\s-]*current[_\s-]*password/i,
    "INVALID_CURRENT_PASSWORD",
  ],

  [
    /current password is incorrect/i,
    "INVALID_CURRENT_PASSWORD",
  ],

  [
    /password[_\s-]*unchanged/i,
    "PASSWORD_UNCHANGED",
  ],

  [
    /different from the current password/i,
    "PASSWORD_UNCHANGED",
  ],

  /*
   * العلاقات في قاعدة البيانات
   */
  [
    /foreign key constraint failed/i,
    "HAS_DEPENDENCIES",
  ],

  [
    /foreign key constraint/i,
    "HAS_DEPENDENCIES",
  ],

  [
    /referenced by existing records/i,
    "HAS_DEPENDENCIES",
  ],

  [
    /linked records/i,
    "HAS_DEPENDENCIES",
  ],

  [
    /has dependencies/i,
    "HAS_DEPENDENCIES",
  ],

  /*
   * Unique
   */
  [
    /unique constraint failed/i,
    "DUPLICATE_ENTRY",
  ],

  [
    /already exists/i,
    "ALREADY_EXISTS",
  ],

  /*
   * SQLite validation
   */
  [
    /not null constraint failed/i,
    "VALIDATION_ERROR",
  ],

  [
    /check constraint failed/i,
    "VALIDATION_ERROR",
  ],

  /*
   * الرصيد
   */
  [
    /insufficient.*balance/i,
    "INSUFFICIENT_BALANCE",
  ],

  [
    /not enough.*balance/i,
    "INSUFFICIENT_BALANCE",
  ],

  [
    /رصيد.*غير كاف/i,
    "INSUFFICIENT_BALANCE",
  ],

  /*
   * المخزون
   */
  [
    /insufficient.*stock/i,
    "INSUFFICIENT_STOCK",
  ],

  [
    /not enough.*stock/i,
    "INSUFFICIENT_STOCK",
  ],

  [
    /quantity.*available/i,
    "INSUFFICIENT_STOCK",
  ],

  /*
   * العملات
   */
  [
    /currency.*mismatch/i,
    "CASHBOX_CURRENCY_MISMATCH",
  ],

  [
    /different currenc/i,
    "CASHBOX_CURRENCY_MISMATCH",
  ],

  [
    /exchange.?rate/i,
    "INVALID_EXCHANGE_RATE",
  ],

  /*
   * الدفعات
   */
  [
    /payment.*exceed.*remaining/i,
    "PAYMENT_EXCEEDS_REMAINING",
  ],

  [
    /exceed.*outstanding/i,
    "PAYMENT_EXCEEDS_REMAINING",
  ],

  [
    /already.*reversed/i,
    "PAYMENT_ALREADY_REVERSED",
  ],

  /*
   * الإلغاء
   */
  [
    /already.*cancel/i,
    "INVOICE_ALREADY_CANCELLED",
  ],

  /*
   * تسجيل الدخول
   */
  [
    /unauthorized/i,
    "UNAUTHORIZED",
  ],

  [
    /not authenticated/i,
    "UNAUTHORIZED",
  ],

  [
    /authentication is required/i,
    "UNAUTHORIZED",
  ],

  /*
   * Not found
   */
  [
    /not found/i,
    "NOT_FOUND",
  ],

  /*
   * Database
   */
  [
    /SQLITE_BUSY/i,
    "DATABASE_BUSY",
  ],

  [
    /database is locked/i,
    "DATABASE_BUSY",
  ],

  [
    /SQLITE_READONLY/i,
    "DATABASE_READONLY",
  ],

  [
    /readonly database/i,
    "DATABASE_READONLY",
  ],

  /*
   * Network / IPC
   */
  [
    /timeout|timed out/i,
    "TIMEOUT",
  ],

  [
    /network|fetch failed|connection/i,
    "NETWORK_ERROR",
  ],

  [
    /cannot read propert|undefined.*reading|is not a function/i,
    "INVALID_RESPONSE",
  ],

  /*
   * Generic DB error يجب أن يكون قرب النهاية.
   */
  [
    /SQLITE_|Knex|migration/i,
    "DATABASE_ERROR",
  ],

  [
    /backup/i,
    "BACKUP_FAILED",
  ],

  [
    /restore/i,
    "RESTORE_FAILED",
  ],
];

function mapRawCode(
  code: string,
  technicalMessage: string,
): string {
  if (!code) {
    return "";
  }

  /*
   * الخطأ العام SQLITE_CONSTRAINT
   * غير كافٍ لوحده، لذلك نفحص الرسالة.
   */
  if (
    code ===
      "SQLITE_CONSTRAINT" ||
    code ===
      "SQLITE_CONSTRAINT_FOREIGNKEY"
  ) {
    if (
      /foreign key constraint/i.test(
        technicalMessage,
      )
    ) {
      return "HAS_DEPENDENCIES";
    }

    if (
      /unique constraint/i.test(
        technicalMessage,
      )
    ) {
      return "DUPLICATE_ENTRY";
    }

    if (
      /not null constraint/i.test(
        technicalMessage,
      ) ||
      /check constraint/i.test(
        technicalMessage,
      )
    ) {
      return "VALIDATION_ERROR";
    }
  }

  if (
    code ===
    "SQLITE_CONSTRAINT_UNIQUE"
  ) {
    return "DUPLICATE_ENTRY";
  }

  if (
    code ===
      "SQLITE_CONSTRAINT_NOTNULL" ||
    code ===
      "SQLITE_CONSTRAINT_CHECK"
  ) {
    return "VALIDATION_ERROR";
  }

  if (code === "SQLITE_BUSY") {
    return "DATABASE_BUSY";
  }

  if (
    code === "SQLITE_READONLY"
  ) {
    return "DATABASE_READONLY";
  }

  return code;
}

export function normalizeError(
  error: unknown,
): NormalizedAppError {
  const {
    code: extractedCode,
    field,
    technicalMessage,
  } = extractErrorInfo(error);

  let resolvedCode =
    mapRawCode(
      extractedCode,
      technicalMessage,
    ) || "UNKNOWN_ERROR";

  /*
   * لا نكتفي بـ UNKNOWN_ERROR.
   *
   * حتى لو وصل كود غير معروف،
   * نحاول اكتشاف السبب من رسالة الباك.
   */
  if (
    resolvedCode ===
      "UNKNOWN_ERROR" ||
    !ERROR_MESSAGES_AR[
      resolvedCode
    ]
  ) {
    const matched =
      MESSAGE_PATTERNS.find(
        ([pattern]) =>
          pattern.test(
            technicalMessage,
          ),
      );

    if (matched) {
      resolvedCode =
        matched[1];
    }
  }

  /*
   * حتى لو وصل UNKNOWN_ERROR من الباك،
   * ممكن أن الرسالة نفسها تحمل السبب الحقيقي.
   */
  if (
    resolvedCode ===
    "UNKNOWN_ERROR"
  ) {
    const matched =
      MESSAGE_PATTERNS.find(
        ([pattern]) =>
          pattern.test(
            technicalMessage,
          ),
      );

    if (matched) {
      resolvedCode =
        matched[1];
    }
  }

  const fieldMessage =
    field
      ? FIELD_MESSAGES_AR[
          field
        ]
      : undefined;

  const translatedMessage =
    resolvedCode !== "UNKNOWN_ERROR"
      ? ERROR_MESSAGES_AR[resolvedCode]
      : undefined;

  const isArabicMessage =
    /[\u0600-\u06FF]/.test(
      technicalMessage,
    );

  /*
   * أولوية الرسالة:
   *
   * 1. خطأ الحقل.
   * 2. ترجمة error code المركزي (إذا كان الكود معروفًا وغير UNKNOWN_ERROR).
   * 3. رسالة عربية قادمة من الباك أو IPC.
   * 4. UNKNOWN_ERROR.
   */
  const message =
    fieldMessage ??
    translatedMessage ??
    (isArabicMessage
      ? technicalMessage
      : undefined) ??
    ERROR_MESSAGES_AR.UNKNOWN_ERROR;

  return {
    code: resolvedCode,
    message,
    field,
    technicalMessage:
      technicalMessage ||
      undefined,
  };
}

export function getArabicErrorMessage(
  error: unknown,
  fallback?: string,
): string {
  const normalized =
    normalizeError(error);

  if (
    normalized.code === "UNKNOWN_ERROR" &&
    normalized.message === ERROR_MESSAGES_AR.UNKNOWN_ERROR &&
    fallback
  ) {
    return fallback;
  }

  return normalized.message;
}