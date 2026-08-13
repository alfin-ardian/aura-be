import { describe, expect, it } from 'vitest';
import { RecommendationRuleEngine } from '@/modules/recommendation/engine/rule-engine.js';
import { MAKEUP_TYPES, SKINCARE_TYPES } from '@/constants/index.js';
import type { ProductDto } from '@/modules/product/interfaces/product.repository.interface.js';

describe('RecommendationRuleEngine (skincare-first)', () => {
  const engine = new RecommendationRuleEngine();

  const sampleProduct = (overrides: Partial<ProductDto> = {}): ProductDto => ({
    id: '00000000-0000-0000-0000-000000000001',
    socoId: 'soco-1',
    ownerId: null,
    brand: 'Wardah',
    name: 'Matte Lip Cream',
    slug: 'wardah-matte-lip-cream',
    description: 'Long wear lip cream',
    imageUrl: null,
    category: 'Lips',
    subcategory: 'Lip Cream',
    finish: 'matte',
    undertoneMatch: 'warm',
    usage: null,
    benefits: [],
    tags: ['Lips', 'Lip Cream', 'matte', 'warm'],
    ingredientNames: [],
    uses: [],
    reviewSummary: null,
    sources: [],
    rating: 4.5,
    reviewCount: 10000,
    minPrice: 55000,
    maxPrice: 55000,
    sourceUrl: null,
    affiliateUrl: 'https://www.sociolla.com/example',
    makeupTypes: [
      {
        id: '1',
        name: MAKEUP_TYPES.LIP_CREAM,
        slug: 'lip-cream',
        description: null,
        benefits: [],
        concerns: [],
      },
    ],
    ...overrides,
  });

  const skincareProduct = (overrides: Partial<ProductDto> = {}): ProductDto =>
    sampleProduct({
      id: '00000000-0000-0000-0000-000000000010',
      brand: 'Somethinc',
      name: 'Calm Down Moisturizer',
      slug: 'somethinc-calm-down',
      description: 'Gentle cream for sensitive combination skin',
      category: 'Skincare',
      subcategory: 'Moisturizer',
      finish: null,
      undertoneMatch: null,
      benefits: ['soothes sensitive skin', 'lightweight'],
      tags: ['Skincare', 'Moisturizer', 'sensitive', 'combination'],
      ingredientNames: ['Centella', 'Ceramide'],
      makeupTypes: [
        {
          id: '2',
          name: SKINCARE_TYPES.MOISTURIZER,
          slug: 'moisturizer',
          description: null,
          benefits: [],
          concerns: ['sensitive'],
        },
      ],
      ...overrides,
    });

  it('suggests foundation and concealer as base makeup types', () => {
    const types = engine.suggestMakeupTypes({
      skinTone: 'Light',
      undertone: 'Warm',
      faceShape: 'Oval',
      confidence: 0.9,
    });
    expect(types).toContain(MAKEUP_TYPES.FOUNDATION);
    expect(types).toContain(MAKEUP_TYPES.CONCEALER);
  });

  it('defaults product types to skincare routine steps', () => {
    const types = engine.suggestProductTypes({
      skinTone: 'Light',
      undertone: 'Warm',
      faceShape: 'Round',
      confidence: 0.8,
      skinType: 'Combination',
      concerns: ['sensitive'],
    });
    expect(types).toContain(SKINCARE_TYPES.CLEANSER);
    expect(types).toContain(SKINCARE_TYPES.MOISTURIZER);
    expect(types).not.toContain(MAKEUP_TYPES.LIP_TINT);
  });

  it('ranks skincare over makeup when both are present', () => {
    const ranked = engine.rankProducts(
      [sampleProduct(), skincareProduct()],
      {
        skinTone: 'Light',
        undertone: 'Warm',
        faceShape: 'Round',
        confidence: 0.8,
        skinType: 'Combination',
        concerns: ['sensitive'],
      },
      {},
      5,
    );

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.product.category === 'Skincare')).toBe(true);
    expect(ranked[0]?.explanations.some((e) => e.toLowerCase().includes('routine'))).toBe(
      true,
    );
  });

  it('prioritizes acne treatment types when acne is detected', () => {
    const types = engine.suggestSkincareTypes({
      skinTone: 'Fair',
      undertone: 'Warm',
      faceShape: 'Round',
      confidence: 0.8,
      skinType: 'Oily',
      concerns: ['acne', 'sensitive'],
    });
    expect(types[0]).toBe(SKINCARE_TYPES.ACNE_TREATMENT);
    expect(types).toContain(SKINCARE_TYPES.EXFOLIATOR);
  });

  it('ranks acne treatment above generic moisturizer for acne concerns', () => {
    const ranked = engine.rankProducts(
      [
        skincareProduct(),
        skincareProduct({
          id: '00000000-0000-0000-0000-000000000011',
          brand: 'COSRX',
          name: 'Centella Blemish Cream',
          subcategory: 'Acne Treatment',
          benefits: ['Helps with acne', 'Helps with oily'],
          tags: ['Skincare', 'Acne Treatment', 'acne', 'oily'],
          ingredientNames: ['Centella Asiatica', 'Zinc'],
          makeupTypes: [
            {
              id: '3',
              name: SKINCARE_TYPES.ACNE_TREATMENT,
              slug: 'acne-treatment',
              description: null,
              benefits: [],
              concerns: ['acne'],
            },
          ],
        }),
      ],
      {
        skinTone: 'Fair',
        undertone: 'Warm',
        faceShape: 'Round',
        confidence: 0.8,
        skinType: 'Oily',
        concerns: ['acne', 'sensitive'],
      },
      {},
      5,
    );

    expect(ranked[0]?.product.subcategory).toBe('Acne Treatment');
    expect(ranked[0]?.explanations.some((e) => e.toLowerCase().includes('acne') || e.toLowerCase().includes('breakout'))).toBe(true);
  });

  it('still ranks makeup when only makeup is available and preferred', () => {
    const ranked = engine.rankProducts(
      [
        sampleProduct(),
        sampleProduct({
          id: '00000000-0000-0000-0000-000000000002',
          brand: 'Other',
          name: 'Random Gel',
          subcategory: 'Nail Polish',
          category: 'Nails',
          minPrice: 900000,
          tags: ['Nails'],
          makeupTypes: [],
          reviewCount: 1,
          rating: 3,
        }),
      ],
      {
        skinTone: 'Light',
        undertone: 'Warm',
        faceShape: 'Oval',
        confidence: 0.9,
      },
      {
        budgetMax: 300_000,
        favoriteBrands: ['Wardah'],
        occasion: 'PARTY',
        finishPreference: 'MATTE',
        preferredCategories: ['Lips'],
      },
      5,
    );

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.product.brand).toBe('Wardah');
    expect(ranked[0]?.explanations.some((e) => e.toLowerCase().includes('warm'))).toBe(true);
  });
});
