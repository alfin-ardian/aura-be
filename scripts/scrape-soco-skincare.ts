/**
 * CLI: seed / refresh skincare products from SOCO for one affiliator.
 *
 *   npm run seed:skincare
 *   npx tsx scripts/scrape-soco-skincare.ts --limit=100 --replace --owner=affiliator@auraai.local
 */
import { PrismaClient } from '@prisma/client';
import { seedSkincareFromSoco } from '../prisma/soco-skincare-seeder.js';

const prisma = new PrismaClient();

function parseArgs(argv: string[]): {
  limit: number;
  skip: number;
  dryRun: boolean;
  replace: boolean;
  ownerEmail: string;
} {
  let limit = 100;
  let skip = 0;
  let dryRun = false;
  let replace = false;
  let ownerEmail = 'affiliator@auraai.local';

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) limit = Math.max(1, Number(arg.slice('--limit='.length)));
    if (arg.startsWith('--skip=')) skip = Math.max(0, Number(arg.slice('--skip='.length)));
    if (arg.startsWith('--owner=')) ownerEmail = arg.slice('--owner='.length);
    if (arg === '--dry-run') dryRun = true;
    if (arg === '--replace') replace = true;
  }

  return { limit, skip, dryRun, replace, ownerEmail };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const result = await seedSkincareFromSoco(prisma, opts);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
