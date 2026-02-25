/**
 * eBay orqali o‘xshash buyumlar narxi va rasmlari.
 *
 * PRODUCTION: Haqiqiy narx va rasmlar uchun eBay Browse API kerak:
 * - Backend’da OAuth yoki Application access token orqali
 *   GET https://api.ebay.com/buy/browse/v1/item_summary/search?q=...&limit=20
 * - Javobdan: item_summaries[].price.value, item_summaries[].image?.imageUrl
 * - image_urls[] ni shu URL’lar bilan to‘ldiring, market_value_min/max ni real sotuvlar bo‘yicha hisoblang.
 * .env: backend endpoint yoki EXPO_PUBLIC_EBAY_* (token client’da saqlanmasin).
 */

/**
 * Kalit so‘zlar bo‘yicha narx oralig‘i va eBay rasmlari (production’da haqiqiy API).
 * @param {string[]} keywords - Gemini’dan kelgan search_keywords
 * @returns {Promise<{ market_value_min: number, market_value_max: number, avg_growth_percentage: number, image_urls: string[] }>}
 */
export async function fetchMarketPricesFromEbay(keywords = []) {
  const query = (Array.isArray(keywords) ? keywords : [keywords]).join(' ');
  if (!query.trim()) {
    return { market_value_min: 0, market_value_max: 0, avg_growth_percentage: 0, image_urls: [] };
  }
  // Mock: production’da yuqoridagi eBay Browse API ulaning
  const mockMin = 50 + (query.length % 150);
  const mockMax = mockMin + 80 + (query.length % 120);
  const mockGrowth = 0.05 + (query.length % 10) / 100;
  const image_urls = [];
  return {
    market_value_min: mockMin,
    market_value_max: mockMax,
    avg_growth_percentage: Math.min(0.2, mockGrowth),
    image_urls,
  };
}
