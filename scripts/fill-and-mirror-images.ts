/**
 * Fill remaining null product.imageUrl + mirror key recommendation images
 * into /uploads/products for stable serving from the API host.
 *
 * Usage: npx tsx scripts/fill-and-mirror-images.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { appConfig } from '../src/config/index.js';

const prisma = new PrismaClient();

const API_PUBLIC =
  process.env.PUBLIC_API_URL?.replace(/\/$/, '') ||
  process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

/** Direct CDN URLs for products SOCO no longer lists. */
const DIRECT_IMAGES: Record<string, string> = {
  'somethinc::ceramic skin saviour moisturizer gel':
    'https://cdn.beautyhaul.com/assets/uploads/products/thumbs/800x800/PDP__Ceramic_Skin_Saviour_Moisturizer_Gel.jpg',
  'somethinc::low ph gentle jelly cleanser':
    'https://cdn.beautyhaul.com/assets/uploads/products/thumbs/800x800/PDP_Low_pH_Gentle_Jelly_Cleanser.jpg',
  'the originote::hyalucera moisturizer':
    'https://cdn.shopify.com/s/files/1/0626/4219/2524/files/1_d43436e0-176f-421d-87bf-3b6d070a3fb1.jpg?v=1702953545',
};

const SLUG_CANDIDATES: Record<string, string[]> = {
  'somethinc::aha bha pha peeling solution': [
    'aha-bha-pha-peeling-solution',
    'reformulated-aha-bha-pha-peeling-solution',
    'aha-bha-pha-peeling-solution-30ml',
  ],
  'somethinc::niacinamide + moisture beet serum': [
    'niacinamide-moisture-beet-serum',
    '10-niacinamide-moisture-beet-serum',
    'niacinamide-10-moisture-beet-serum',
  ],
  'somethinc::holyshield! comfort corrector sunscreen': [
    'holyshield-comfort-corrector-sunscreen',
    'holyshield-comfort-corrector-sunscreen-spf50-pa',
    'holyshield-uv-moist-sunscreen-serum',
  ],
  'implora::hydrating serum': [
    'hydrating-serum',
    'implora-hydrating-serum',
    'serum-hydrating',
  ],
  'implora::acne care facial wash': [
    'acne-care-facial-wash',
    'implora-acne-care-facial-wash',
  ],
  'whitelab::niacinamide 5% + aloe vera 2% serum': [
    'niacinamide-5-aloe-vera-2-serum',
    'whitelab-niacinamide-serum',
    'niacinamide-serum-15ml',
  ],
  'dear me beauty::pore perfecting serum': [
    'pore-perfecting-serum',
    'dear-me-beauty-pore-perfecting-serum',
  ],
  'true to skin::mugwort + bha toner': [
    'mugwort-bha-toner',
    'true-to-skin-mugwort-bha-toner',
  ],
  'bio beauty lab::daily soothing moisturizer': [
    'daily-soothing-moisturizer',
    'bio-beauty-lab-daily-soothing-moisturizer',
  ],
  'hanasui::serum vitamin c': ['serum-vitamin-c', 'hanasui-serum-vitamin-c'],
  'hanasui::collagen water sunscreen spf50 pa++++': [
    'collagen-water-sunscreen-spf50',
    'collagen-water-sunscreen',
  ],
  'marina::uv white hydro boost essence sunscreen spf50 pa++++': [
    'uv-white-hydro-boost-essence-sunscreen',
    'marina-hydro-boost-sunscreen',
  ],
  'elvicto::acne care face serum': [
    'acne-care-face-serum',
    'elvicto-acne-care-face-serum',
  ],
};

function key(brand: string, name: string) {
  return `${brand.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

async function beautyhaulOg(slug: string): Promise<string | null> {
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
    if (!og || /default|placeholder|logo|beautyhaul\.ico|og-image/i.test(og)) return null;
    return og;
  } catch {
    return null;
  }
}

async function searchBeautyhaul(query: string): Promise<string | null> {
  try {
    const { status, data } = await axios.get<string>('https://www.beautyhaul.com/search', {
      params: { q: query },
      timeout: 12_000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: () => true,
      responseType: 'text',
    });
    if (status >= 400 || typeof data !== 'string') return null;
    const slugs = [...data.matchAll(/\/product\/detail\/([a-z0-9-]+)/gi)].map((m) => m[1]!);
    for (const slug of [...new Set(slugs)].slice(0, 10)) {
      const og = await beautyhaulOg(slug);
      if (og) return og;
      await new Promise((r) => setTimeout(r, 80));
    }
    return null;
  } catch {
    return null;
  }
}

async function mirrorImage(productId: string, remoteUrl: string): Promise<string | null> {
  try {
    const response = await axios.get<ArrayBuffer>(remoteUrl, {
      responseType: 'arraybuffer',
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.beautyhaul.com/' },
      validateStatus: () => true,
      maxRedirects: 5,
    });
    if (response.status >= 400) return null;
    const contentType = String(response.headers['content-type'] ?? '');
    if (!contentType.includes('image')) return null;
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
    const dir = path.resolve(process.cwd(), appConfig.upload.dir, 'products');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${productId}.${ext}`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(response.data));
    return `${API_PUBLIC}/uploads/products/${filename}`;
  } catch {
    return null;
  }
}

async function resolveRemote(brand: string, name: string): Promise<string | null> {
  const k = key(brand, name);
  if (DIRECT_IMAGES[k]) return DIRECT_IMAGES[k]!;

  for (const slug of SLUG_CANDIDATES[k] ?? []) {
    const og = await beautyhaulOg(slug);
    if (og) return og;
  }

  return searchBeautyhaul(`${brand} ${name}`);
}

async function main() {
  const targets = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { imageUrl: null },
        { imageUrl: '' },
        { name: { in: ['Ceramic Skin Saviour Moisturizer Gel', 'Hyalucera Moisturizer', 'Hydrating Serum'] } },
      ],
    },
    select: { id: true, brand: true, name: true, imageUrl: true },
  });

  console.log('targets', targets.length);
  let updated = 0;

  for (const product of targets) {
    const alreadyLocal = product.imageUrl?.includes('/uploads/products/');
    let remote = product.imageUrl && !alreadyLocal ? product.imageUrl : null;
    if (!remote) {
      remote = await resolveRemote(product.brand, product.name);
    }
    if (!remote) {
      console.log(`MISS ${product.brand} | ${product.name}`);
      continue;
    }

    const mirrored = await mirrorImage(product.id, remote);
    const nextUrl = mirrored ?? remote;
    if (nextUrl === product.imageUrl) {
      console.log(`SKIP ${product.brand} | ${product.name}`);
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: nextUrl },
    });
    updated += 1;
    console.log(`OK ${product.brand} | ${product.name} => ${nextUrl}`);
  }

  console.log({ updated });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
