import { describe, expect, it } from 'vitest';
import { pickSocoMatch, scoreProductName, type SocoCatalogHit } from '@/shared/services/soco-catalog.js';

function hit(name: string, imageUrl = 'https://images.soco.id/example.jpg'): SocoCatalogHit {
  return {
    id: name,
    brand: 'Azarine',
    name,
    imageUrl,
    description: '',
    category: 'Skincare',
    subcategory: null,
    rating: 4.7,
    reviewCount: 100,
    sourceUrl: null,
  };
}

describe('SOCO product name matching', () => {
  const catalog = [
    hit('Hydramax-C Sunscreen Serum'),
    hit('Hydrashoothe Sunscreen Gel Spf45+++'),
    hit('Calm My Acne Sunscreen Moisturiser SPF 35 PA+++'),
    hit('Pure Radiance Barrier Moisturizer'),
    hit('Brightening C- Glow Serum'),
    hit('Mattelite Lock Lipstick'),
    hit('Bodyguard Moisturiser Sunscreen Serum  Magical Luv'),
    hit('Cicamide Barrier Sunscreen Moisturiser SPF 35 PA+++'),
  ];

  it('scores near-identical names highly', () => {
    expect(
      scoreProductName(
        'Hydramax-C Sunscreen Serum SPF 50 PA++++',
        'Hydramax-C Sunscreen Serum',
      ),
    ).toBeGreaterThan(0.7);
  });

  it('matches AI names onto SOCO catalog rows', () => {
    expect(pickSocoMatch('Hydramax-C Sunscreen Serum SPF 50 PA++++', catalog)?.name).toBe(
      'Hydramax-C Sunscreen Serum',
    );
    expect(pickSocoMatch('Mattelite Lock Lipstick', catalog)?.name).toBe('Mattelite Lock Lipstick');
    expect(pickSocoMatch('Brightening C-Glow Serum', catalog)?.name).toBe(
      'Brightening C- Glow Serum',
    );
  });
});
