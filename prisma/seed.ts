/**
 * AURA database seed (skincare-first):
 * 1. Skincare taxonomy (+ legacy makeup type names kept for compatibility)
 * 2. Admin + demo affiliator
 * 3. Indonesian local skincare catalog (Wardah, Somethinc, Avoskin, …)
 *
 * Env:
 *   SEED_ID_SKINCARE_REPLACE=1  (default: purge makeup + non-local skincare)
 *   SEED_SKIP_ID_SKINCARE=1     (skip local catalog)
 *   SEED_SKIP_SOCO=1            (default skip — makeup scrape disabled)
 *   SEED_SKIP_SKINCARE=1        (default skip SOCO skincare; use local catalog)
 */
import { PrismaClient, Gender } from '@prisma/client';
import bcrypt from 'bcrypt';
import { MAKEUP_TYPES, SKINCARE_TYPES, SKIN_CONCERNS } from '../src/constants/index.js';
import { seedIdSkincare } from './id-skincare-seeder.js';

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MAKEUP_TAXONOMY: Array<{
  name: string;
  description: string;
  benefits: string[];
  concerns: string[];
}> = [
  {
    name: MAKEUP_TYPES.FOUNDATION,
    description: 'Base makeup for even skin tone and coverage.',
    benefits: ['Coverage', 'Even tone'],
    concerns: ['skin_tone', 'undertone'],
  },
  {
    name: MAKEUP_TYPES.CONCEALER,
    description: 'Spot coverage for blemishes and dark circles.',
    benefits: ['Spot cover', 'Brighten'],
    concerns: ['skin_tone'],
  },
  {
    name: MAKEUP_TYPES.CUSHION,
    description: 'Lightweight cushion foundation with buildable coverage.',
    benefits: ['Lightweight', 'Natural finish'],
    concerns: ['daily', 'natural'],
  },
  {
    name: MAKEUP_TYPES.POWDER,
    description: 'Setting or loose powder to control shine.',
    benefits: ['Oil control', 'Matte finish'],
    concerns: ['matte'],
  },
  {
    name: MAKEUP_TYPES.BLUSH,
    description: 'Cheek color for healthy flush.',
    benefits: ['Color', 'Dimension'],
    concerns: ['face_shape'],
  },
  {
    name: MAKEUP_TYPES.LIP_CREAM,
    description: 'Long-wear cream lipstick / lip cream.',
    benefits: ['Long wear', 'Pigment'],
    concerns: ['party', 'matte'],
  },
  {
    name: MAKEUP_TYPES.LIP_TINT,
    description: 'Sheer to medium lip tint with a natural finish.',
    benefits: ['Natural look', 'Daily wear'],
    concerns: ['daily', 'natural'],
  },
  {
    name: MAKEUP_TYPES.MASCARA,
    description: 'Lash definition and volume.',
    benefits: ['Volume', 'Definition'],
    concerns: ['eyes'],
  },
  {
    name: MAKEUP_TYPES.EYESHADOW,
    description: 'Eye color for everyday or glam looks.',
    benefits: ['Color', 'Depth'],
    concerns: ['party', 'eyes'],
  },
  {
    name: MAKEUP_TYPES.BROW,
    description: 'Brow pencil / pomade for framed eyes.',
    benefits: ['Shape', 'Definition'],
    concerns: ['face_shape'],
  },
];

const SKINCARE_TAXONOMY: Array<{
  name: string;
  description: string;
  benefits: string[];
  concerns: string[];
}> = [
  {
    name: SKINCARE_TYPES.CLEANSER,
    description: 'Removes dirt, oil, and makeup as the first routine step.',
    benefits: ['Deep clean', 'Fresh skin'],
    concerns: [SKIN_CONCERNS.OILY, SKIN_CONCERNS.ACNE, SKIN_CONCERNS.PORES],
  },
  {
    name: SKINCARE_TYPES.TONER,
    description: 'Rebalances skin pH and preps for the next steps.',
    benefits: ['Balance', 'Prep'],
    concerns: [SKIN_CONCERNS.OILY, SKIN_CONCERNS.PORES],
  },
  {
    name: SKINCARE_TYPES.ESSENCE,
    description: 'Lightweight hydration layer before serum.',
    benefits: ['Hydration', 'Glow'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.DULL],
  },
  {
    name: SKINCARE_TYPES.SERUM,
    description: 'Concentrated actives targeting a specific concern.',
    benefits: ['Targeted actives', 'Visible results'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.AGING],
  },
  {
    name: SKINCARE_TYPES.MOISTURIZER,
    description: 'Locks in hydration and supports the skin barrier.',
    benefits: ['Hydration', 'Barrier support'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.SENSITIVE],
  },
  {
    name: SKINCARE_TYPES.SUNSCREEN,
    description: 'Daily UV protection — the most important anti-aging step.',
    benefits: ['UV protection', 'Prevents dark spots'],
    concerns: [SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.AGING],
  },
  {
    name: SKINCARE_TYPES.EXFOLIATOR,
    description: 'AHA/BHA or physical exfoliation to renew skin texture.',
    benefits: ['Smooth texture', 'Unclog pores'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.ACNE, SKIN_CONCERNS.DULL],
  },
  {
    name: SKINCARE_TYPES.MASK,
    description: 'Weekly treatment for an extra hydration or clarifying boost.',
    benefits: ['Boost treatment', 'Relax'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.DULL],
  },
  {
    name: SKINCARE_TYPES.EYE_CARE,
    description: 'Targets dark circles, puffiness, and fine lines.',
    benefits: ['Brighten eyes', 'Reduce fine lines'],
    concerns: [SKIN_CONCERNS.AGING, SKIN_CONCERNS.DARK_SPOTS],
  },
  {
    name: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Spot treatment for active breakouts.',
    benefits: ['Calms breakouts', 'Reduces redness'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.SENSITIVE],
  },
];

async function seedTaxonomy(): Promise<void> {
  for (const item of [...MAKEUP_TAXONOMY, ...SKINCARE_TAXONOMY]) {
    await prisma.ingredient.upsert({
      where: { slug: slugify(item.name) },
      update: {
        description: item.description,
        benefits: item.benefits,
        concerns: item.concerns,
      },
      create: {
        name: item.name,
        slug: slugify(item.name),
        description: item.description,
        benefits: item.benefits,
        concerns: item.concerns,
      },
    });
  }
}

async function seedAdmin(): Promise<void> {
  const adminEmail = 'admin@auraai.local';
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'SUPER_ADMIN',
      isActive: true,
      profile: {
        update: {
          favoriteBrands: ['Wardah', 'Somethinc', 'Skintific'],
          preferredCategories: ['Skincare'],
        },
      },
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      profile: {
        create: {
          name: 'Aura Super Admin',
          gender: Gender.PREFER_NOT_TO_SAY,
          age: 30,
          budgetMax: 300_000,
          favoriteBrands: ['Wardah', 'Somethinc', 'Skintific'],
          occasion: 'DAILY',
          finishPreference: 'NATURAL',
          preferredCategories: ['Skincare'],
          allergies: [],
          currentProducts: [],
        },
      },
    },
  });
}

async function seedDemoAffiliator(): Promise<void> {
  const email = 'affiliator@auraai.local';
  const passwordHash = await bcrypt.hash('Affiliator123!', 12);
  await prisma.user.upsert({
    where: { email },
    update: {
      role: 'AFFILIATOR',
      isActive: true,
      profile: {
        update: {
          favoriteBrands: ['Somethinc', 'Wardah', 'The Originote', 'Skintific'],
          preferredCategories: ['Skincare'],
        },
      },
    },
    create: {
      email,
      passwordHash,
      role: 'AFFILIATOR',
      profile: {
        create: {
          name: 'Demo Affiliator',
          gender: Gender.FEMALE,
          age: 26,
          budgetMax: 250_000,
          favoriteBrands: ['Somethinc', 'Wardah', 'The Originote', 'Skintific'],
          occasion: 'DAILY',
          finishPreference: 'DEWY',
          preferredCategories: ['Skincare'],
          allergies: [],
          currentProducts: [],
        },
      },
    },
  });
}

async function seedDemoSubscription(): Promise<void> {
  const affiliator = await prisma.user.findUnique({
    where: { email: 'affiliator@auraai.local' },
  });
  if (!affiliator) return;

  const now = new Date();
  let subscription = await prisma.subscription.findFirst({
    where: { userId: affiliator.id, isActive: true },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId: affiliator.id,
        planId: 'growth',
        planName: 'Growth',
        priceIdr: 100_000,
        quota: 3_000,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        isActive: true,
      },
    });
  }

  const paymentCount = await prisma.payment.count({ where: { userId: affiliator.id } });
  if (paymentCount === 0) {
    const paidAt = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000);
    const stamp = paidAt.toISOString().slice(0, 10).replaceAll('-', '');
    await prisma.payment.create({
      data: {
        userId: affiliator.id,
        subscriptionId: subscription.id,
        planId: 'growth',
        method: 'qris',
        subtotal: 100_000,
        tax: 11_000,
        total: 111_000,
        invoiceNumber: `AURA-${stamp}-11`,
        status: 'paid',
        paidAt,
      },
    });
  }
}

async function seedDemoLeads(): Promise<void> {
  const affiliator = await prisma.user.findUnique({
    where: { email: 'affiliator@auraai.local' },
  });
  if (!affiliator) return;

  const existing = await prisma.scan.count({ where: { userId: affiliator.id } });
  if (existing > 0) return;

  const products = await prisma.product.findMany({
    where: { isActive: true, category: { equals: 'Skincare', mode: 'insensitive' } },
    take: 4,
    orderBy: { reviewCount: 'desc' },
  });

  const guests = [
    {
      name: 'Ayla',
      skinTone: 'Light',
      undertone: 'Warm',
      faceShape: 'Oval',
      confidence: 0.91,
      skinType: 'Combination',
      concerns: ['acne', 'sensitive'],
      daysAgo: 1,
    },
    {
      name: 'Bima',
      skinTone: 'Medium',
      undertone: 'Cool',
      faceShape: 'Heart',
      confidence: 0.87,
      skinType: 'Oily',
      concerns: ['oily', 'pores'],
      daysAgo: 2,
    },
    {
      name: 'Citra',
      skinTone: 'Light',
      undertone: 'Neutral',
      faceShape: 'Round',
      confidence: 0.93,
      skinType: 'Dry',
      concerns: ['dry', 'dullness'],
      daysAgo: 3,
    },
    {
      name: 'Dina',
      skinTone: 'Tan',
      undertone: 'Warm',
      faceShape: 'Square',
      confidence: 0.84,
      skinType: 'Combination',
      concerns: ['dark spots'],
      daysAgo: 4,
    },
  ];

  for (let index = 0; index < guests.length; index += 1) {
    const guest = guests[index];
    const createdAt = new Date(Date.now() - guest.daysAgo * 24 * 60 * 60 * 1000);
    const scan = await prisma.scan.create({
      data: {
        userId: affiliator.id,
        guestName: guest.name,
        skinTone: guest.skinTone,
        undertone: guest.undertone,
        faceShape: guest.faceShape,
        confidence: guest.confidence,
        skinType: guest.skinType,
        concerns: guest.concerns,
        acne: guest.concerns.includes('acne') ? 70 : 25,
        oiliness: guest.concerns.includes('oily') ? 70 : 45,
        redness: guest.concerns.includes('sensitive') ? 70 : 30,
        channel: index % 3 === 0 ? 'qr' : 'referral',
        rawAiResponse: {
          skin_tone: guest.skinTone,
          undertone: guest.undertone,
          face_shape: guest.faceShape,
          confidence: guest.confidence,
          skin_type: guest.skinType,
          concerns: guest.concerns,
        },
        createdAt,
      },
    });

    await prisma.scanHistory.create({
      data: {
        userId: affiliator.id,
        scanId: scan.id,
        summary: `${guest.name}: ${guest.skinTone} · ${guest.skinType} · ${guest.concerns.join(', ')}`,
        createdAt,
      },
    });

    const product = products[index % Math.max(products.length, 1)];
    if (!product) continue;

    const recommendation = await prisma.recommendation.create({
      data: {
        userId: affiliator.id,
        scanId: scan.id,
        reasons: [
          {
            product: product.name,
            explanations: [`Targets ${guest.concerns.join(', ')}`],
          },
        ],
      },
    });

    await prisma.recommendationProduct.create({
      data: {
        recommendationId: recommendation.id,
        productId: product.id,
        matchScore: 0.86 + index * 0.02,
        explanations: [
          `Targets ${guest.concerns.join(', ')}`,
          `Routine step: ${product.subcategory ?? 'Skincare'}`,
        ],
      },
    });
  }
}

async function main(): Promise<void> {
  await seedTaxonomy();
  await seedAdmin();
  await seedDemoAffiliator();
  // eslint-disable-next-line no-console
  console.log(
    'Seeded taxonomy skincare=%s (makeup types kept for compatibility), admin + affiliator ready',
    SKINCARE_TAXONOMY.length,
  );

  if (process.env.SEED_SKIP_ID_SKINCARE !== '1') {
    const replace =
      process.env.SEED_ID_SKINCARE_REPLACE === '1' ||
      process.env.SEED_ID_SKINCARE_REPLACE === 'true' ||
      process.env.SEED_ID_SKINCARE_REPLACE == null; // default: replace/purge
    const result = await seedIdSkincare(prisma, {
      replace,
      ownerEmail: process.env.SEED_SKINCARE_OWNER ?? 'affiliator@auraai.local',
    });
    // eslint-disable-next-line no-console
    console.log('Indonesian skincare seed result:', result);
  } else {
    // eslint-disable-next-line no-console
    console.log('Skipping Indonesian skincare seed (SEED_SKIP_ID_SKINCARE=1)');
  }

  await seedDemoSubscription();
  await seedDemoLeads();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
