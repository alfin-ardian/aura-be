/**
 * Fill missing product images via:
 * 1) Brand Shopify products.json (The Originote, …)
 * 2) Curated Beautyhaul / known CDN URLs
 * 3) Soft rename of outdated seed names to real catalog products
 *
 * Usage: npx tsx scripts/fill-missing-images.ts
 */
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { scoreProductName } from '../src/shared/services/soco-catalog.js';

const prisma = new PrismaClient();

/** Seed names that do not exist on retailer catalogs → real product names. */
const RENAME_MAP: Record<string, { brand: string; name: string }> = {
  'the originote::ceramides barrier moisturizer': {
    brand: 'The Originote',
    name: 'Hyalucera Moisturizer',
  },
};

const SHOPIFY_BRANDS: Record<string, string> = {
  'the originote': 'https://www.theoriginote.com/products.json',
};

/** Beautyhaul product detail slugs for brands missing from SOCO. */
const BEAUTYHAUL_SLUGS: Array<{ brand: string; name: string; slug: string }> = [
  {
    brand: 'Somethinc',
    name: 'Ceramic Skin Saviour Moisturizer Gel',
    slug: 'reformulated-3-ceramic-skin-saviour-moisturizer-gel',
  },
  {
    brand: 'Somethinc',
    name: 'Low pH Gentle Jelly Cleanser',
    slug: 'low-ph-gentle-jelly-cleanser',
  },
  {
    brand: 'Somethinc',
    name: 'AHA BHA PHA Peeling Solution',
    slug: 'aha-bha-pha-peeling-solution-20ml',
  },
  {
    brand: 'Somethinc',
    name: 'Niacinamide + Moisture Beet Serum',
    slug: '10-niacinamide-moisture-beet-serum',
  },
  {
    brand: 'Somethinc',
    name: 'Holyshield! Comfort Corrector Sunscreen',
    slug: 'holyshield-comfort-corrector-sunscreen',
  },
  {
    brand: 'Whitelab',
    name: 'Niacinamide 5% + Aloe Vera 2% Serum',
    slug: 'niacinamide-5-aloe-vera-2-serum',
  },
  {
    brand: 'Dear Me Beauty',
    name: 'Pore Perfecting Serum',
    slug: 'pore-perfecting-serum',
  },
  {
    brand: 'True to Skin',
    name: 'Mugwort + BHA Toner',
    slug: 'mugwort-bha-toner',
  },
  {
    brand: 'Bio Beauty Lab',
    name: 'Daily Soothing Moisturizer',
    slug: 'daily-soothing-moisturizer',
  },
  {
    brand: 'Hanasui',
    name: 'Serum Vitamin C',
    slug: 'serum-vitamin-c',
  },
  {
    brand: 'Hanasui',
    name: 'Collagen Water Sunscreen SPF50 PA++++',
    slug: 'collagen-water-sunscreen-spf50',
  },
  {
    brand: 'Implora',
    name: 'Acne Care Facial Wash',
    slug: 'acne-care-facial-wash',
  },
  {
    brand: 'Implora',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
  },
  {
    brand: 'Marina',
    name: 'UV White Hydro Boost Essence Sunscreen SPF50 PA++++',
    slug: 'uv-white-hydro-boost-essence-sunscreen',
  },
  {
    brand: 'Elvicto',
    name: 'Acne Care Face Serum',
    slug: 'acne-care-face-serum',
  },
];

function key(brand: string, name: string) {
  return `${brand.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

async function fetchShopifyCatalog(url: string) {
  const { data } = await axios.get<{
    products?: Array<{ title: string; images?: Array<{ src?: string }> }>;
  }>(url, { params: { limit: 250 }, timeout: 15_000 });
  return (data.products ?? [])
    .map((product) => ({
      name: product.title,
      imageUrl: product.images?.[0]?.src?.replace(/^http:/, 'https:') ?? null,
    }))
    .filter((item) => item.imageUrl);
}

async function beautyhaulOgImage(slug: string): Promise<string | null> {
  try {
    const { status, data } = await axios.get<string>(
      `https://www.beautyhaul.com/product/detail/${slug}`,
      {
        timeout: 12_000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: () => true,
        responseType: 'text',
      },
    );
    if (status >= 400 || typeof data !== 'string') return null;
    const og =
      data.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ??
      data.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ??
      null;
    if (!og) return null;
    if (/default|placeholder|logo/i.test(og)) return null;
    return og;
  } catch {
    return null;
  }
}

async function main() {
  // 1) Rename outdated seed products so recommendations show real SKUs.
  for (const [fromKey, next] of Object.entries(RENAME_MAP)) {
    const [brandPart, ...nameParts] = fromKey.split('::');
    const oldName = nameParts.join('::');
    const existing = await prisma.product.findFirst({
      where: {
        brand: { equals: brandPart, mode: 'insensitive' },
        name: { equals: oldName, mode: 'insensitive' },
      },
    });
    if (!existing) continue;
    await prisma.product.update({
      where: { id: existing.id },
      data: { brand: next.brand, name: next.name },
    });
    console.log(`RENAME ${existing.brand} | ${existing.name} -> ${next.name}`);
  }

  const missing = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
    select: { id: true, brand: true, name: true },
  });
  console.log(`Missing images: ${missing.length}`);

  // 2) Shopify catalogs
  const shopifyByBrand = new Map<string, Array<{ name: string; imageUrl: string }>>();
  for (const [brand, url] of Object.entries(SHOPIFY_BRANDS)) {
    try {
      const catalog = await fetchShopifyCatalog(url);
      shopifyByBrand.set(brand, catalog as Array<{ name: string; imageUrl: string }>);
      console.log(`shopify ${brand}: ${catalog.length}`);
    } catch (error) {
      console.log(`shopify ${brand} failed`, error instanceof Error ? error.message : error);
    }
  }

  // 3) Beautyhaul curated slugs
  const beautyhaulMap = new Map<string, string>();
  for (const entry of BEAUTYHAUL_SLUGS) {
    const image = await beautyhaulOgImage(entry.slug);
    if (image) {
      beautyhaulMap.set(key(entry.brand, entry.name), image);
      console.log(`BH OK ${entry.brand} | ${entry.name}`);
    } else {
      console.log(`BH MISS ${entry.brand} | ${entry.name} (${entry.slug})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  let updated = 0;
  for (const product of missing) {
    let imageUrl: string | null = beautyhaulMap.get(key(product.brand, product.name)) ?? null;

    if (!imageUrl) {
      const shopify = shopifyByBrand.get(product.brand.trim().toLowerCase()) ?? [];
      const ranked = shopify
        .map((item) => ({ item, score: scoreProductName(product.name, item.name) }))
        .sort((a, b) => b.score - a.score)[0];
      if (ranked && ranked.score >= 0.48) {
        imageUrl = ranked.item.imageUrl;
      }
    }

    if (!imageUrl) {
      console.log(`STILL MISS ${product.brand} | ${product.name}`);
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl },
    });
    updated += 1;
    console.log(`OK ${product.brand} | ${product.name}`);
  }

  console.log(JSON.stringify({ updated, remainingAttempted: missing.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
