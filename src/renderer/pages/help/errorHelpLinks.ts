const ERROR_HELP_ARTICLES: Record<string, string> = {
  INSUFFICIENT_BALANCE: "cashboxes",
  CASHBOX_CURRENCY_MISMATCH: "exchange-rates",
  INVALID_EXCHANGE_RATE: "exchange-rates",
  INSUFFICIENT_STOCK: "inventory",
  PAYMENT_EXCEEDS_REMAINING: "payments",
  PAYMENT_ALREADY_REVERSED: "payments",
  INVOICE_ALREADY_CANCELLED: "sales",
  FOREIGN_KEY_CONSTRAINT: "products",
  PRINT_FAILED: "printing",
  BACKUP_FAILED: "backup-restore",
  RESTORE_FAILED: "backup-restore",
  DATABASE_ERROR: "backup-restore",
  DATABASE_BUSY: "backup-restore",
  DATABASE_READONLY: "backup-restore",
};

export function getHelpArticleForError(code: string): string | null {
  return ERROR_HELP_ARTICLES[code] ?? null;
}

export function openHelpArticle(slug: string) {
  window.location.hash = `#/help/${slug}`;
}
