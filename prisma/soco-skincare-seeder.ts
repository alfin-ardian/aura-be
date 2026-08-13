/**
 * SOCO Skincare product seeder for AURA.
 * Source: https://review.soco.id/category/2/skincare
 * API:    https://catalog-api.soco.id/v3/products
 *
 * Unlike the makeup seeder, skincare products are attached to a specific
 * affiliator (`ownerId`) so they show up in that partner's own catalog.
 */
import type { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { SKINCARE_TYPES, SKIN_CONCERNS } from '../src/constants/index.js';

const CATALOG_API = 'https://catalog-api.soco.id/v3/products';
const SKINCARE_CATEGORY_SQL_ID = 2;
const PAGE_SIZE = 20;
const DELAY_MS = 700;
const REVIEW_BASE = 'https://review.soco.id';

export interface SeedSkincareOptions {
  limit?: number;
  skip?: number;
  /** Delete existing skincare products owned by this affiliator first. */
  replace?: boolean;
  dryRun?: boolean;
  /** Affiliator email that will own the seeded catalog. */
  ownerEmail?: string;
}

export interface SeedSkincareResult {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  ownedSkincareProducts: number;
}

interface SocoImage {
  url: string;
  is_cover?: boolean;
}

interface SocoCategory {
  name: string;
  my_soco_sql_id?: number;
  slug?: string;
}

interface SocoProduct {
  _id: string;
  name: string;
  slug?: string;
  description?: string | null;
  brand?: { name: string; slug?: string } | null;
  images?: SocoImage[];
  categories?: SocoCategory[];
  default_category?: { name?: string; slug?: string } | null;
  review_stats?: { average_rating?: number; total_reviews?: number };
  url_sociolla?: string | null;
  min_price?: number | null;
  max_price?: number | null;
}

/**
 * Skincare routine step detection. Order matters: the most specific form wins,
 * so an "AHA/BHA toner" is a Toner rather than a generic Exfoliator.
 */
const STEP_RULES: Array<{ match: RegExp; type: string }> = [
  { match: /sunscreen|sun screen|\bspf\b|uv (protector|shield)|sun (cream|milk|stick|serum)/, type: SKINCARE_TYPES.SUNSCREEN },
  { match: /eye (cream|serum|gel|patch|mask)|eye care/, type: SKINCARE_TYPES.EYE_CARE },
  { match: /cleanser|cleansing|face wash|facial wash|micellar|makeup remover|cleansing (oil|balm|water|milk)|foam/, type: SKINCARE_TYPES.CLEANSER },
  { match: /toner|astringent|toning/, type: SKINCARE_TYPES.TONER },
  { match: /essence|ampoule|first treatment|emulsion/, type: SKINCARE_TYPES.ESSENCE },
  { match: /serum|booster|concentrate/, type: SKINCARE_TYPES.SERUM },
  { match: /sheet mask|sleeping (pack|mask)|clay mask|wash off mask|\bmask\b/, type: SKINCARE_TYPES.MASK },
  { match: /acne patch|blemish (spot|patch)|spot (treatment|gel|cream)|pimple/, type: SKINCARE_TYPES.ACNE_TREATMENT },
  { match: /exfoliat|peeling|\bpeel\b|scrub|\bpad(s)?\b/, type: SKINCARE_TYPES.EXFOLIATOR },
  { match: /moisturi[sz]er|day cream|night cream|gel cream|face cream|lotion|\bcream\b|\bgel\b|balm/, type: SKINCARE_TYPES.MOISTURIZER },
];

/** Concern detection so the rule engine can explain skincare matches. */
const CONCERN_RULES: Array<{ match: RegExp; concern: string }> = [
  { match: /acne|blemish|pimple|breakout|salicylic|tea tree|centella|cica/, concern: SKIN_CONCERNS.ACNE },
  { match: /oil control|oily|sebum|mattifying|matte|clay/, concern: SKIN_CONCERNS.OILY },
  { match: /hydrat|moistur|dry|hyaluronic|ceramide|barrier|nourish/, concern: SKIN_CONCERNS.DRY },
  { match: /sensitive|soothing|calming|redness|gentle|fragrance.?free/, concern: SKIN_CONCERNS.SENSITIVE },
  { match: /bright|glow|dull|vitamin c|niacinamide|radian|whitening/, concern: SKIN_CONCERNS.DULL },
  { match: /anti.?aging|wrinkle|firm|retinol|peptide|collagen|lifting/, concern: SKIN_CONCERNS.AGING },
  { match: /pore|blackhead|texture|refin/, concern: SKIN_CONCERNS.PORES },
  { match: /dark spot|hyperpigment|melasma|spot correct|arbutin|tranexamic/, concern: SKIN_CONCERNS.DARK_SPOTS },
];

/** Common actives worth surfacing in `ingredientNames`. */
const ACTIVE_RULES: Array<{ match: RegExp; name: string }> = [
  { match: /niacinamide/, name: 'Niacinamide' },
  { match: /hyaluronic/, name: 'Hyaluronic Acid' },
  { match: /salicylic|bha/, name: 'Salicylic Acid (BHA)' },
  { match: /glycolic|\baha\b/, name: 'Glycolic Acid (AHA)' },
  { match: /retinol|retinal|retinoid/, name: 'Retinol' },
  { match: /vitamin c|ascorb/, name: 'Vitamin C' },
  { match: /centella|cica|madecassoside/, name: 'Centella Asiatica' },
  { match: /ceramide/, name: 'Ceramide' },
  { match: /peptide/, name: 'Peptide' },
  { match: /tea tree/, name: 'Tea Tree' },
  { match: /aloe/, name: 'Aloe Vera' },
  { match: /squalane/, name: 'Squalane' },
  { match: /panthenol|\bb5\b/, name: 'Panthenol' },
  { match: /zinc/, name: 'Zinc' },
  { match: /arbutin/, name: 'Alpha Arbutin' },
  { match: /tranexamic/, name: 'Tranexamic Acid' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 180);
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

function coverImage(images: SocoImage[] | undefined): string | null {
  if (!images?.length) return null;
  return (images.find((img) => img.is_cover) ?? images[0])?.url ?? null;
}

function resolveSubcategory(product: SocoProduct): string {
  const cats = (product.categories ?? []).filter(
    (c) => c.name && !['skincare', 'skin care'].includes(c.name.toLowerCase()),
  );
  return product.default_category?.name ?? cats[cats.length - 1]?.name ?? 'Skincare';
}

/**
 * Product name + SOCO subcategory are authoritative; the marketing description
 * is only a fallback because it mentions many unrelated routine steps.
 */
function resolveStep(primary: string, fallback: string): string {
  for (const rule of STEP_RULES) {
    if (rule.match.test(primary)) return rule.type;
  }
  for (const rule of STEP_RULES) {
    if (rule.match.test(fallback)) return rule.type;
  }
  return SKINCARE_TYPES.MOISTURIZER;
}

function resolveConcerns(haystack: string): string[] {
  const found = CONCERN_RULES.filter((rule) => rule.match.test(haystack)).map((r) => r.concern);
  return found.length > 0 ? [...new Set(found)] : [SKIN_CONCERNS.DRY];
}

function resolveActives(haystack: string): string[] {
  return [...new Set(ACTIVE_RULES.filter((r) => r.match.test(haystack)).map((r) => r.name))];
}

function buildDescription(product: SocoProduct, step: string): string {
  const cleaned = stripHtml(product.description);
  if (cleaned.length >= 40) return cleaned.slice(0, 4000);

  const brand = product.brand?.name ?? 'Unknown';
  const rating = product.review_stats?.average_rating;
  const reviews = product.review_stats?.total_reviews;
  const meta = [
    rating != null ? `SOCO ${rating.toFixed(1)}★` : null,
    reviews != null ? `${reviews} reviews` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `${brand} ${product.name} — ${step} skincare from SOCO.${meta ? ` ${meta}.` : ''}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(skip: number, limit: number): Promise<SocoProduct[]> {
  const filter = JSON.stringify({ 'categories.my_soco_sql_id': SKINCARE_CATEGORY_SQL_ID });
  const response = await axios.get<{ success: boolean; data: SocoProduct[] }>(CATALOG_API, {
    params: { limit, skip, filter, sort: '-review_stats.total_reviews' },
    headers: {
      Accept: 'application/json',
      Origin: REVIEW_BASE,
      Referer: `${REVIEW_BASE}/category/2/skincare`,
      'User-Agent': 'AuraAI-CapstoneBot/1.0 (+educational; skincare-catalog-seeder)',
    },
    timeout: 30_000,
  });

  if (!response.data.success || !Array.isArray(response.data.data)) {
    throw new Error('Unexpected SOCO API response');
  }
  return response.data.data;
}

async function upsertProduct(
  prisma: PrismaClient,
  product: SocoProduct,
  ownerId: string,
  taxonomy: Map<string, string>,
): Promise<'created' | 'updated' | 'skipped'> {
  const brand = product.brand?.name?.trim();
  const name = product.name?.trim();
  if (!brand || !name) return 'skipped';

  const subcategory = resolveSubcategory(product);
  const descriptionText = stripHtml(product.description);
  const primary = `${name} ${subcategory}`.toLowerCase();
  const haystack = `${primary} ${descriptionText}`.toLowerCase();

  const step = resolveStep(primary, descriptionText.toLowerCase());
  const concerns = resolveConcerns(haystack);
  const actives = resolveActives(haystack);
  const rating = product.review_stats?.average_rating ?? null;
  const reviewCount = product.review_stats?.total_reviews ?? 0;

  const tags = [
    ...new Set([
      'Skincare',
      step,
      subcategory,
      ...concerns,
      ...actives,
      ...(product.categories ?? []).map((c) => c.name).filter(Boolean),
      'universal',
    ]),
  ];

  const benefits = [
    ...concerns.map((concern) => `Helps with ${concern}`),
    rating != null ? `SOCO rating ${rating.toFixed(1)}` : null,
    reviewCount > 0 ? `${reviewCount} reviews` : null,
  ].filter((value): value is string => Boolean(value));

  const sourceUrl = product.slug
    ? `${REVIEW_BASE}/product/${product.slug}`
    : (product.url_sociolla ?? `${REVIEW_BASE}/category/2/skincare`);

  const data = {
    socoId: product._id,
    ownerId,
    brand,
    name,
    slug: slugify(`soco-${brand}-${name}-${product._id.slice(-6)}`),
    description: buildDescription(product, step),
    imageUrl: coverImage(product.images),
    category: 'Skincare',
    subcategory: step,
    finish: null,
    undertoneMatch: 'universal',
    usage: 'Follow the brand packaging / official SOCO product page for the full routine.',
    benefits,
    tags,
    ingredientNames: actives,
    uses: concerns.map((concern) => `Routine step ${step} for ${concern} skin`),
    rating,
    reviewCount,
    minPrice: product.min_price ?? null,
    maxPrice: product.max_price ?? null,
    sourceUrl,
    affiliateUrl: product.url_sociolla ?? sourceUrl,
    isActive: true,
  };

  const existing = await prisma.product.findUnique({ where: { socoId: product._id } });
  const saved = existing
    ? await prisma.product.update({ where: { socoId: product._id }, data })
    : await prisma.product.create({ data });

  const stepId = taxonomy.get(step.toLowerCase());
  await prisma.productIngredient.deleteMany({ where: { productId: saved.id } });
  if (stepId) {
    await prisma.productIngredient.create({
      data: { productId: saved.id, ingredientId: stepId },
    });
  }

  return existing ? 'updated' : 'created';
}

/**
 * Seed / refresh the skincare catalog for one affiliator from SOCO.
 */
export async function seedSkincareFromSoco(
  prisma: PrismaClient,
  options: SeedSkincareOptions = {},
): Promise<SeedSkincareResult> {
  const limit = options.limit ?? 100;
  const skip = options.skip ?? 0;
  const replace = options.replace ?? false;
  const dryRun = options.dryRun ?? false;
  const ownerEmail = options.ownerEmail ?? 'affiliator@auraai.local';

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    throw new Error(`Affiliator ${ownerEmail} not found — run the base seed first`);
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeding skincare from SOCO (category 2) owner=${ownerEmail} limit=${limit} replace=${replace}`,
  );

  if (replace && !dryRun) {
    const owned = await prisma.product.findMany({
      where: { ownerId: owner.id, category: 'Skincare' },
      select: { id: true },
    });
    const ids = owned.map((row) => row.id);
    if (ids.length > 0) {
      await prisma.wishlist.deleteMany({ where: { productId: { in: ids } } });
      await prisma.productIngredient.deleteMany({ where: { productId: { in: ids } } });
      await prisma.recommendationProduct.deleteMany({ where: { productId: { in: ids } } });
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
      // eslint-disable-next-line no-console
      console.log(`Cleared ${ids.length} existing skincare products`);
    }
  }

  const taxonomyRows = await prisma.ingredient.findMany({ select: { id: true, name: true } });
  const taxonomy = new Map(taxonomyRows.map((row) => [row.name.toLowerCase(), row.id]));

  let fetched = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let cursor = skip;

  while (fetched < limit) {
    const pageLimit = Math.min(PAGE_SIZE, limit - fetched);
    // eslint-disable-next-line no-console
    console.log(`  fetching SOCO skincare page skip=${cursor} limit=${pageLimit}...`);
    const page = await fetchPage(cursor, pageLimit);
    if (page.length === 0) break;

    for (const product of page) {
      if (dryRun) {
        skipped += 1;
        continue;
      }
      const result = await upsertProduct(prisma, product, owner.id, taxonomy);
      if (result === 'created') created += 1;
      else if (result === 'updated') updated += 1;
      else skipped += 1;
    }

    fetched += page.length;
    cursor += page.length;
    if (page.length < pageLimit) break;
    await sleep(DELAY_MS);
  }

  const ownedSkincareProducts = await prisma.product.count({
    where: { ownerId: owner.id, category: 'Skincare', isActive: true },
  });

  return { fetched, created, updated, skipped, ownedSkincareProducts };
}
