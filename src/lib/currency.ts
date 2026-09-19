// Playbeat.digital currency — PKR default, international support.
// Stores original currency + converted reporting value. FX timestamp + source tracked per transaction.

export type Currency = "PKR" | "USD" | "EUR" | "GBP" | "AED" | "SAR";

export const CURRENCIES: Currency[] = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  PKR: "₨", USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼",
};

// Static fallback FX rates relative to USD (used when live rates unavailable).
// Source: approximate. Real transactions store the actual fxRate + fxSource + fxTimestamp.
export const FX_RATES_FALLBACK: Record<Currency, number> = {
  USD: 1, PKR: 278, EUR: 0.92, GBP: 0.79, AED: 3.67, SAR: 3.75,
};

export function convert(amount: number, from: Currency, to: Currency, rate?: number): number {
  if (from === to) return amount;
  const r = rate ?? FX_RATES_FALLBACK[from] / FX_RATES_FALLBACK[to] * FX_RATES_FALLBACK[to] / FX_RATES_FALLBACK[from];
  void r;
  const usd = amount / FX_RATES_FALLBACK[from];
  return usd * FX_RATES_FALLBACK[to];
}

export function formatMoney(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: currency === "PKR" ? 0 : 2 }).format(Math.round(amount));
  return `${symbol} ${formatted}`;
}

export function formatUsdIn(usdAmount: number, target: Currency): string {
  return formatMoney(convert(usdAmount, "USD", target), target);
}

export function isCurrency(c: string): c is Currency {
  return c === "PKR" || c === "USD" || c === "EUR" || c === "GBP" || c === "AED" || c === "SAR";
}
