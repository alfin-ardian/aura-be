import axios, { isAxiosError } from 'axios';
import { z } from 'zod';
import { appConfig } from '../../config/index.js';
import { AiServiceError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

const emptyToUndef = (value: unknown) =>
  value === null || value === '' ? undefined : value;

const optionalUrl = z.preprocess(
  emptyToUndef,
  z.string().max(4000).optional().nullable(),
);

const optionalText = z.preprocess(
  emptyToUndef,
  z.string().max(8000).optional().nullable(),
);

const optionalRating = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(5).optional().nullable());
const optionalCount = z.preprocess(emptyToUndef, z.coerce.number().int().min(0).optional().nullable());

const stringList = (maxItems: number, maxLen: number) =>
  z.preprocess((value) => {
    if (value == null || value === '') return [];
    const items = Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : typeof value === 'string'
        ? value
            .split(/[,;\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    return items.slice(0, maxItems).map((item) => item.slice(0, maxLen));
  }, z.array(z.string().min(1).max(maxLen)).max(maxItems));

export const researchedProductSchema = z.object({
  found: z.boolean().optional().default(true),
  brand: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  image: optionalUrl,
  description: z.string().min(1).max(8000),
  category: z.string().min(1).max(80).optional().default('Skincare'),
  subcategory: z.preprocess(emptyToUndef, z.string().max(120).optional().nullable()),
  ingredients: stringList(30, 80),
  uses: stringList(20, 200),
  reviewSummary: optionalText,
  rating: optionalRating,
  reviewCount: optionalCount,
  sources: stringList(15, 2000),
});

export type ResearchedProduct = z.infer<typeof researchedProductSchema>;

export interface IProductResearchClient {
  researchProduct(query: string): Promise<ResearchedProduct[]>;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function unwrapProductPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  if (input.product && typeof input.product === 'object') {
    return input.product as Record<string, unknown>;
  }
  if (input.data && typeof input.data === 'object' && input.name == null && input.brand == null) {
    return input.data as Record<string, unknown>;
  }
  return input;
}

export function normalizeResearchedProduct(raw: unknown, query: string): unknown {
  const input = unwrapProductPayload(raw);
  const fallbackName = query.trim().slice(0, 200) || 'Unknown product';
  const brandFromQuery = fallbackName.split(/\s+/)[0] || 'Unknown';
  const brand = asString(input.brand) ?? asString(input.brand_name) ?? brandFromQuery;
  const name = asString(input.name) ?? asString(input.product_name) ?? fallbackName;
  const imageValue = input.image ?? input.imageUrl ?? input.image_url;
  const image =
    asString(imageValue) ??
    (imageValue && typeof imageValue === 'object'
      ? asString((imageValue as Record<string, unknown>).url)
      : undefined);

  const foundRaw = input.found;
  const found = !(foundRaw === false || foundRaw === 'false' || foundRaw === 0);

  return {
    found,
    brand: brand.slice(0, 120),
    name: name.slice(0, 200),
    image: image?.slice(0, 4000) ?? null,
    description: (asString(input.description) ?? `Informasi produk untuk ${fallbackName}.`).slice(0, 8000),
    category: (asString(input.category)?.split('|')[0]?.trim() || 'Skincare').slice(0, 80),
    subcategory: asString(input.subcategory) ?? null,
    ingredients: input.ingredients ?? input.key_ingredients ?? [],
    uses: input.uses ?? input.benefits ?? [],
    reviewSummary: asString(input.reviewSummary) ?? asString(input.review_summary) ?? null,
    rating: emptyToUndef(input.rating ?? input.average_rating),
    reviewCount: emptyToUndef(input.reviewCount ?? input.review_count),
    sources: input.sources ?? [],
  };
}

const PLACEHOLDER_BRAND = /^(unknown|n\/?a|none|null|tidak diketahui|-)$/i;
const UNVERIFIED_COPY =
  /could not verify|couldn['’]t verify|could not find|couldn['’]t find|unable to (find|verify)|no (verifiable|identifiable|official)|appears unverified|not a (known|real)|tidak (dapat |bisa )?(menemukan|memverifikasi)|tidak terverifikasi/i;

export function isVerifiedResearchedProduct(product: ResearchedProduct, query: string): boolean {
  if (product.found === false) return false;
  if (PLACEHOLDER_BRAND.test(product.brand.trim())) return false;
  if (PLACEHOLDER_BRAND.test(product.subcategory ?? '')) return false;
  if (UNVERIFIED_COPY.test(product.description) || UNVERIFIED_COPY.test(product.reviewSummary ?? '')) {
    return false;
  }
  const hasFacts =
    product.ingredients.length > 0 || product.uses.length > 0 || Boolean(product.image);
  if (!hasFacts && product.name.trim().toLowerCase() === query.trim().toLowerCase()) {
    return false;
  }
  return true;
}

export function extractJsonValue(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const objStart = raw.indexOf('{');
  const arrStart = raw.indexOf('[');
  const start =
    objStart < 0 ? arrStart : arrStart < 0 ? objStart : Math.min(objStart, arrStart);
  if (start < 0) {
    throw new Error('No JSON in model output');
  }
  const end = raw.lastIndexOf(raw[start] === '[' ? ']' : '}');
  if (end <= start) {
    throw new Error('No JSON in model output');
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

export function extractJsonObject(text: string): unknown {
  return extractJsonValue(text);
}

export function collectResearchItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const input = raw as Record<string, unknown>;
    if (Array.isArray(input.products)) return input.products;
    if (Array.isArray(input.results)) return input.results;
    return [raw];
  }
  return [];
}

export function parseResearchedProducts(text: string, query: string): ResearchedProduct[] {
  const products: ResearchedProduct[] = [];
  for (const item of collectResearchItems(extractJsonValue(text))) {
    try {
      const parsed = researchedProductSchema.parse(normalizeResearchedProduct(item, query));
      if (isVerifiedResearchedProduct(parsed, query)) {
        products.push(parsed);
      }
    } catch {
      // Skip malformed items and keep the rest of the list.
    }
  }
  return products;
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  const chunks: string[] = [];
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') chunks.push(text);
    }
  }
  return chunks.join('\n').trim();
}

function buildPrompt(query: string): string {
  return `Research beauty / skincare / makeup products matching "${query}" from the public web.

Priority sources for the Indonesian market: official brand site, Sociolla/SOCO, Female Daily, Shopee/Tokopedia official stores, then other retailers.

Return ONLY a JSON object (no markdown) with this shape:
{
  "products": [
    {
      "found": true,
      "brand": "official brand spelling",
      "name": "full official product name (specific SKU)",
      "image": "direct https product image URL if available, else null",
      "description": "2-4 sentence factual product description",
      "category": "Skincare | Makeup | Body | Hair | Other",
      "subcategory": "e.g. Moisturizer, Serum, Sunscreen",
      "ingredients": ["key ingredients only"],
      "uses": ["what it is used for / claimed benefits, factual"],
      "reviewSummary": "Neutral summary of public user sentiment. Do NOT invent fake reviews or fake quotes.",
      "rating": 4.6,
      "reviewCount": 1200,
      "sources": ["https://official-or-retailer-or-review-site"]
    }
  ]
}

Rules:
- Return 3 to 8 distinct matching products when possible (best-known first). If the query is a specific SKU, put that product first and add close variants.
- Correct likely typos of well-known beauty brands. Example: "larazin" is Azarine Cosmetics. Use the official spelling.
- Never use brand "Unknown" and never write "could not verify" as a product description.
- If you truly cannot identify any beauty product, return {"products":[]}.
- Do not include price or stock.
- rating/reviewCount only if publicly reported; otherwise null / omit.
- sources must be real URLs you used.
- image must be a direct product photo URL when available.`;
}

export class OpenAiProductResearchClient implements IProductResearchClient {
  constructor(
    private readonly apiKey = appConfig.openai.apiKey,
    private readonly model = appConfig.openai.model,
    private readonly timeoutMs = appConfig.openai.timeoutMs,
  ) {}

  async researchProduct(query: string): Promise<ResearchedProduct[]> {
    if (!this.apiKey) {
      throw new AiServiceError('OPENAI_API_KEY is not configured');
    }

    const prompt = buildPrompt(query);
    const text =
      (await this.callResponses(prompt, 'web_search')) ??
      (await this.callResponses(prompt, 'web_search_preview')) ??
      (await this.callChatCompletions(prompt));

    try {
      return parseResearchedProducts(text, query);
    } catch (error) {
      logger.error('Failed to parse product research JSON', {
        error: error instanceof Error ? error.message : 'unknown',
        preview: text.slice(0, 400),
      });
      throw new AiServiceError('AI returned an invalid product payload');
    }
  }

  private async callResponses(
    prompt: string,
    toolType: 'web_search' | 'web_search_preview',
  ): Promise<string | null> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/responses',
        {
          model: this.model,
          tools: [{ type: toolType }],
          input: prompt,
        },
        {
          timeout: this.timeoutMs,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const text = extractOutputText(response.data);
      if (!text) {
        throw new AiServiceError('OpenAI responses API returned empty text');
      }
      logger.info('OpenAI product research completed', { toolType, model: this.model });
      return text;
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        logger.warn('OpenAI responses API failed', { toolType, status, model: this.model });
        if (status === 400 || status === 404 || status === 422) {
          return null;
        }
        const detail =
          typeof error.response?.data === 'object'
            ? JSON.stringify(error.response?.data)
            : error.message;
        throw new AiServiceError(detail || 'OpenAI responses API error', { status });
      }
      throw new AiServiceError('Failed to reach OpenAI');
    }
  }

  private async callChatCompletions(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You extract structured beauty product facts as a JSON list. Never invent fake user reviews. Reply with JSON only.',
            },
            { role: 'user', content: prompt },
          ],
        },
        {
          timeout: this.timeoutMs,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const text = response.data?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) {
        throw new AiServiceError('OpenAI chat completions returned empty text');
      }
      logger.info('OpenAI product research completed via chat completions', {
        model: this.model,
      });
      return text;
    } catch (error) {
      if (error instanceof AiServiceError) throw error;
      if (isAxiosError(error)) {
        const status = error.response?.status;
        const detail =
          typeof error.response?.data === 'object'
            ? JSON.stringify(error.response?.data)
            : error.message;
        throw new AiServiceError(detail || 'OpenAI chat completions error', { status });
      }
      throw new AiServiceError('Failed to reach OpenAI');
    }
  }
}
