/**
 * Format price for display. Supports conversion from USD using rate (rate = 1 for USD).
 * AI/backend values are in USD; pass rate from useExchangeRatesStore.getRate(currencyCode) to convert.
 */

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  CAD: 'C$',
  AUD: 'A$',
  NZD: 'NZ$',
  CNY: '¥',
  SGD: 'S$',
  HKD: 'HK$',
  KRW: '₩',
  INR: '₹',
  RUB: '₽',
  BRL: 'R$',
  MXN: 'MX$',
  ZAR: 'R',
  TRY: '₺',
  AED: 'AED ',
  SAR: 'SAR ',
};

/**
 * @param {number|null|undefined} value - amount (e.g. from market_value_min)
 * @param {string} currencyCode - e.g. 'USD', 'EUR' from useAppSettingsStore preferredCurrency
 * @returns {string} e.g. "$1,234" or "1,234 EUR"
 */
export function formatPrice(value, currencyCode = 'USD') {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const sym = CURRENCY_SYMBOLS[currencyCode];
  if (sym) return `${sym}${formatted}`;
  return `${formatted} ${currencyCode}`;
}

/**
 * Format a range (min – max) in preferred currency.
 */
export function formatPriceRange(min, max, currencyCode = 'USD') {
  if (min == null && max == null) return '—';
  const a = formatPrice(min ?? 0, currencyCode);
  const b = formatPrice(max ?? 0, currencyCode);
  if (a === '—' && b === '—') return '—';
  return `${a} – ${b}`;
}

/**
 * Convert amount from USD to target currency using rate (from useExchangeRatesStore.getRate).
 */
export function convertFromUsd(valueUsd, rate = 1) {
  if (valueUsd == null || valueUsd === '') return null;
  const n = Number(valueUsd);
  if (Number.isNaN(n)) return null;
  return n * rate;
}

/**
 * Format a USD value in preferred currency: convert using rate then format.
 * Use when backend values are in USD (e.g. market_value_min/max).
 */
export function formatPriceUsd(valueUsd, currencyCode = 'USD', rate = 1) {
  const converted = convertFromUsd(valueUsd, rate);
  if (converted == null) return '—';
  return formatPrice(converted, currencyCode);
}

/**
 * Format a USD range (min, max) in preferred currency with conversion.
 */
export function formatPriceRangeUsd(minUsd, maxUsd, currencyCode = 'USD', rate = 1) {
  if (minUsd == null && maxUsd == null) return '—';
  const a = formatPriceUsd(minUsd ?? 0, currencyCode, rate);
  const b = formatPriceUsd(maxUsd ?? 0, currencyCode, rate);
  if (a === '—' && b === '—') return '—';
  return `${a} – ${b}`;
}

/**
 * Antique sahifadagi "Current market value" bilan bir xil formula (bitta manba).
 * Tartib: eBay’da Gemini/target’ga eng yaqin narx → eBay o‘rtachasi → min → Gemini estimate.
 * Kartochkalarda (Home, Collection, CollectionDetail) faqat shu funksiyadan foydalaning.
 * @param {{ market_value_min?: number|null, market_value_max?: number|null, specification?: { estimated_market_value_usd?: number|null, ebay_items?: Array<{ price?: string|null }> } }} item - antique yoki snap.antique / payload bilan obyekt
 * @returns {number} USD
 */
export function getDisplayMarketValueUsd(item) {
  if (!item) return 0;
  const minNum = item.market_value_min != null ? Number(item.market_value_min) : 0;
  const maxNum = item.market_value_max != null ? Number(item.market_value_max) : 0;
  const geminiEstimate = item.specification?.estimated_market_value_usd != null
    ? Number(item.specification.estimated_market_value_usd)
    : null;
  const ebayItems = item.specification?.ebay_items ?? [];
  const ebayPrices = ebayItems
    .map((it) => (it?.price != null ? parseFloat(String(it.price)) : NaN))
    .filter((p) => !Number.isNaN(p) && p > 0);
  const ebayAvg = ebayPrices.length > 0
    ? ebayPrices.reduce((s, p) => s + p, 0) / ebayPrices.length
    : 0;
  const targetUsd = geminiEstimate ?? (ebayAvg || minNum || maxNum || 0);
  const closestEbayPrice = targetUsd > 0 && ebayPrices.length > 0
    ? ebayPrices.reduce((best, p) =>
        Math.abs(p - targetUsd) < Math.abs(best - targetUsd) ? p : best
      )
    : 0;
  if (closestEbayPrice > 0) return closestEbayPrice;
  if (ebayAvg > 0) return ebayAvg;
  if (minNum > 0) return minNum;
  return geminiEstimate ?? 0;
}
