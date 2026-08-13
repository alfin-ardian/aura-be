/**
 * Reset then re-attach product images for local Indonesian seed (strict brand match).
 * Usage: npx tsx scripts/reset-and-backfill-images.ts
 */
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: { sources: { has: 'local-id-seed' } },
    data: { imageUrl: null },
  });
  console.log(`Cleared imageUrl on ${result.count} local-id-seed products`);

  const run = spawnSync('npx', ['tsx', 'scripts/backfill-product-images.ts', '--limit=200'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });
  if (run.status !== 0) process.exit(run.status ?? 1);

  const total = await prisma.product.count({
    where: { isActive: true, sources: { has: 'local-id-seed' } },
  });
  const missing = await prisma.product.count({
    where: {
      isActive: true,
      sources: { has: 'local-id-seed' },
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
  });
  console.log(JSON.stringify({ total, withImage: total - missing, missing }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
