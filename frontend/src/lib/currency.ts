const SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function currencySymbol(currency: string) {
  return SYMBOLS[currency] ?? "$";
}

export function formatCurrency(amount: number | string, currency: string) {
  const value = Number(amount);
  const symbol = currencySymbol(currency);
  const sign = value < 0 ? "-" : "";
  return `${sign}${symbol}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
