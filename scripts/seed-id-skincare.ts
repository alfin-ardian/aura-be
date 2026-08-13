/**
 * CLI: purge makeup + seed Indonesian local skincare catalog.
 * Usage: npx tsx scripts/seed-id-skincare.ts [--replace]
 */
import { PrismaClient } from '@prisma/client';
import { seedIdSkincare } from '../prisma/id-skincare-seeder.js';

const prisma = new PrismaClient();

async function main() {
  const replace = process.argv.includes('--replace');
  const result = await seedIdSkincare(prisma, {
    replace,
    ownerEmail: process.env.SEED_SKINCARE_OWNER ?? 'affiliator@auraai.local',
  });
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
