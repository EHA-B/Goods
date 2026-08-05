import { ERROR_MESSAGES_AR, FIELD_MESSAGES_AR } from "./errorMessages.ar";

export type NormalizedAppError = {
  code: string;
  message: string;
  field?: string;
  technicalMessage?: string;
};

type ErrorLike = Error & { code?: string; field?: string; details?: unknown };

const MESSAGE_PATTERNS: Array<[RegExp, string]> = [
  [/not enough|insufficient.*balance|رصيد.*غير كاف/i, "INSUFFICIENT_BALANCE"],
  [/insufficient.*stock|not enough.*stock|quantity.*available/i, "INSUFFICIENT_STOCK"],
  [/currency.*mismatch|different currenc/i, "CASHBOX_CURRENCY_MISMATCH"],
  [/exchange.?rate/i, "INVALID_EXCHANGE_RATE"],
  [/already.*reversed/i, "PAYMENT_ALREADY_REVERSED"],
  [/already.*cancel/i, "INVOICE_ALREADY_CANCELLED"],
  [/payment.*remaining|exceed.*remaining/i, "PAYMENT_EXCEEDS_REMAINING"],
  [/unauthorized|not authenticated|session/i, "UNAUTHORIZED"],
  [/not found/i, "NOT_FOUND"],
  [/timeout|timed out/i, "TIMEOUT"],
  [/network|fetch failed|connection/i, "NETWORK_ERROR"],
  [/cannot read propert|undefined.*reading|is not a function/i, "INVALID_RESPONSE"],
  [/SQLITE_BUSY|database is locked/i, "DATABASE_BUSY"],
  [/SQLITE_READONLY|readonly database/i, "DATABASE_READONLY"],
  [/SQLITE_CONSTRAINT.*UNIQUE|unique constraint/i, "DUPLICATE_ENTRY"],
  [/SQLITE_CONSTRAINT.*FOREIGN|foreign key constraint/i, "FOREIGN_KEY_CONSTRAINT"],
  [/SQLITE_CONSTRAINT|not null constraint/i, "VALIDATION_ERROR"],
  [/SQLITE_|Knex|migration/i, "DATABASE_ERROR"],
  [/print|document/i, "PRINT_FAILED"],
  [/backup/i, "BACKUP_FAILED"],
  [/restore/i, "RESTORE_FAILED"],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function normalizeError(error: unknown): NormalizedAppError {
  const record = asRecord(error);
  const nested = asRecord(record?.error);
  const code = String(record?.code ?? nested?.code ?? "").trim().toUpperCase();
  const field = String(record?.field ?? nested?.field ?? "").trim() || undefined;
  const technicalMessage = error instanceof Error
    ? error.message
    : String(record?.message ?? nested?.message ?? error ?? "");

  const isArabicMessage = /[\u0600-\u06FF]/.test(technicalMessage);
  let resolvedCode = code || "UNKNOWN_ERROR";
  if (!ERROR_MESSAGES_AR[resolvedCode]) {
    const matched = MESSAGE_PATTERNS.find(([pattern]) => pattern.test(technicalMessage));
    if (matched) resolvedCode = matched[1];
  }

  const fieldMessage = field ? FIELD_MESSAGES_AR[field] : undefined;
  return {
    code: resolvedCode,
    field,
    technicalMessage,
    message: fieldMessage ?? (isArabicMessage ? technicalMessage : undefined) ?? ERROR_MESSAGES_AR[resolvedCode] ?? ERROR_MESSAGES_AR.UNKNOWN_ERROR,
  };
}

export function getArabicErrorMessage(error: unknown, fallback?: string): string {
  const normalized = normalizeError(error);
  if (normalized.code === "UNKNOWN_ERROR" && fallback) return fallback;
  return normalized.message;
}
