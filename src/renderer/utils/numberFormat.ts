export type NumberLike = number | string | null | undefined;

/**
 * Formats numeric values for display using Western digits and thousands separators.
 * Keep identifiers, invoice numbers, barcodes, phone numbers and editable input values unformatted.
 */
export function formatNumber(
  value: NumberLike,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || value === "") return "0";

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, "").trim());

  if (!Number.isFinite(numeric)) return String(value);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 10,
    ...options,
  }).format(numeric);
}

export function formatAmount(value: NumberLike): string {
  return formatNumber(value, { maximumFractionDigits: 2 });
}

export function formatFixedAmount(value: NumberLike): string {
  return formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: NumberLike): string {
  return `${formatNumber(value, { maximumFractionDigits: 2 })}%`;
}
