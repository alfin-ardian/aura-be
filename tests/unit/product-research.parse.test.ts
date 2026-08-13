import { describe, expect, it } from 'vitest';
import {
  extractJsonObject,
  isVerifiedResearchedProduct,
  normalizeResearchedProduct,
  parseResearchedProducts,
  researchedProductSchema,
} from '@/shared/services/openai-product-research.js';

describe('product research JSON parsing', () => {
  it('extracts a fenced JSON object', () => {
    const parsed = extractJsonObject(`
Here you go:
\`\`\`json
{"brand":"SKINTIFIC","name":"5X Ceramide Gel","description":"Moisturizer"}
\`\`\`
`);
    expect(parsed).toMatchObject({ brand: 'SKINTIFIC' });
  });

  it('accepts a valid researched product', () => {
    const parsed = researchedProductSchema.parse({
      brand: 'SKINTIFIC',
      name: '5X Ceramide Barrier Repair Moisture Gel',
      image: 'https://example.com/p.png',
      description: 'Gel moisturizer for skin barrier.',
      ingredients: ['Ceramide', 'Hyaluronic Acid'],
      uses: ['Menjaga skin barrier'],
      reviewSummary: 'Mayoritas pengguna menyukai teksturnya.',
      rating: 4.8,
      sources: ['https://skintific.com'],
    });
    expect(parsed.category).toBe('Skincare');
    expect(parsed.ingredients).toHaveLength(2);
  });

  it('accepts null optional fields from the model', () => {
    const parsed = researchedProductSchema.parse(
      normalizeResearchedProduct(
        {
          brand: null,
          name: null,
          image: null,
          description: null,
          ingredients: null,
          uses: 'Melembapkan kulit',
          reviewSummary: null,
          rating: null,
          reviewCount: null,
          sources: null,
        },
        'skintific 5x ceramide',
      ),
    );
    expect(parsed.brand.toLowerCase()).toContain('skintific');
    expect(parsed.name).toContain('skintific');
    expect(parsed.reviewCount ?? null).toBeNull();
    expect(parsed.uses).toEqual(['Melembapkan kulit']);
  });

  it('rejects unverified placeholder payloads', () => {
    const parsed = researchedProductSchema.parse(
      normalizeResearchedProduct(
        {
          found: false,
          brand: 'Unknown',
          name: 'larazin',
          description:
            'I could not verify a public beauty, skincare, or makeup product called "larazin".',
          subcategory: 'Unknown',
          ingredients: [],
          uses: [],
          reviewSummary: 'Public user sentiment is unclear because I could not find a listing.',
          sources: ['https://laranproducts.com/'],
        },
        'larazin',
      ),
    );
    expect(isVerifiedResearchedProduct(parsed, 'larazin')).toBe(false);
  });

  it('parses a products list and drops unverified items', () => {
    const products = parseResearchedProducts(
      JSON.stringify({
        products: [
          {
            brand: 'Azarine',
            name: 'Hydrasoothe Sunscreen Gel SPF45',
            image: 'https://example.com/azarine.png',
            description: 'Lightweight sunscreen gel for daily use.',
            ingredients: ['Niacinamide'],
            uses: ['Sun protection'],
            sources: ['https://azarinecosmetic.com'],
          },
          {
            found: false,
            brand: 'Unknown',
            name: 'larazin',
            description: 'I could not verify a public beauty product.',
          },
        ],
      }),
      'larazin',
    );
    expect(products).toHaveLength(1);
    expect(products[0]?.brand).toBe('Azarine');
  });
});
