/**
 * eBay orqali o‘xshash buyumlar narxi, rasmlari va havolalari.
 * Supabase Edge Function "ebay-search" chaqiriladi (kalitlar get-api-keys dan olinadi).
 */

import { supabase, isSupabaseConfigured } from './supabase';

const defaultEbayResult = () => ({
  market_value_min: 0,
  market_value_max: 0,
  avg_growth_percentage: 0,
  image_urls: [],
  ebay_links: [],
  ebay_items: [],
});

/**
 * Kalit so‘zlar bo‘yicha narx oralig‘i, eBay rasmlari, havolalari va itemlar.
 * @param {string[]|string} keywords - Gemini’dan kelgan search_keywords yoki qidiruv matni
 * @returns {Promise<{ market_value_min: number, market_value_max: number, avg_growth_percentage: number, image_urls: string[], ebay_links: string[], ebay_items: Array<{ title: string, price: string|null, currency: string, itemWebUrl: string, imageUrl: string|null }> }>}
 */
const MAX_QUERY_WORDS = 5;

export async function fetchMarketPricesFromEbay(keywords = []) {
  const words = Array.isArray(keywords)
    ? keywords.slice(0, MAX_QUERY_WORDS)
    : String(keywords).split(/\s+/).slice(0, MAX_QUERY_WORDS);
  const query = words.join(' ').trim();
  if (!query) return defaultEbayResult();

  if (isSupabaseConfigured() && supabase) {
    // Har doim query ni terminalda ko‘rsatamiz
    console.log('[eBay search] query:', query);
    try {
      const { data, error } = await supabase.functions.invoke('ebay-search', {
        body: { keywords: query, limit: 20 },
      });
      if (error) {
        console.log('[eBay search] ERROR (invoke):', error);
        if (data?.error) console.log('[eBay search] server message:', data.error);
        throw error;
      }
      if (data?.error) {
        console.log('[eBay search] ERROR (from function):', data.error, 'data:', JSON.stringify(data, null, 2));
        throw new Error(data.error);
      }
      // eBay dan olingan itemlar — terminalda ko‘rinadi
      const items = Array.isArray(data?.ebay_items) ? data.ebay_items : [];
      console.log('[eBay search] result (items count):', items.length);
      items.forEach((item, i) => {
        console.log(`[eBay search] item ${i + 1}:`, item?.title ?? '—', '| price:', item?.price ?? '—', '| url:', item?.itemWebUrl ?? '—');
      });
      console.log('[eBay search] full result:', JSON.stringify(data, null, 2));
      return {
        market_value_min: Number(data?.market_value_min) ?? 0,
        market_value_max: Number(data?.market_value_max) ?? 0,
        avg_growth_percentage: Number(data?.avg_growth_percentage) ?? 0.05,
        image_urls: Array.isArray(data?.image_urls) ? data.image_urls : [],
        ebay_links: Array.isArray(data?.ebay_links) ? data.ebay_links : [],
        ebay_items: Array.isArray(data?.ebay_items) ? data.ebay_items : [],
      };
    } catch (e) {
      console.warn('[eBay search] failed, using mock:', e?.message);
    }
  }

  const mockMin = 50 + (query.length % 150);
  const mockMax = mockMin + 80 + (query.length % 120);
  return {
    market_value_min: mockMin,
    market_value_max: mockMax,
    avg_growth_percentage: 0.05 + (query.length % 10) / 100,
    image_urls: [],
    ebay_links: [],
    ebay_items: [],
  };
}

/**
 * Antique obyektidan eBay qidiruv uchun qisqa kalit so‘z (3–5 so‘z) yasaydi.
 * @param {{ name?: string, category?: string[], origin_country?: string }} antique
 * @returns {string}
 */
export function buildEbaySearchQueryFromAntique(antique) {
  if (!antique) return '';
  const name = (antique.name || '').trim();
  const category = Array.isArray(antique.category) ? antique.category[0] : antique.category;
  const origin = (antique.origin_country || '').trim();
  const parts = [name, category, origin].filter(Boolean);
  return parts.slice(0, 5).join(' ').replace(/\s+/g, ' ').trim();
}
