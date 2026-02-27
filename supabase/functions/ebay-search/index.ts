// Supabase Edge Function: eBay Browse API orqali qidiruv (narx, rasm, link).
// Kalitlar faqat get-api-keys dan (SUPABASE_URL avtomatik). Hech qanday secret kerak emas.
// Ixtiyoriy: EBAY_SANDBOX=true
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SANDBOX = Deno.env.get("EBAY_SANDBOX") !== "false";
const BASE = SANDBOX
  ? "https://api.sandbox.ebay.com"
  : "https://api.ebay.com";

interface TokenResponse {
  access_token: string;
  expires_in?: number;
}

interface ApiKeysResponse {
  geminiApiKey?: string;
  ebayAppId?: string;
  ebayCertId?: string;
  ebayDevId?: string;
  success?: boolean;
}

interface ItemSummary {
  itemId?: string;
  itemWebUrl?: string;
  price?: { value?: string; currency?: string };
  image?: { imageUrl?: string };
  additionalImages?: { imageUrl?: string }[];
  title?: string;
}

interface SearchResponse {
  itemSummaries?: ItemSummary[];
  total?: number;
}

async function getEbayCredentials(): Promise<{ appId: string; certId: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl) throw new Error("SUPABASE_URL not set");
  const headers: Record<string, string> = {};
  if (anonKey) headers["Authorization"] = `Bearer ${anonKey}`;
  const r = await fetch(`${supabaseUrl}/functions/v1/get-api-keys`, { headers });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`get-api-keys failed: ${r.status} ${body}`);
  }
  const data = (await r.json()) as ApiKeysResponse;
  if (!data?.success || !data?.ebayAppId || !data?.ebayCertId) {
    throw new Error("get-api-keys did not return ebayAppId/ebayCertId");
  }
  return { appId: data.ebayAppId, certId: data.ebayCertId };
}

async function getEbayToken(): Promise<string> {
  const { appId, certId } = await getEbayCredentials();
  const credentials = btoa(`${appId}:${certId}`);
  const scope = "https://api.ebay.com/oauth/api_scope";
  const res = await fetch(`${BASE}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

async function searchEbay(token: string, q: string, limit = 20): Promise<SearchResponse> {
  const url = new URL(`${BASE}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay search failed: ${res.status} ${text}`);
  }
  return (await res.json()) as SearchResponse;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }
  try {
    const { q, keywords, limit = 20 } = (await req.json().catch(() => ({}))) as {
      q?: string;
      keywords?: string[] | string;
      limit?: number;
    };
    const query = q ?? (Array.isArray(keywords) ? keywords.join(" ") : String(keywords ?? ""));
    if (!query.trim()) {
      return json(
        { market_value_min: 0, market_value_max: 0, image_urls: [], ebay_links: [] },
        400
      );
    }
    const token = await getEbayToken();
    const data = await searchEbay(token, query.trim(), Math.min(limit, 50));
    const items = data.itemSummaries ?? [];
    const image_urls: string[] = [];
    const ebay_links: string[] = [];
    const prices: number[] = [];
    for (const it of items) {
      if (it.itemWebUrl) ebay_links.push(it.itemWebUrl);
      const img = it.image?.imageUrl ?? it.additionalImages?.[0]?.imageUrl;
      if (img) image_urls.push(img);
      const p = it.price?.value;
      if (p) {
        const num = parseFloat(p);
        if (!Number.isNaN(num)) prices.push(num);
      }
    }
    const market_value_min = prices.length ? Math.min(...prices) : 0;
    const market_value_max = prices.length ? Math.max(...prices) : 0;
    const ebay_items = items
      .filter((it) => it.itemWebUrl)
      .map((it) => ({
        title: it.title ?? "",
        price: it.price?.value ?? null,
        currency: it.price?.currency ?? "USD",
        itemWebUrl: it.itemWebUrl ?? "",
        imageUrl: it.image?.imageUrl ?? it.additionalImages?.[0]?.imageUrl ?? null,
      }));
    return json({
      market_value_min,
      market_value_max,
      avg_growth_percentage: 0.05,
      image_urls,
      ebay_links,
      ebay_items,
    });
  } catch (e) {
    console.error("ebay-search error:", e);
    return json(
      { error: e instanceof Error ? e.message : "eBay search failed" },
      500,
      true
    );
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

function json(body: unknown, status = 200, isError = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
