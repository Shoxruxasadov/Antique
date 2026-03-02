/**
 * Gemini API orqali rasmni tahlil qilish va chat.
 * API kalit Supabase Edge Function orqali olinadi:
 *   GET https://iqxltjnjatrsbbxvaxsh.supabase.co/functions/v1/get-api-keys
 *   Response: { geminiApiKey, ebayAppId, ebayCertId, ebayDevId, success: true }
 */

const MODEL = 'gemini-2.5-flash';

const API_KEYS_URL = 'https://iqxltjnjatrsbbxvaxsh.supabase.co/functions/v1/get-api-keys';
const KEY_FETCH_TIMEOUT_MS = 20000;
const CHAT_FETCH_TIMEOUT_MS = 55000;

let cachedGeminiKey = null;
let keyFetchPromise = null;

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
}

/**
 * Gemini API kalitini Supabase Edge Function dan olish (cache bilan).
 * @returns {Promise<string>}
 */
async function getGeminiApiKey() {
  if (cachedGeminiKey) return cachedGeminiKey;
  if (keyFetchPromise) return keyFetchPromise;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  keyFetchPromise = (async () => {
    const res = await fetchWithTimeout(
      API_KEYS_URL,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      },
      KEY_FETCH_TIMEOUT_MS
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.message || data?.error || `get-api-keys: ${res.status}`;
      throw new Error(err);
    }
    if (!data?.success || !data?.geminiApiKey) {
      throw new Error('Gemini API key not returned from server');
    }
    cachedGeminiKey = data.geminiApiKey;
    return cachedGeminiKey;
  })();
  try {
    return await keyFetchPromise;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Timeout: server did not respond in time');
    throw e;
  } finally {
    keyFetchPromise = null;
  }
}

const PROMPT = `You are an expert antique appraiser. Analyze this image.

First decide: Is this object likely a genuine antique (at least ~50 years old, collectible, with historical/value interest)? Modern reproductions, generic new items, or non-antique objects are NOT antiques.

Return ONLY a valid JSON object (no markdown, no code block) with these exact keys:
- is_antique: boolean (true only if the object appears to be a real antique; false for modern items, reproductions, or unclear)
- not_antique_reason: string (required if is_antique is false: short reason in 1 sentence, e.g. "Appears to be a modern reproduction")
- name: string (short title, e.g. "Victorian Gold French Trinket Box")
- description: string (2-3 sentences, rich description for the Details tab)
- origin_country: string (e.g. "France")
- period_start_year: number (e.g. 1800)
- period_end_year: number (e.g. 1900)
- estimated_age_years: number
- overall_condition_summary: string (e.g. "Good", "Excellent")
- condition_grade: string (e.g. "B+", "A")
- condition_description: string (1-2 sentences)
- category: array of strings (e.g. ["Jewelry Box", "Trinket"])
- search_keywords: array of 5-10 English keywords for eBay (e.g. ["victorian", "gold", "trinket box"])
- estimated_market_value_usd: number (single estimated current market value in USD, e.g. 500)
- estimated_market_value_low_usd: number (estimated low end of market value in USD, e.g. 300)
- estimated_market_value_high_usd: number (estimated high end of market value in USD, e.g. 800; must be >= low)
- specification: object with optional keys (for Details tab): case_material (e.g. "Gilt Metal"), glass_type (e.g. "Amber-Tinted Beveled Glass"), construction (e.g. "Hand-crafted Filigree Work"), era (e.g. "Late 19th – Early 20th Century"), style (e.g. "Victorian/European Decorative Arts"), dimensions (e.g. "Approx. 12-15 cm width"). Omit keys you cannot infer.
- origin_provenance: string (2-3 sentences about where and how the item was likely produced, sold, or used; for the Origin & Provenance section)
- mechanical_function_status: string or "N/A"
- mechanical_function_notes: string or ""
- case_condition_status: string or "N/A"
- case_condition_notes: string or ""
- dial_hands_condition_status: string or "N/A"
- dial_hands_condition_notes: string or ""
- crystal_condition_status: string or "N/A"
- crystal_condition_notes: string or ""`;

const LOCALE_TO_LANGUAGE = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-Hans': 'Chinese',
  'zh-Hant': 'Chinese',
  ar: 'Arabic',
  ru: 'Russian',
  nl: 'Dutch',
  tr: 'Turkish',
  pl: 'Polish',
  sv: 'Swedish',
  th: 'Thai',
  he: 'Hebrew',
  hi: 'Hindi',
  uz: 'Uzbek',
};

function getAnalysisPrompt(locale) {
  const lang = LOCALE_TO_LANGUAGE[locale] || 'English';
  return `${PROMPT}\n\nIMPORTANT — Output language: Write all text/string fields in ${lang}. That includes: name, description, not_antique_reason, overall_condition_summary, condition_description, all specification subfields (case_material, glass_type, construction, era, style, dimensions), origin_provenance, and all *_notes and *_status fields. Keep only search_keywords in English (for eBay search).`;
}

/**
 * @param {string} base64Image - base64 (prefix siz)
 * @param {string} [mimeType] - 'image/jpeg' | 'image/png'
 * @param {string} [locale] - app locale (e.g. 'en', 'es', 'uz') — analysis text will be in that language
 * @returns {Promise<Object>} - { name, description, origin_country, period_start_year, ... }
 */
export async function analyzeAntiqueImage(base64Image, mimeType = 'image/jpeg', locale = 'en') {
  const key = await getGeminiApiKey();
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const promptText = getAnalysisPrompt(locale);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: cleanBase64 } },
          { text: promptText },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Gemini API error: ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error('Gemini response was not valid JSON');
  }
}

const ASSISTANT_SYSTEM = `LANGUAGE (highest priority): Always respond in the exact same language the user used in their last message. Detect the language from the user's text (e.g. English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, Russian, Dutch, Turkish, Polish, Swedish, Thai, Hebrew, Hindi, Uzbek, etc.). Never answer in a different language than the user wrote in. If the user writes in Spanish, reply only in Spanish. If they write in Russian, reply only in Russian. If they write in Uzbek, reply only in Uzbek. If the user sends only an image with no text, use the language from the previous messages in the conversation; if there is no prior text, default to English.

You are a helpful assistant for an antique collecting app. You may ONLY answer questions that are clearly related to antiques: identification, age, hallmarks, condition, restoration, collecting, antique items in images, valuation, history of objects, and similar topics. For any other question (general knowledge, weather, sports, politics, coding, etc.) do not answer—reply with a single short sentence in the user's language, e.g. "I can only help with questions about antiques and collectibles." or the equivalent in their language. Do not provide any other information or engage with off-topic questions.

Style and length (for on-topic answers only):
- Be precise and concise. Give only essential information, no filler.
- Maximum 20 lines per response. Prefer shorter. Use short numbered lists (1. 2. 3.) or short paragraphs.
- Do not repeat the question; go straight to the answer.
- CRITICAL: Do not use asterisks or Markdown. Never use * or ** or #. No bullet points with *, no bold with **. For lists use numbers (1. 2. 3.) or a dash with space (- ). Write only plain text, spaces, and line breaks. The app cannot render formatting, so asterisks will appear as ugly symbols.

Context: Keep full conversation context. Use the whole chat history to give relevant, consistent answers.`;

/**
 * Chat with Gemini: send conversation history + new user message (text and/or image), get model reply.
 * @param {Array<{ role: 'user'|'model', text?: string, imageBase64?: string, mimeType?: string }>} history - previous turns
 * @param {{ text?: string, imageBase64?: string, mimeType?: string }} newUser - new user message (text and/or image)
 * @returns {Promise<string>} - assistant reply text
 */
export async function chatWithGemini(history, newUser) {
  const key = await getGeminiApiKey();
  const contents = [];
  const systemPart = { text: ASSISTANT_SYSTEM };
  for (const msg of history) {
    if (msg.role === 'user') {
      const parts = [];
      if (msg.imageBase64) {
        const clean = (msg.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
        parts.push({ inline_data: { mime_type: msg.mimeType || 'image/jpeg', data: clean } });
      }
      if (msg.text) parts.push({ text: msg.text });
      if (parts.length) contents.push({ role: 'user', parts });
    } else if (msg.role === 'model' && msg.text) {
      contents.push({ role: 'model', parts: [{ text: msg.text }] });
    }
  }
  const newParts = [];
  if (newUser.imageBase64) {
    const clean = (newUser.imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
    newParts.push({ inline_data: { mime_type: newUser.mimeType || 'image/jpeg', data: clean } });
  }
  if (newUser.text) newParts.push({ text: newUser.text });
  if (newParts.length === 0) throw new Error('User message must have text or image');
  contents.push({ role: 'user', parts: newParts });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  let res;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [systemPart] },
          generationConfig: { temperature: 0.7 },
        }),
      },
      CHAT_FETCH_TIMEOUT_MS
    );
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Timeout: server did not respond in time');
    throw e;
  }
  const bodyText = await res.text();
  if (!res.ok) {
    let errMsg = bodyText || `Gemini API error: ${res.status}`;
    try {
      const errJson = JSON.parse(bodyText);
      errMsg = errJson?.error?.message || errJson?.error?.status || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (_) {
    throw new Error('Invalid response from Gemini');
  }
  const promptFeedback = data?.promptFeedback;
  if (promptFeedback?.blockReason) {
    throw new Error(`Request blocked: ${promptFeedback.blockReason}`);
  }
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new Error('Gemini returned no candidate. Try again.');
  }
  if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
    throw new Error(`Response ended: ${candidate.finishReason}`);
  }
  const text = candidate?.content?.parts?.[0]?.text;
  if (text != null && text !== '') return text;
  throw new Error('Gemini returned empty reply. Try again.');
}

const MARKET_SEARCH_PROMPT = (name, keywords) => `You are an antique valuation assistant. Using web search, find current market value information for this antique item.

Item name: ${name}
Search keywords: ${Array.isArray(keywords) ? keywords.join(', ') : keywords || name}

Return ONLY a valid JSON object (no markdown, no code block) with these keys:
- estimated_market_value_usd: number (single best estimate in USD, or 0 if not found)
- estimated_low_usd: number (low end of range in USD, or 0)
- estimated_high_usd: number (high end of range in USD, or 0)
- links: array of strings (up to 10 URLs where similar items are listed for sale, e.g. eBay, auction sites; empty array if none found)

Use web search to find recent listings, auction results, or dealer prices. If you cannot find any real data, use 0 for numbers and [] for links.`;

/**
 * eBay bo'sh qaytsa: Gemini + Google Search grounding orqali bozor bahosi va havolalarni olish.
 * @param {string} antiqueName - buyum nomi
 * @param {string[]|string} searchKeywords - qidiruv kalitlari
 * @returns {Promise<{ market_value_min: number, market_value_max: number, avg_growth_percentage: number, ebay_links: string[], ebay_items: Array<{ title: string, price: string|null, itemWebUrl: string, imageUrl: string|null }> }>}
 */
export async function fetchMarketEstimateWithWebSearch(antiqueName, searchKeywords = []) {
  const key = await getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const keywords = Array.isArray(searchKeywords) ? searchKeywords : [searchKeywords].filter(Boolean);
  const name = String(antiqueName || '').trim() || 'Antique item';
  const textPrompt = MARKET_SEARCH_PROMPT(name, keywords.length ? keywords : name);

  const body = {
    contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.2,
    },
  };

  let res;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 25000);
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Timeout: market search did not respond in time');
    throw e;
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return {
      market_value_min: 0,
      market_value_max: 0,
      avg_growth_percentage: 0,
      ebay_links: [],
      ebay_items: [],
    };
  }

  function extractJson(str) {
    const s = str.trim();
    const codeBlock = /^```(?:json)?\s*([\s\S]*?)```\s*$/m.exec(s);
    const raw = codeBlock ? codeBlock[1].trim() : s;
    return JSON.parse(raw);
  }

  try {
    const parsed = extractJson(text);
    const low = Number(parsed?.estimated_low_usd) || Number(parsed?.estimated_market_value_usd) || 0;
    const high = Number(parsed?.estimated_high_usd) || Number(parsed?.estimated_market_value_usd) || low || 0;
    const single = Number(parsed?.estimated_market_value_usd) || 0;
    const market_value_min = low || single || 0;
    const market_value_max = high || single || market_value_min || 0;
    const links = Array.isArray(parsed?.links) ? parsed.links.filter((u) => typeof u === 'string' && u.startsWith('http')) : [];

    const ebay_items = links.slice(0, 10).map((itemWebUrl) => ({
      title: name,
      price: null,
      currency: 'USD',
      itemWebUrl,
      imageUrl: null,
    }));

    return {
      market_value_min,
      market_value_max,
      avg_growth_percentage: 0.05,
      ebay_links: links,
      ebay_items,
    };
  } catch (_) {
    return {
      market_value_min: 0,
      market_value_max: 0,
      avg_growth_percentage: 0,
      ebay_links: [],
      ebay_items: [],
    };
  }
}
