import axios from 'axios';
import { logger } from '../utils/logger.js';

const CATALOG_API = 'https://catalog-api.soco.id/v3/products';
const REVIEW_BASE = 'https://review.soco.id';
const TIMEOUT_MS = 12_000;

export interface SocoCatalogHit {
  id: string;
  brand: string;
  name: string;
  imageUrl: string | null;
  description: string;
  category: string;
  subcategory: string | null;
  rating: number | null;
  reviewCount: number;
  sourceUrl: string | null;
}

interface SocoImage {
  url?: string;
  is_cover?: boolean;
}

interface SocoProduct {
  _id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  brand?: { name?: string | null } | null;
  images?: SocoImage[];
  default_category?: { name?: string | null } | null;
  parent_category?: { name?: string | null } | null;
  categories?: Array<{ name?: string | null }>;
  review_stats?: { average_rating?: number; total_reviews?: number };
  url_sociolla?: string | null;
}

const socoHeaders = {
  Accept: 'application/json',
  Origin: REVIEW_BASE,
  Referer: `${REVIEW_BASE}/`,
  'User-Agent': 'AuraAI-CapstoneBot/1.0 (+product-image-lookup)',
};

export function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .replace(/spf\s*\d+/g, ' ')
    .replace(/pa\++/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalizeProductName(value)
    .split(' ')
    .filter((token) => token.length > 2);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = current;
    }
  }
  return row[b.length]!;
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const longest = Math.max(a.length, b.length);
  if (longest < 5 || Math.abs(a.length - b.length) > 2) return false;
  return levenshtein(a, b) / longest <= 0.25;
}

export function scoreProductName(query: string, candidate: string): number {
  const q = normalizeProductName(query);
  const c = normalizeProductName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.93;
  const queryTokens = tokens(query);
  const candidateTokens = tokens(candidate);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const overlap = queryTokens.filter((token) =>
    candidateTokens.some((item) => tokensMatch(token, item)),
  ).length;
  return overlap / Math.max(queryTokens.length, candidateTokens.length);
}

export function pickSocoMatch(name: string, catalog: SocoCatalogHit[]): SocoCatalogHit | null {
  const ranked = catalog
    .map((item) => ({ item, score: scoreProductName(name, item.name) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best || best.score < 0.48) return null;
  return best.item;
}

function coverImage(images: SocoImage[] | undefined): string | null {
  if (!images?.length) return null;
  const url = (images.find((image) => image.is_cover) ?? images[0])?.url?.trim();
  return url || null;
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function mapHit(product: SocoProduct): SocoCatalogHit | null {
  const brand = product.brand?.name?.trim();
  const name = product.name?.trim();
  if (!brand || !name) return null;
  const subcategory = product.default_category?.name?.trim() || null;
  const parent = product.parent_category?.name?.trim();
  const category = parent || subcategory || 'Skincare';
  return {
    id: product._id || name,
    brand,
    name,
    imageUrl: coverImage(product.images),
    description: stripHtml(product.description).slice(0, 8000),
    category,
    subcategory,
    rating: product.review_stats?.average_rating ?? null,
    reviewCount: product.review_stats?.total_reviews ?? 0,
    sourceUrl: product.url_sociolla || (product.slug ? `${REVIEW_BASE}/product/${product.slug}` : null),
  };
}

async function listByBrand(brand: string, limit = 40): Promise<SocoCatalogHit[]> {
  const response = await axios.get<{ success?: boolean; data?: SocoProduct[] }>(CATALOG_API, {
    params: {
      limit,
      skip: 0,
      filter: JSON.stringify({ 'brand.name': brand }),
      sort: '-review_stats.total_reviews',
    },
    headers: socoHeaders,
    timeout: TIMEOUT_MS,
  });
  if (!Array.isArray(response.data?.data)) return [];
  return response.data.data.map(mapHit).filter((item): item is SocoCatalogHit => Boolean(item));
}

/** Public brand listing for seed / backfill scripts. */
export async function fetchSocoBrandCatalog(brand: string, limit = 60): Promise<SocoCatalogHit[]> {
  const variants = [
    brand,
    brand.replace(/\s+/g, ''),
    brand.toUpperCase(),
    brand.toLowerCase(),
    // Common Sociolla spellings
    brand.replace(/Somethinc/i, 'SOMETHINC'),
    brand.replace(/True to Skin/i, 'True To Skin'),
    brand.replace(/Dear Me Beauty/i, 'Dear Me Beauty'),
  ];
  const seen = new Set<string>();
  const hits: SocoCatalogHit[] = [];
  for (const variant of [...new Set(variants.map((v) => v.trim()).filter(Boolean))]) {
    try {
      for (const hit of await listByBrand(variant, limit)) {
        if (seen.has(hit.id)) continue;
        seen.add(hit.id);
        hits.push(hit);
      }
    } catch {
      // try next variant
    }
  }
  if (hits.length === 0) {
    return searchSocoCatalog(brand, limit);
  }
  return hits.filter((item) => item.imageUrl);
}

export async function searchSocoCatalog(query: string, limit = 12): Promise<SocoCatalogHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    let hits = await listByBrand(q, 40);
    if (hits.length === 0) {
      const firstWord = q.split(/\s+/)[0] ?? q;
      if (firstWord.toLowerCase() !== q.toLowerCase()) {
        hits = await listByBrand(firstWord, 40);
      }
    }
    if (hits.length === 0) return [];

    const hasProductHint = q.includes(' ');
    if (hasProductHint) {
      hits = hits
        .map((item) => ({
          item,
          score: Math.max(
            scoreProductName(q, item.name),
            scoreProductName(q, `${item.brand} ${item.name}`),
          ),
        }))
        .filter((entry) => entry.score >= 0.4)
        .sort((left, right) => right.score - left.score)
        .map((entry) => entry.item);
    }

    return hits.filter((item) => item.imageUrl).slice(0, limit);
  } catch (error) {
    logger.warn('SOCO catalog search failed', {
      query: q,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return [];
  }
}

export async function attachSocoImages<T extends { brand: string; name: string; image?: string | null }>(
  products: T[],
): Promise<T[]> {
  const missing = products.filter((product) => !product.image);
  if (missing.length === 0) return products;

  const brands = [...new Set(missing.map((product) => product.brand.trim()).filter(Boolean))];
  const catalogs = new Map<string, SocoCatalogHit[]>();
  await Promise.all(
    brands.map(async (brand) => {
      try {
        catalogs.set(brand.toLowerCase(), await listByBrand(brand, 40));
      } catch (error) {
        logger.warn('SOCO image lookup failed', {
          brand,
          error: error instanceof Error ? error.message : 'unknown',
        });
        catalogs.set(brand.toLowerCase(), []);
      }
    }),
  );

  return products.map((product) => {
    if (product.image) return product;
    const catalog = catalogs.get(product.brand.trim().toLowerCase()) ?? [];
    const match = pickSocoMatch(product.name, catalog);
    if (!match?.imageUrl) return product;
    return { ...product, image: match.imageUrl };
  });
}
