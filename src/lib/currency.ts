// Currency helpers for PLAYBEAT PULSE multi-currency CRM (PKR / USD / AED)

export type Currency = "PKR" | "USD" | "AED";

export const CURRENCIES: Currency[] = ["PKR", "USD", "AED"];

// FX rates relative to USD (base)
export const FX_RATES: Record<Currency, number> = {
  USD: 1,
  PKR: 278,
  AED: 3.67,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  PKR: "₨",
  USD: "$",
  AED: "د.إ",
};

/** Convert an amount+source currency into a target currency using FX_RATES. */
export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const usd = amount / FX_RATES[from];
  return usd * FX_RATES[to];
}

/** Format an amount in a given currency with symbol + grouping. */
export function formatMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "AED" ? 2 : 0,
  }).format(Math.round(amount));
  return `${symbol} ${formatted}`;
}

/** Format a USD-normalized number into a display currency. */
export function formatUsdIn(usdAmount: number, target: Currency): string {
  return formatMoney(convert(usdAmount, "USD", target), target);
}

export function isCurrency(c: string): c is Currency {
  return c === "PKR" || c === "USD" || c === "AED";
}
