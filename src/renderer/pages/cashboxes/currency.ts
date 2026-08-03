export const CASHBOX_CURRENCIES = [
  { value: "SYP", label: "الليرة السورية (ل.س)" },
  { value: "USD", label: "الدولار الأمريكي ($)" },
  { value: "EUR", label: "اليورو (€)" },
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  SYP: "ل.س",
  USD: "$",
  EUR: "€",
  SAR: "ر.س",
};

const CURRENCY_NAMES: Record<string, string> = {
  SYP: "الليرة السورية",
  USD: "الدولار الأمريكي",
  EUR: "اليورو",
  SAR: "الريال السعودي",
};

export function currencySymbol(currency?: string | null): string {
  const code = currency?.trim().toUpperCase() || "SYP";
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function currencyName(currency?: string | null): string {
  const code = currency?.trim().toUpperCase() || "SYP";
  return CURRENCY_NAMES[code] ?? code;
}

export function formatNumber(value: number | string | null | undefined): string {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

export function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  if (value == null) return "—";
  return `${formatNumber(value)} ${currencySymbol(currency)}`;
}
