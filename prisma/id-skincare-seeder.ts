/**
 * Curated Indonesian skincare catalog for AURA.
 * Focus: major local / Indonesia-popular brands (Wardah, Somethinc, Avoskin, …).
 */
import type { PrismaClient } from '@prisma/client';
import { SKINCARE_TYPES, SKIN_CONCERNS } from '../src/constants/index.js';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface IdSkincareDraft {
  brand: string;
  name: string;
  step: string;
  description: string;
  benefits: string[];
  tags: string[];
  ingredientNames: string[];
  concerns: string[];
  minPrice: number;
  maxPrice: number;
  rating: number;
  reviewCount: number;
  affiliateUrl?: string;
}

/** Flagship / widely sold Indonesian skincare SKUs for the demo catalog. */
export const ID_SKINCARE_PRODUCTS: IdSkincareDraft[] = [
  // —— Wardah ——
  {
    brand: 'Wardah',
    name: 'Nature Daily Aloe Hydramild Facial Wash',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Facial wash lembut dengan aloe vera untuk membersihkan tanpa membuat kulit kering.',
    benefits: ['Gentle cleanse', 'Hydrating', 'Helps with dry', 'Helps with sensitive'],
    tags: ['Skincare', 'Cleanser', 'dry', 'sensitive', 'Aloe Vera'],
    ingredientNames: ['Aloe Vera', 'Glycerin'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.SENSITIVE],
    minPrice: 25_000,
    maxPrice: 32_000,
    rating: 4.6,
    reviewCount: 18_200,
  },
  {
    brand: 'Wardah',
    name: 'Acne Calm Series Face Toner',
    step: SKINCARE_TYPES.TONER,
    description: 'Toner ringan untuk membantu merawat kulit berjerawat dan mengontrol minyak.',
    benefits: ['Helps with acne', 'Helps with oily', 'Calming'],
    tags: ['Skincare', 'Toner', 'acne', 'oily', 'pores'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Tea Tree'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY, SKIN_CONCERNS.PORES],
    minPrice: 28_000,
    maxPrice: 35_000,
    rating: 4.5,
    reviewCount: 9_400,
  },
  {
    brand: 'Wardah',
    name: 'Crystal Secret Night Cream',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Night cream pelembap yang membantu merawat tekstur dan kecerahan kulit.',
    benefits: ['Helps with dullness', 'Helps with dry', 'Night repair'],
    tags: ['Skincare', 'Moisturizer', 'dullness', 'dry'],
    ingredientNames: ['Niacinamide', 'Hyaluronic Acid'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DRY],
    minPrice: 45_000,
    maxPrice: 55_000,
    rating: 4.5,
    reviewCount: 12_100,
  },
  {
    brand: 'Wardah',
    name: 'UV Shield Aqua Fresh Essence Sunscreen SPF50 PA+++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen ringan bertekstur essence, nyaman untuk kulit Indonesia yang lembap.',
    benefits: ['UV protection', 'Lightweight', 'Helps with dark spots'],
    tags: ['Skincare', 'Sunscreen', 'dark spots', 'aging'],
    ingredientNames: ['UV Filters', 'Hyaluronic Acid'],
    concerns: [SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.AGING],
    minPrice: 55_000,
    maxPrice: 68_000,
    rating: 4.7,
    reviewCount: 21_500,
  },

  // —— Emina ——
  {
    brand: 'Emina',
    name: 'Ms Pimple Acne Solution Face Wash',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Face wash untuk kulit berjerawat dengan formula ringan dan tidak membuat ketat.',
    benefits: ['Helps with acne', 'Helps with oily', 'Fresh cleanse'],
    tags: ['Skincare', 'Cleanser', 'acne', 'oily'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Witch Hazel'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 22_000,
    maxPrice: 28_000,
    rating: 4.6,
    reviewCount: 15_800,
  },
  {
    brand: 'Emina',
    name: 'Ms Pimple Acne Spot Treatment Gel',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Spot treatment gel untuk membantu meredakan jerawat aktif.',
    benefits: ['Helps with acne', 'Calms breakouts', 'Helps with sensitive'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'sensitive'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Tea Tree'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.SENSITIVE],
    minPrice: 24_000,
    maxPrice: 30_000,
    rating: 4.5,
    reviewCount: 11_200,
  },
  {
    brand: 'Emina',
    name: 'Bright Stuff Face Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum cerah dengan niacinamide untuk kulit kusam sehari-hari.',
    benefits: ['Helps with dullness', 'Helps with dark spots', 'Brightening'],
    tags: ['Skincare', 'Serum', 'dullness', 'dark spots', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Vitamin C'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 35_000,
    maxPrice: 42_000,
    rating: 4.6,
    reviewCount: 8_900,
  },

  // —— Somethinc ——
  {
    brand: 'Somethinc',
    name: 'Low pH Gentle Jelly Cleanser',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Cleanser jelly pH rendah yang lembut untuk semua tipe kulit, termasuk sensitif.',
    benefits: ['Gentle cleanse', 'Helps with sensitive', 'Barrier friendly'],
    tags: ['Skincare', 'Cleanser', 'sensitive', 'dry'],
    ingredientNames: ['Centella Asiatica', 'Glycerin'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.DRY],
    minPrice: 79_000,
    maxPrice: 99_000,
    rating: 4.8,
    reviewCount: 32_400,
  },
  {
    brand: 'Somethinc',
    name: 'AHA BHA PHA Peeling Solution',
    step: SKINCARE_TYPES.EXFOLIATOR,
    description: 'Eksfoliasi kimia untuk tekstur kasar, pori, dan sisa sel kulit mati.',
    benefits: ['Helps with pores', 'Helps with acne', 'Helps with dullness'],
    tags: ['Skincare', 'Exfoliator', 'pores', 'acne', 'dullness'],
    ingredientNames: ['Glycolic Acid (AHA)', 'Salicylic Acid (BHA)', 'PHA'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.ACNE, SKIN_CONCERNS.DULL],
    minPrice: 99_000,
    maxPrice: 119_000,
    rating: 4.7,
    reviewCount: 27_100,
  },
  {
    brand: 'Somethinc',
    name: 'Niacinamide + Moisture Beet Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum niacinamide untuk merawat pori, minyak berlebih, dan barrier kulit.',
    benefits: ['Helps with pores', 'Helps with oily', 'Helps with dullness'],
    tags: ['Skincare', 'Serum', 'pores', 'oily', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Betaine'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY, SKIN_CONCERNS.DULL],
    minPrice: 99_000,
    maxPrice: 129_000,
    rating: 4.8,
    reviewCount: 41_200,
  },
  {
    brand: 'Somethinc',
    name: 'Ceramic Skin Saviour Moisturizer Gel',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Moisturizer gel ringan yang mengunci kelembapan tanpa rasa lengket.',
    benefits: ['Helps with dry', 'Helps with oily', 'Lightweight'],
    tags: ['Skincare', 'Moisturizer', 'dry', 'oily', 'combination'],
    ingredientNames: ['Ceramide', 'Hyaluronic Acid'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.OILY],
    minPrice: 119_000,
    maxPrice: 139_000,
    rating: 4.7,
    reviewCount: 19_800,
  },
  {
    brand: 'Somethinc',
    name: 'Holyshield! Comfort Corrector Sunscreen',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen nyaman dengan tone-up ringan, cocok dipakai harian.',
    benefits: ['UV protection', 'Helps with dark spots', 'Comfort wear'],
    tags: ['Skincare', 'Sunscreen', 'dark spots', 'aging'],
    ingredientNames: ['UV Filters', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.AGING],
    minPrice: 89_000,
    maxPrice: 109_000,
    rating: 4.7,
    reviewCount: 22_600,
  },

  // —— Avoskin ——
  {
    brand: 'Avoskin',
    name: 'Miraculous Refining Toner',
    step: SKINCARE_TYPES.TONER,
    description: 'Toner eksfoliasi lembut untuk tekstur lebih rata dan pori lebih halus.',
    benefits: ['Helps with pores', 'Helps with dullness', 'Helps with acne'],
    tags: ['Skincare', 'Toner', 'pores', 'dullness', 'acne'],
    ingredientNames: ['Glycolic Acid (AHA)', 'Witch Hazel'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.DULL, SKIN_CONCERNS.ACNE],
    minPrice: 119_000,
    maxPrice: 149_000,
    rating: 4.7,
    reviewCount: 16_500,
  },
  {
    brand: 'Avoskin',
    name: 'Your Skin Bae Series Serum Niacinamide 12% + Centella',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum niacinamide tinggi dengan centella untuk kulit berminyak dan berjerawat.',
    benefits: ['Helps with acne', 'Helps with oily', 'Helps with pores'],
    tags: ['Skincare', 'Serum', 'acne', 'oily', 'pores', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Centella Asiatica'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY, SKIN_CONCERNS.PORES],
    minPrice: 139_000,
    maxPrice: 169_000,
    rating: 4.8,
    reviewCount: 24_300,
  },
  {
    brand: 'Avoskin',
    name: 'The Great Shield Sunscreen SPF50 PA++++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen proteksi tinggi dengan hasil akhir natural untuk kulit lokal.',
    benefits: ['UV protection', 'Helps with aging', 'Helps with dark spots'],
    tags: ['Skincare', 'Sunscreen', 'aging', 'dark spots'],
    ingredientNames: ['UV Filters', 'Vitamin E'],
    concerns: [SKIN_CONCERNS.AGING, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 99_000,
    maxPrice: 129_000,
    rating: 4.7,
    reviewCount: 14_700,
  },

  // —— Skintific ——
  {
    brand: 'Skintific',
    name: '5X Ceramide Barrier Moisture Gel',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Gel pelembap ceramide untuk memperkuat barrier, termasuk kulit acne-prone.',
    benefits: ['Helps with acne', 'Helps with dry', 'Helps with sensitive', 'Barrier repair'],
    tags: ['Skincare', 'Moisturizer', 'acne', 'dry', 'sensitive', 'Ceramide'],
    ingredientNames: ['Ceramide', 'Hyaluronic Acid', 'Centella Asiatica'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.DRY, SKIN_CONCERNS.SENSITIVE],
    minPrice: 89_000,
    maxPrice: 119_000,
    rating: 4.8,
    reviewCount: 38_900,
  },
  {
    brand: 'Skintific',
    name: 'SymWhite377 Dark Spot Eraser Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum anti-noda untuk membantu meratakan warna kulit dan bekas jerawat.',
    benefits: ['Helps with dark spots', 'Helps with dullness', 'Brightening'],
    tags: ['Skincare', 'Serum', 'dark spots', 'dullness', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Tranexamic Acid'],
    concerns: [SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.DULL],
    minPrice: 129_000,
    maxPrice: 159_000,
    rating: 4.7,
    reviewCount: 12_400,
  },
  {
    brand: 'Skintific',
    name: 'Mugwort Acne Clay Stick',
    step: SKINCARE_TYPES.MASK,
    description: 'Clay stick praktis untuk area berminyak dan rawan jerawat.',
    benefits: ['Helps with acne', 'Helps with oily', 'Helps with pores'],
    tags: ['Skincare', 'Mask', 'acne', 'oily', 'pores'],
    ingredientNames: ['Mugwort', 'Kaolin'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY, SKIN_CONCERNS.PORES],
    minPrice: 69_000,
    maxPrice: 89_000,
    rating: 4.6,
    reviewCount: 9_100,
  },
  {
    brand: 'Skintific',
    name: 'Perfect Cover Sunscreen SPF50 PA++++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen cover ringan yang melindungi dari UV sekaligus meratakan tampilan kulit.',
    benefits: ['UV protection', 'Helps with dark spots', 'Soft cover'],
    tags: ['Skincare', 'Sunscreen', 'dark spots', 'aging'],
    ingredientNames: ['UV Filters', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.DARK_SPOTS, SKIN_CONCERNS.AGING],
    minPrice: 99_000,
    maxPrice: 129_000,
    rating: 4.7,
    reviewCount: 17_600,
  },

  // —— The Originote ——
  {
    brand: 'The Originote',
    name: 'Hyaluronic Niacinamide Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum accessible dengan HA + niacinamide untuk hidrasi dan merawat pori.',
    benefits: ['Helps with dry', 'Helps with pores', 'Helps with dullness'],
    tags: ['Skincare', 'Serum', 'dry', 'pores', 'dullness', 'Niacinamide'],
    ingredientNames: ['Hyaluronic Acid', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.PORES, SKIN_CONCERNS.DULL],
    minPrice: 39_000,
    maxPrice: 49_000,
    rating: 4.7,
    reviewCount: 45_200,
  },
  {
    brand: 'The Originote',
    name: 'Ceramides Barrier Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum ceramide untuk kulit sensitif dan barrier yang mudah terganggu.',
    benefits: ['Helps with sensitive', 'Helps with dry', 'Barrier repair'],
    tags: ['Skincare', 'Serum', 'sensitive', 'dry', 'Ceramide'],
    ingredientNames: ['Ceramide', 'Centella Asiatica'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.DRY],
    minPrice: 39_000,
    maxPrice: 49_000,
    rating: 4.7,
    reviewCount: 28_400,
  },
  {
    brand: 'The Originote',
    name: 'Salicylic Acid Acne Serum',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Serum BHA untuk membantu membersihkan pori dan merawat jerawat.',
    benefits: ['Helps with acne', 'Helps with pores', 'Helps with oily'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'pores', 'oily'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY],
    minPrice: 39_000,
    maxPrice: 49_000,
    rating: 4.6,
    reviewCount: 19_700,
  },
  {
    brand: 'The Originote',
    name: 'Hyalucera Moisturizer',
    step: SKINCARE_TYPES.MOISTURIZER,
    description:
      'Pelembap gel dengan hyaluronic acid dan ceramide untuk menjaga skin barrier tanpa rasa lengket.',
    benefits: ['Helps with sensitive', 'Helps with dry', 'Lightweight'],
    tags: ['Skincare', 'Moisturizer', 'sensitive', 'dry', 'combination'],
    ingredientNames: ['Ceramide', 'Hyaluronic Acid'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.DRY],
    minPrice: 45_000,
    maxPrice: 55_000,
    rating: 4.7,
    reviewCount: 33_100,
  },

  // —— Glad2Glow ——
  {
    brand: 'Glad2Glow',
    name: 'Pomegranate Niacinamide Brightening Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum cerah dengan niacinamide untuk kulit kusam dan tidak merata.',
    benefits: ['Helps with dullness', 'Helps with dark spots', 'Brightening'],
    tags: ['Skincare', 'Serum', 'dullness', 'dark spots', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Pomegranate Extract'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 29_000,
    maxPrice: 39_000,
    rating: 4.6,
    reviewCount: 21_800,
  },
  {
    brand: 'Glad2Glow',
    name: 'Blueberry Dual Ceramide Moisturizer',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Moisturizer ceramide dengan hasil akhir lembut untuk menjaga kelembapan.',
    benefits: ['Helps with dry', 'Helps with sensitive', 'Hydration'],
    tags: ['Skincare', 'Moisturizer', 'dry', 'sensitive', 'Ceramide'],
    ingredientNames: ['Ceramide', 'Blueberry Extract'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.SENSITIVE],
    minPrice: 32_000,
    maxPrice: 42_000,
    rating: 4.6,
    reviewCount: 18_500,
  },
  {
    brand: 'Glad2Glow',
    name: 'Centella Asiatica Acne Calming Serum',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Serum penenang berbahan centella untuk membantu meredakan kemerahan jerawat.',
    benefits: ['Helps with acne', 'Helps with sensitive', 'Calming'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'sensitive'],
    ingredientNames: ['Centella Asiatica', 'Tea Tree'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.SENSITIVE],
    minPrice: 29_000,
    maxPrice: 39_000,
    rating: 4.5,
    reviewCount: 12_900,
  },

  // —— Azarine ——
  {
    brand: 'Azarine',
    name: 'Hydrasoothe Sunscreen Gel SPF45 PA++++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen gel favorit lokal: ringan, no whitecast, nyaman di iklim tropis.',
    benefits: ['UV protection', 'No whitecast', 'Helps with oily'],
    tags: ['Skincare', 'Sunscreen', 'oily', 'aging', 'dark spots'],
    ingredientNames: ['UV Filters', 'Aloe Vera'],
    concerns: [SKIN_CONCERNS.OILY, SKIN_CONCERNS.AGING, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 55_000,
    maxPrice: 65_000,
    rating: 4.8,
    reviewCount: 52_300,
  },
  {
    brand: 'Azarine',
    name: 'Acne Spot Serum',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Serum spot untuk membantu merawat jerawat dan bekas kemerahan.',
    benefits: ['Helps with acne', 'Helps with dark spots', 'Calming'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'dark spots'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 45_000,
    maxPrice: 55_000,
    rating: 4.5,
    reviewCount: 8_600,
  },
  {
    brand: 'Azarine',
    name: 'Calm My Acne Facial Wash',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Facial wash untuk kulit berjerawat dengan formula yang tidak membuat kulit kering.',
    benefits: ['Helps with acne', 'Helps with oily', 'Gentle cleanse'],
    tags: ['Skincare', 'Cleanser', 'acne', 'oily'],
    ingredientNames: ['Tea Tree', 'Salicylic Acid (BHA)'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 35_000,
    maxPrice: 45_000,
    rating: 4.6,
    reviewCount: 11_400,
  },

  // —— Scarlett ——
  {
    brand: 'Scarlett',
    name: 'Brightly Ever After Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum cerah Scarlett untuk tampilan kulit lebih merata dan glowing.',
    benefits: ['Helps with dullness', 'Helps with dark spots', 'Brightening'],
    tags: ['Skincare', 'Serum', 'dullness', 'dark spots'],
    ingredientNames: ['Glutathione', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 75_000,
    maxPrice: 89_000,
    rating: 4.5,
    reviewCount: 26_700,
  },
  {
    brand: 'Scarlett',
    name: 'Acne Serum',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Serum acne Scarlett untuk membantu merawat jerawat aktif.',
    benefits: ['Helps with acne', 'Helps with oily', 'Calming'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'oily'],
    ingredientNames: ['Tea Tree', 'Salicylic Acid (BHA)'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 75_000,
    maxPrice: 89_000,
    rating: 4.4,
    reviewCount: 14_200,
  },

  // —— Whitelab ——
  {
    brand: 'Whitelab',
    name: 'Acne Care Face Toner',
    step: SKINCARE_TYPES.TONER,
    description: 'Toner acne care untuk membantu menenangkan dan menyeimbangkan kulit berjerawat.',
    benefits: ['Helps with acne', 'Helps with oily', 'Helps with pores'],
    tags: ['Skincare', 'Toner', 'acne', 'oily', 'pores'],
    ingredientNames: ['Centella Asiatica', 'Witch Hazel'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY, SKIN_CONCERNS.PORES],
    minPrice: 49_000,
    maxPrice: 59_000,
    rating: 4.6,
    reviewCount: 13_500,
  },
  {
    brand: 'Whitelab',
    name: 'Niacinamide 5% + Aloe Vera 2% Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum niacinamide + aloe untuk pori, minyak, dan kulit yang mudah iritasi.',
    benefits: ['Helps with pores', 'Helps with oily', 'Helps with sensitive'],
    tags: ['Skincare', 'Serum', 'pores', 'oily', 'sensitive', 'Niacinamide'],
    ingredientNames: ['Niacinamide', 'Aloe Vera'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY, SKIN_CONCERNS.SENSITIVE],
    minPrice: 65_000,
    maxPrice: 79_000,
    rating: 4.7,
    reviewCount: 20_100,
  },
  {
    brand: 'Whitelab',
    name: 'Acne Care Moisturizer',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Moisturizer ringan untuk kulit acne-prone agar tetap terhidrasi.',
    benefits: ['Helps with acne', 'Helps with oily', 'Non-comedogenic'],
    tags: ['Skincare', 'Moisturizer', 'acne', 'oily'],
    ingredientNames: ['Centella Asiatica', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 55_000,
    maxPrice: 69_000,
    rating: 4.6,
    reviewCount: 10_800,
  },

  // —— Implora ——
  {
    brand: 'Implora',
    name: 'Acne Care Facial Wash',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Facial wash affordable untuk membersihkan kulit berjerawat setiap hari.',
    benefits: ['Helps with acne', 'Helps with oily', 'Deep clean'],
    tags: ['Skincare', 'Cleanser', 'acne', 'oily'],
    ingredientNames: ['Tea Tree', 'Salicylic Acid (BHA)'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 15_000,
    maxPrice: 22_000,
    rating: 4.5,
    reviewCount: 9_700,
  },
  {
    brand: 'Implora',
    name: 'Hydrating Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum hidrasi ringan untuk kulit kering dan kusam.',
    benefits: ['Helps with dry', 'Helps with dullness', 'Hydration'],
    tags: ['Skincare', 'Serum', 'dry', 'dullness'],
    ingredientNames: ['Hyaluronic Acid', 'Glycerin'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.DULL],
    minPrice: 18_000,
    maxPrice: 25_000,
    rating: 4.4,
    reviewCount: 7_200,
  },

  // —— Bio Beauty Lab ——
  {
    brand: 'Bio Beauty Lab',
    name: 'Daily Soothing Moisturizer',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Pelembap menenangkan untuk kulit sensitif dan mudah kemerahan.',
    benefits: ['Helps with sensitive', 'Helps with dry', 'Calming'],
    tags: ['Skincare', 'Moisturizer', 'sensitive', 'dry'],
    ingredientNames: ['Centella Asiatica', 'Ceramide'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.DRY],
    minPrice: 89_000,
    maxPrice: 119_000,
    rating: 4.6,
    reviewCount: 6_400,
  },
  {
    brand: 'Bio Beauty Lab',
    name: 'Clarify Acne Spot Gel',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Spot gel untuk membantu meredakan jerawat tanpa membuat kulit terlalu kering.',
    benefits: ['Helps with acne', 'Helps with sensitive', 'Spot care'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'sensitive'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Centella Asiatica'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.SENSITIVE],
    minPrice: 79_000,
    maxPrice: 99_000,
    rating: 4.5,
    reviewCount: 5_100,
  },

  // —— Npure ——
  {
    brand: 'Npure',
    name: 'Centella Asiatica Face Toner',
    step: SKINCARE_TYPES.TONER,
    description: 'Toner centella untuk menenangkan kulit sensitif dan rawan iritasi.',
    benefits: ['Helps with sensitive', 'Helps with acne', 'Calming'],
    tags: ['Skincare', 'Toner', 'sensitive', 'acne'],
    ingredientNames: ['Centella Asiatica', 'Witch Hazel'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.ACNE],
    minPrice: 69_000,
    maxPrice: 89_000,
    rating: 4.7,
    reviewCount: 15_300,
  },
  {
    brand: 'Npure',
    name: 'Noni Probiotics Comfort Cleanser',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Cleanser lembut berbasis noni & probiotics untuk menjaga mikrobiom kulit.',
    benefits: ['Helps with sensitive', 'Gentle cleanse', 'Helps with dry'],
    tags: ['Skincare', 'Cleanser', 'sensitive', 'dry'],
    ingredientNames: ['Noni Extract', 'Probiotics'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.DRY],
    minPrice: 79_000,
    maxPrice: 99_000,
    rating: 4.6,
    reviewCount: 8_200,
  },

  // —— True to Skin ——
  {
    brand: 'True to Skin',
    name: 'Mugwort + BHA Toner',
    step: SKINCARE_TYPES.TONER,
    description: 'Toner mugwort + BHA untuk pori tersumbat dan kulit berminyak.',
    benefits: ['Helps with pores', 'Helps with oily', 'Helps with acne'],
    tags: ['Skincare', 'Toner', 'pores', 'oily', 'acne'],
    ingredientNames: ['Mugwort', 'Salicylic Acid (BHA)'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY, SKIN_CONCERNS.ACNE],
    minPrice: 89_000,
    maxPrice: 109_000,
    rating: 4.6,
    reviewCount: 7_800,
  },
  {
    brand: 'True to Skin',
    name: 'Alive! Instant Soothing Gel',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Gel penenang instan untuk kulit yang kemerahan atau setelah eksfoliasi.',
    benefits: ['Helps with sensitive', 'Helps with acne', 'Soothing'],
    tags: ['Skincare', 'Moisturizer', 'sensitive', 'acne'],
    ingredientNames: ['Centella Asiatica', 'Aloe Vera'],
    concerns: [SKIN_CONCERNS.SENSITIVE, SKIN_CONCERNS.ACNE],
    minPrice: 99_000,
    maxPrice: 119_000,
    rating: 4.7,
    reviewCount: 6_900,
  },

  // —— Hanasui ——
  {
    brand: 'Hanasui',
    name: 'Collagen Water Sunscreen SPF50 PA++++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen watery ringan dengan harga terjangkau untuk proteksi harian.',
    benefits: ['UV protection', 'Lightweight', 'Helps with aging'],
    tags: ['Skincare', 'Sunscreen', 'aging', 'dark spots'],
    ingredientNames: ['UV Filters', 'Collagen'],
    concerns: [SKIN_CONCERNS.AGING, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 25_000,
    maxPrice: 35_000,
    rating: 4.5,
    reviewCount: 16_800,
  },
  {
    brand: 'Hanasui',
    name: 'Serum Vitamin C',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum vitamin C affordable untuk membantu mencerahkan kulit kusam.',
    benefits: ['Helps with dullness', 'Helps with dark spots', 'Brightening'],
    tags: ['Skincare', 'Serum', 'dullness', 'dark spots'],
    ingredientNames: ['Vitamin C', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.DARK_SPOTS],
    minPrice: 20_000,
    maxPrice: 28_000,
    rating: 4.4,
    reviewCount: 11_100,
  },

  // —— Marina ——
  {
    brand: 'Marina',
    name: 'UV White Hydro Boost Essence Sunscreen SPF50 PA++++',
    step: SKINCARE_TYPES.SUNSCREEN,
    description: 'Sunscreen essence lokal dengan hidrasi ringan untuk pemakaian sehari-hari.',
    benefits: ['UV protection', 'Helps with dullness', 'Hydration'],
    tags: ['Skincare', 'Sunscreen', 'dullness', 'aging'],
    ingredientNames: ['UV Filters', 'Hyaluronic Acid'],
    concerns: [SKIN_CONCERNS.DULL, SKIN_CONCERNS.AGING],
    minPrice: 35_000,
    maxPrice: 45_000,
    rating: 4.5,
    reviewCount: 9_300,
  },

  // —— Kahf ——
  {
    brand: 'Kahf',
    name: 'Triple Action Oil and Acne Cleanser',
    step: SKINCARE_TYPES.CLEANSER,
    description: 'Cleanser pria lokal untuk kulit berminyak dan berjerawat.',
    benefits: ['Helps with acne', 'Helps with oily', 'Deep clean'],
    tags: ['Skincare', 'Cleanser', 'acne', 'oily'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Charcoal'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.OILY],
    minPrice: 35_000,
    maxPrice: 45_000,
    rating: 4.6,
    reviewCount: 12_600,
  },
  {
    brand: 'Kahf',
    name: 'Oil and Acne Care Moisturizer',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Moisturizer ringan untuk mengontrol minyak sekaligus menjaga kelembapan.',
    benefits: ['Helps with oily', 'Helps with acne', 'Lightweight'],
    tags: ['Skincare', 'Moisturizer', 'oily', 'acne'],
    ingredientNames: ['Niacinamide', 'Tea Tree'],
    concerns: [SKIN_CONCERNS.OILY, SKIN_CONCERNS.ACNE],
    minPrice: 45_000,
    maxPrice: 55_000,
    rating: 4.5,
    reviewCount: 8_400,
  },

  // —— Elvicto ——
  {
    brand: 'Elvicto',
    name: 'Acne Care Face Serum',
    step: SKINCARE_TYPES.ACNE_TREATMENT,
    description: 'Serum acne care untuk membantu merawat jerawat dan tekstur tidak rata.',
    benefits: ['Helps with acne', 'Helps with pores', 'Helps with oily'],
    tags: ['Skincare', 'Acne Treatment', 'acne', 'pores', 'oily'],
    ingredientNames: ['Salicylic Acid (BHA)', 'Niacinamide'],
    concerns: [SKIN_CONCERNS.ACNE, SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY],
    minPrice: 55_000,
    maxPrice: 69_000,
    rating: 4.5,
    reviewCount: 6_700,
  },

  // —— Dear Me Beauty ——
  {
    brand: 'Dear Me Beauty',
    name: 'Skin Barrier Moisture Gel Cream',
    step: SKINCARE_TYPES.MOISTURIZER,
    description: 'Gel cream pelembap untuk memperkuat barrier tanpa rasa berat.',
    benefits: ['Helps with dry', 'Helps with sensitive', 'Barrier support'],
    tags: ['Skincare', 'Moisturizer', 'dry', 'sensitive'],
    ingredientNames: ['Ceramide', 'Panthenol'],
    concerns: [SKIN_CONCERNS.DRY, SKIN_CONCERNS.SENSITIVE],
    minPrice: 89_000,
    maxPrice: 109_000,
    rating: 4.6,
    reviewCount: 5_900,
  },
  {
    brand: 'Dear Me Beauty',
    name: 'Pore Perfecting Serum',
    step: SKINCARE_TYPES.SERUM,
    description: 'Serum untuk membantu merawat tampilan pori dan kulit berminyak.',
    benefits: ['Helps with pores', 'Helps with oily', 'Texture care'],
    tags: ['Skincare', 'Serum', 'pores', 'oily'],
    ingredientNames: ['Niacinamide', 'Zinc'],
    concerns: [SKIN_CONCERNS.PORES, SKIN_CONCERNS.OILY],
    minPrice: 99_000,
    maxPrice: 119_000,
    rating: 4.5,
    reviewCount: 4_800,
  },
];

export interface SeedIdSkincareOptions {
  replace?: boolean;
  ownerEmail?: string;
}

export async function seedIdSkincare(
  prisma: PrismaClient,
  options: SeedIdSkincareOptions = {},
): Promise<{ created: number; updated: number; total: number; purgedMakeup: number }> {
  const ownerEmail = options.ownerEmail ?? 'affiliator@auraai.local';
  const replace = options.replace ?? false;

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    throw new Error(`Affiliator ${ownerEmail} not found — run the base seed first`);
  }

  // Resolve skincare taxonomy ids
  const steps = await prisma.ingredient.findMany({
    where: { name: { in: Object.values(SKINCARE_TYPES) } },
  });
  const stepByName = new Map(steps.map((s) => [s.name, s.id]));

  let purgedMakeup = 0;

  // Always remove makeup / non-skincare so the live catalog stays skincare-only.
  const nonSkincare = await prisma.product.findMany({
    where: { NOT: { category: { equals: 'Skincare', mode: 'insensitive' } } },
    select: { id: true },
  });
  purgedMakeup = nonSkincare.length;

  const localOwned = replace
    ? await prisma.product.findMany({
        where: {
          category: { equals: 'Skincare', mode: 'insensitive' },
          OR: [{ ownerId: owner.id }, { NOT: { sources: { has: 'local-id-seed' } } }],
        },
        select: { id: true },
      })
    : await prisma.product.findMany({
        where: {
          category: { equals: 'Skincare', mode: 'insensitive' },
          NOT: { sources: { has: 'local-id-seed' } },
        },
        select: { id: true },
      });

  const purgeIds = [...new Set([...nonSkincare, ...localOwned].map((p) => p.id))];
  if (purgeIds.length > 0) {
    await prisma.wishlist.deleteMany({ where: { productId: { in: purgeIds } } });
    await prisma.productIngredient.deleteMany({ where: { productId: { in: purgeIds } } });
    await prisma.recommendationProduct.deleteMany({ where: { productId: { in: purgeIds } } });
    await prisma.product.deleteMany({ where: { id: { in: purgeIds } } });
    console.log(
      `Purged ${purgeIds.length} products (makeup=${purgedMakeup}, skincare refresh=${purgeIds.length - purgedMakeup})`,
    );
  }

  let created = 0;
  let updated = 0;

  for (const item of ID_SKINCARE_PRODUCTS) {
    const slug = slugify(`id-${item.brand}-${item.name}`);
    const stepId = stepByName.get(item.step);
    const data = {
      ownerId: owner.id,
      brand: item.brand,
      name: item.name,
      slug,
      description: item.description,
      imageUrl: null as string | null,
      category: 'Skincare',
      subcategory: item.step,
      finish: null as string | null,
      undertoneMatch: 'universal',
      usage: 'Pakai sesuai petunjuk kemasan. Patch-test disarankan untuk kulit sensitif.',
      benefits: item.benefits,
      tags: [...new Set([...item.tags, ...item.concerns, item.step, 'Indonesia'])],
      ingredientNames: item.ingredientNames,
      uses: [item.step],
      reviewSummary: null as string | null,
      sources: ['local-id-seed'],
      rating: item.rating,
      reviewCount: item.reviewCount,
      minPrice: item.minPrice,
      maxPrice: item.maxPrice,
      sourceUrl: item.affiliateUrl ?? null,
      affiliateUrl:
        item.affiliateUrl ??
        `https://www.sociolla.com/search?q=${encodeURIComponent(`${item.brand} ${item.name}`)}`,
      isActive: true,
      socoId: null as string | null,
    };

    const existing = await prisma.product.findUnique({ where: { slug } });
    const saved = existing
      ? await prisma.product.update({ where: { slug }, data })
      : await prisma.product.create({ data });
    if (existing) updated += 1;
    else created += 1;

    if (stepId) {
      await prisma.productIngredient.deleteMany({ where: { productId: saved.id } });
      await prisma.productIngredient.create({
        data: { productId: saved.id, ingredientId: stepId },
      });
    }
  }

  // Attach Sociolla product photos when the catalog has a close name match.
  try {
    const { fetchSocoBrandCatalog, pickSocoMatch } = await import(
      '../src/shared/services/soco-catalog.js'
    );
    const seeded = await prisma.product.findMany({
      where: {
        sources: { has: 'local-id-seed' },
        OR: [{ imageUrl: null }, { imageUrl: '' }],
      },
      select: { id: true, brand: true, name: true },
    });
    const catalogs = new Map<string, Awaited<ReturnType<typeof fetchSocoBrandCatalog>>>();
    for (const brand of [...new Set(seeded.map((row) => row.brand))]) {
      catalogs.set(brand.toLowerCase(), await fetchSocoBrandCatalog(brand, 60));
    }
    for (const row of seeded) {
      const match = pickSocoMatch(row.name, catalogs.get(row.brand.toLowerCase()) ?? []);
      if (!match?.imageUrl) continue;
      await prisma.product.update({
        where: { id: row.id },
        data: { imageUrl: match.imageUrl, ...(match.sourceUrl ? { sourceUrl: match.sourceUrl } : {}) },
      });
    }
  } catch (error) {
    console.warn(
      'SOCO image attach skipped:',
      error instanceof Error ? error.message : error,
    );
  }

  const total = await prisma.product.count({
    where: { isActive: true, category: { equals: 'Skincare', mode: 'insensitive' } },
  });

  return { created, updated, total, purgedMakeup };
}
