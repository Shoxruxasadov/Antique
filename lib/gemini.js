/**
 * Gemini API orqali rasmni tahlil qilish — antikvar nomi, davr, condition, eBay qidiruv kalit so‘zlari.
 * .env: EXPO_PUBLIC_GEMINI_API_KEY
 */

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';

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
  if (!GEMINI_KEY) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set in .env');
  }
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
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
