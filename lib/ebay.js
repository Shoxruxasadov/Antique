/**
 * eBay orqali o‘xshash buyumlar narxi, rasmlari va havolalari.
 * Supabase Edge Function "ebay-search" chaqiriladi (EBAY_APP_ID, EBAY_CERT_ID secrets).
 */

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Kalit so‘zlar bo‘yicha narx oralig‘i, eBay rasmlari va mahsulot havolalari.
 * @param {string[]|string} keywords - Gemini’dan kelgan search_keywords
 * @returns {Promise<{ market_value_min: number, market_value_max: number, avg_growth_percentage: number, image_urls: string[], ebay_links: string[] }>}
 */
export async function fetchMarketPricesFromEbay(keywords = []) {
  const query = (Array.isArray(keywords) ? keywords : [keywords]).join(' ').trim();
  if (!query) {
    return {
      market_value_min: 0,
      market_value_max: 0,
      avg_growth_percentage: 0,
      image_urls: [],
      ebay_links: [],
    };
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ebay-search', {
        body: { keywords: query, limit: 20 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        market_value_min: Number(data?.market_value_min) ?? 0,
        market_value_max: Number(data?.market_value_max) ?? 0,
        avg_growth_percentage: Number(data?.avg_growth_percentage) ?? 0.05,
        image_urls: Array.isArray(data?.image_urls) ? data.image_urls : [],
        ebay_links: Array.isArray(data?.ebay_links) ? data.ebay_links : [],
      };
    } catch (e) {
      console.warn('eBay Edge Function failed, using mock:', e?.message);
    }
  }

  // Mock: Edge Function yo‘q yoki xato
  const mockMin = 50 + (query.length % 150);
  const mockMax = mockMin + 80 + (query.length % 120);
  const mockGrowth = 0.05 + (query.length % 10) / 100;
  return {
    market_value_min: mockMin,
    market_value_max: mockMax,
    avg_growth_percentage: Math.min(0.2, mockGrowth),
    image_urls: [],
    ebay_links: [],
  };
}
