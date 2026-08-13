/**
 * Attach product images for rows missing imageUrl (SOCO → BeautyHaul → mirror).
 *
 * Usage (prod):
 *   PUBLIC_API_URL=https://api.auraai.site npx tsx scripts/attach-product-images.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { appConfig } from '../src/config/index.js';
import {
  fetchSocoBrandCatalog,
  pickSocoMatch,
} from '../src/shared/services/soco-catalog.js';

const prisma = new PrismaClient();

const API_PUBLIC =
  process.env.PUBLIC_API_URL?.replace(/\/$/, '') ||
  process.env.API_PUBLIC_URL?.replace(/\/$/, '') ||
  'https://api.auraai.site';

async function beautyhaulSearch(query: string): Promise<string | null> {
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
    for (const slug of [...new Set(slugs)].slice(0, 8)) {
      const page = await axios.get<string>(`https://www.beautyhaul.com/product/detail/${slug}`, {
        timeout: 12_000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        validateStatus: () => true,
        responseType: 'text',
      });
      if (page.status >= 400 || typeof page.data !== 'string') continue;
      const og =
        page.data.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ??
        page.data.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ??
        null;
      if (og && !/default|placeholder|logo|og-image/i.test(og)) return og;
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
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://www.sociolla.com/',
      },
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

async function main() {
  const targets = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
    select: { id: true, brand: true, name: true },
    orderBy: [{ brand: 'asc' }, { name: 'asc' }],
  });

  console.log(`missing images: ${targets.length}`);
  console.log(`PUBLIC_API_URL=${API_PUBLIC}`);

  const catalogs = new Map<string, Awaited<ReturnType<typeof fetchSocoBrandCatalog>>>();
  for (const brand of [...new Set(targets.map((row) => row.brand))]) {
    try {
      catalogs.set(brand.toLowerCase(), await fetchSocoBrandCatalog(brand, 80));
      console.log(`SOCO catalog loaded: ${brand}`);
    } catch (error) {
      console.warn(`SOCO catalog failed for ${brand}:`, error);
      catalogs.set(brand.toLowerCase(), []);
    }
  }

  let updated = 0;
  let missed = 0;

  for (const product of targets) {
    const soco = pickSocoMatch(
      product.name,
      catalogs.get(product.brand.toLowerCase()) ?? [],
    );
    let remote = soco?.imageUrl ?? null;
    if (!remote) {
      remote = await beautyhaulSearch(`${product.brand} ${product.name}`);
    }
    if (!remote) {
      missed += 1;
      console.log(`MISS ${product.brand} | ${product.name}`);
      continue;
    }

    const mirrored = await mirrorImage(product.id, remote);
    const nextUrl = mirrored ?? remote;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: nextUrl,
        ...(soco?.sourceUrl ? { sourceUrl: soco.sourceUrl } : {}),
      },
    });
    updated += 1;
    console.log(`OK ${product.brand} | ${product.name}`);
    await new Promise((r) => setTimeout(r, 120));
  }

  const remaining = await prisma.product.count({
    where: {
      isActive: true,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
  });
  console.log({ updated, missed, remaining });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
