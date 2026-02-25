/**
 * Gemini API orqali rasmni tahlil qilish va chat.
 * API kalit Supabase Edge Function orqali olinadi: get-api-keys → { geminiApiKey, success }.
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

/**
 * @param {string} base64Image - base64 (prefix siz)
 * @param {string} [mimeType] - 'image/jpeg' | 'image/png'
 * @returns {Promise<Object>} - { name, description, origin_country, period_start_year, ... }
 */
export async function analyzeAntiqueImage(base64Image, mimeType = 'image/jpeg') {
  const key = await getGeminiApiKey();
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: cleanBase64 } },
          { text: PROMPT },
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

const ASSISTANT_SYSTEM = `You are a helpful assistant for an antique collecting app. You may ONLY answer questions that are clearly related to antiques: identification, age, hallmarks, condition, restoration, collecting, antique items in images, valuation, history of objects, and similar topics. For any other question (general knowledge, weather, sports, politics, coding, etc.) do not answer. Reply with a single short sentence in the user's language, e.g. "I can only help with questions about antiques and collectibles." or the equivalent in their language. Do not provide any other information or engage with off-topic questions.

Style and length (for on-topic answers only):
- Be precise and concise (aniq va lo'nda). Give only essential information, no filler.
- Maximum 20 lines per response. Prefer shorter. Use short numbered lists (1. 2. 3.) or short paragraphs.
- Do not repeat the question; go straight to the answer.
- CRITICAL: Do not use asterisks or Markdown. Never use * or ** or #. No bullet points with *, no bold with **. For lists use numbers (1. 2. 3.) or a dash with space (- ). Write only plain text, spaces, and line breaks. The app cannot render formatting, so asterisks will appear as ugly symbols.

Language and context:
- Always reply in the same language the user writes in. If the user writes in Uzbek, reply in Uzbek; if in English, reply in English; if in Russian, reply in Russian; and so on.
- Keep full conversation context. Use the whole chat history to give relevant, consistent answers.
- If the user sends only an image with no text (or an empty caption), infer the response language from the rest of the conversation: use the language that the user and you have been using in previous messages. If there is no prior language (first message is an image), reply in English by default.`;

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
