/**
 * Backfill missing product.imageUrl from SOCO / Sociolla catalog.
 *
 * Usage: npx tsx scripts/backfill-product-images.ts [--limit=80]
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  fetchSocoBrandCatalog,
  pickSocoMatch,
  type SocoCatalogHit,
} from '../src/shared/services/soco-catalog.js';

const prisma = new PrismaClient();

const BRAND_ALIASES: Record<string, string[]> = {
  scarlett: ['Scarlett Whitening', 'Scarlett'],
  somethinc: ['SOMETHINC', 'Somethinc'],
  'true to skin': ['True To Skin', 'True to Skin'],
  'dear me beauty': ['Dear Me Beauty'],
  'the originote': ['The Originote'],
  'glad2glow': ['Glad2Glow', 'Glad 2 Glow'],
  npure: ['Npure', 'NPure'],
};

const CATALOG_API = 'https://catalog-api.soco.id/v3/products';
const headers = {
  Accept: 'application/json',
  Origin: 'https://review.soco.id',
  Referer: 'https://review.soco.id/',
  'User-Agent': 'AuraAI-CapstoneBot/1.0 (+product-image-backfill)',
};

function distinctiveTokens(name: string): string[] {
  return name
    .replace(/[^a-zA-Z0-9%+\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 4);
}

async function searchByNameRegex(pattern: string): Promise<SocoCatalogHit[]> {
  if (pattern.trim().length < 3) return [];
  try {
    const { data } = await axios.get<{ data?: Array<{
      _id?: string;
      name?: string;
      brand?: { name?: string };
      images?: Array<{ url?: string; is_cover?: boolean }>;
      url_sociolla?: string | null;
      slug?: string;
      description?: string | null;
      default_category?: { name?: string | null };
      parent_category?: { name?: string | null };
      review_stats?: { average_rating?: number; total_reviews?: number };
    }> }>(CATALOG_API, {
      params: {
        limit: 20,
        skip: 0,
        filter: JSON.stringify({ name: { $regex: pattern, $options: 'i' } }),
      },
      headers,
      timeout: 12_000,
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows
      .map((product) => {
        const brand = product.brand?.name?.trim();
        const name = product.name?.trim();
        if (!brand || !name) return null;
        const images = product.images ?? [];
        const imageUrl =
          (images.find((image) => image.is_cover)?.url ?? images[0]?.url)?.trim() || null;
        if (!imageUrl) return null;
        return {
          id: product._id || name,
          brand,
          name,
          imageUrl,
          description: '',
          category: product.parent_category?.name || product.default_category?.name || 'Skincare',
          subcategory: product.default_category?.name ?? null,
          rating: product.review_stats?.average_rating ?? null,
          reviewCount: product.review_stats?.total_reviews ?? 0,
          sourceUrl:
            product.url_sociolla ||
            (product.slug ? `https://review.soco.id/product/${product.slug}` : null),
        } satisfies SocoCatalogHit;
      })
      .filter((item): item is SocoCatalogHit => Boolean(item));
  } catch {
    return [];
  }
}

function brandsCompatible(seedBrand: string, catalogBrand: string): boolean {
  const seed = seedBrand.trim().toLowerCase();
  const catalog = catalogBrand.trim().toLowerCase();
  if (!seed || !catalog) return false;
  if (seed === catalog) return true;
  if (catalog.includes(seed) || seed.includes(catalog)) return true;
  const aliases = BRAND_ALIASES[seed] ?? [];
  return aliases.some((alias) => {
    const value = alias.toLowerCase();
    return catalog === value || catalog.includes(value) || value.includes(catalog);
  });
}

async function resolveImage(
  brand: string,
  name: string,
  brandCatalog: SocoCatalogHit[],
): Promise<SocoCatalogHit | null> {
  const sameBrandCatalog = brandCatalog.filter((item) => brandsCompatible(brand, item.brand));
  const sameBrand = pickSocoMatch(name, sameBrandCatalog);
  if (sameBrand?.imageUrl) return sameBrand;

  // Soft same-brand fallback: best name overlap even if below pickSocoMatch cutoff.
  const soft = sameBrandCatalog
    .map((item) => ({
      item,
      score: Math.max(
        // inline light score without importing again
        item.name.toLowerCase().includes(name.toLowerCase().slice(0, 12)) ? 0.5 : 0,
      ),
    }))
    .concat(
      sameBrandCatalog.map((item) => {
        const q = name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
        const c = item.name.toLowerCase();
        const hit = q.filter((token) => c.includes(token)).length;
        return { item, score: q.length ? hit / q.length : 0 };
      }),
    )
    .sort((left, right) => right.score - left.score)[0];
  if (soft && soft.score >= 0.34 && soft.item.imageUrl) return soft.item;

  for (const token of distinctiveTokens(name)) {
    const regexHits = (await searchByNameRegex(token)).filter((item) =>
      brandsCompatible(brand, item.brand),
    );
    const match = pickSocoMatch(name, regexHits);
    if (match?.imageUrl) return match;
    const softRegex = regexHits
      .map((item) => {
        const q = name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
        const c = item.name.toLowerCase();
        const hit = q.filter((token) => c.includes(token)).length;
        return { item, score: q.length ? hit / q.length : 0 };
      })
      .sort((left, right) => right.score - left.score)[0];
    if (softRegex && softRegex.score >= 0.4 && softRegex.item.imageUrl) return softRegex.item;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return null;
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
    select: { id: true, brand: true, name: true },
    take: Number.isFinite(limit) ? limit : 200,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Missing images: ${products.length}`);
  if (products.length === 0) return;

  const catalogs = new Map<string, SocoCatalogHit[]>();
  const brands = [...new Set(products.map((product) => product.brand.trim()).filter(Boolean))];

  for (const brand of brands) {
    const aliases = BRAND_ALIASES[brand.toLowerCase()] ?? [brand];
    const merged: SocoCatalogHit[] = [];
    const seen = new Set<string>();
    for (const alias of aliases) {
      const hits = await fetchSocoBrandCatalog(alias, 60);
      for (const hit of hits) {
        if (seen.has(hit.id)) continue;
        seen.add(hit.id);
        merged.push(hit);
      }
    }
    catalogs.set(brand.toLowerCase(), merged);
    console.log(`brand=${brand} hits=${merged.length}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  let updated = 0;
  let missed = 0;

  for (const product of products) {
    const catalog = catalogs.get(product.brand.trim().toLowerCase()) ?? [];
    const match = await resolveImage(product.brand, product.name, catalog);
    if (!match?.imageUrl) {
      missed += 1;
      console.log(`MISS ${product.brand} | ${product.name}`);
      continue;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: match.imageUrl,
        ...(match.sourceUrl ? { sourceUrl: match.sourceUrl } : {}),
      },
    });
    updated += 1;
    console.log(`OK  ${product.brand} | ${product.name} <= ${match.brand}`);
  }

  console.log(JSON.stringify({ updated, missed, scanned: products.length }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
