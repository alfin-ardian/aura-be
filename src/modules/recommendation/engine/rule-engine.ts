import {
  MAKEUP_TYPES,
  SKINCARE_TYPES,
  SKIN_CONCERNS,
  TOP_N_RECOMMENDATIONS,
} from '../../../constants/index.js';
import type { ProductDto } from '../../product/interfaces/product.repository.interface.js';

export interface BeautyAnalysisInput {
  skinTone: string;
  undertone: string;
  faceShape: string;
  confidence: number;
  /** Optional skin type from the AI model (Oily, Dry, Combination, …). */
  skinType?: string | null;
  /** Optional skin concerns from the AI model (acne, oily, dry, …). */
  concerns?: string[];
}

export interface BeautyPreferencesInput {
  budgetMax?: number | null;
  favoriteBrands?: string[];
  occasion?: string | null;
  finishPreference?: string | null;
  preferredCategories?: string[];
}

export interface ScoredProductMatch {
  product: ProductDto;
  /** Unbounded internal score used for ranking. */
  rawScore: number;
  /** Raw score mapped onto a 0–99 display percentage. */
  matchScore: number;
  explanations: string[];
  makeupTypes: string[];
}

/**
 * Raw scores are unbounded sums of signals, so they are mapped onto a display
 * percentage instead of clamped — otherwise every strong match reads as 99%.
 */
const EXCELLENT_MATCH_SCORE = 130;

function toMatchPercentage(rawScore: number): number {
  const pct = (Math.max(0, rawScore) / EXCELLENT_MATCH_SCORE) * 100;
  return Math.round(Math.min(99, pct) * 10) / 10;
}

/**
 * Rule-based beauty recommender (PRD Features 3–4).
 * Public scan recommendations are skincare-first; makeup helpers remain for
 * future preference toggles.
 */
export class RecommendationRuleEngine {
  /** Makeup types suggested from face traits + occasion. */
  suggestMakeupTypes(
    analysis: BeautyAnalysisInput,
    preferences: BeautyPreferencesInput = {},
  ): string[] {
    const types = new Set<string>();
    const occasion = preferences.occasion?.toUpperCase() ?? 'DAILY';
    const finish = preferences.finishPreference?.toUpperCase() ?? 'NATURAL';

    // Base face makeup always relevant
    types.add(MAKEUP_TYPES.FOUNDATION);
    types.add(MAKEUP_TYPES.CONCEALER);

    if (finish === 'MATTE' || analysis.undertone) {
      types.add(MAKEUP_TYPES.POWDER);
    }
    if (finish === 'DEWY' || finish === 'NATURAL') {
      types.add(MAKEUP_TYPES.CUSHION);
    }

    // Face shape → eye / brow emphasis
    const shape = analysis.faceShape.toLowerCase();
    if (['heart', 'diamond', 'oblong'].includes(shape)) {
      types.add(MAKEUP_TYPES.BROW);
      types.add(MAKEUP_TYPES.EYESHADOW);
    }
    if (['round', 'square'].includes(shape)) {
      types.add(MAKEUP_TYPES.BLUSH);
      types.add(MAKEUP_TYPES.MASCARA);
    }
    if (shape === 'oval') {
      types.add(MAKEUP_TYPES.BLUSH);
      types.add(MAKEUP_TYPES.LIP_TINT);
    }

    // Occasion
    if (occasion === 'PARTY' || occasion === 'WEDDING') {
      types.add(MAKEUP_TYPES.EYESHADOW);
      types.add(MAKEUP_TYPES.LIP_CREAM);
      types.add(MAKEUP_TYPES.MASCARA);
    } else {
      types.add(MAKEUP_TYPES.LIP_TINT);
    }

    // Preferred categories from questionnaire
    for (const cat of preferences.preferredCategories ?? []) {
      const c = cat.toLowerCase();
      if (c === 'lips') {
        types.add(MAKEUP_TYPES.LIP_CREAM);
        types.add(MAKEUP_TYPES.LIP_TINT);
      }
      if (c === 'eyes') {
        types.add(MAKEUP_TYPES.EYESHADOW);
        types.add(MAKEUP_TYPES.MASCARA);
        types.add(MAKEUP_TYPES.BROW);
      }
      if (c === 'cheeks' || c === 'face') {
        types.add(MAKEUP_TYPES.BLUSH);
        types.add(MAKEUP_TYPES.FOUNDATION);
      }
    }

    return [...types];
  }

  /**
   * Skincare routine steps suggested from the scan.
   * Core steps are always relevant; extras come from detected skin concerns.
   */
  suggestSkincareTypes(
    analysis: BeautyAnalysisInput,
    preferences: BeautyPreferencesInput = {},
  ): string[] {
    const concerns = this.resolveConcerns(analysis);
    const hasAcne = concerns.includes(SKIN_CONCERNS.ACNE);

    // When acne is detected, lead with treatment steps before general routine.
    const types = new Set<string>(
      hasAcne
        ? [
            SKINCARE_TYPES.ACNE_TREATMENT,
            SKINCARE_TYPES.CLEANSER,
            SKINCARE_TYPES.EXFOLIATOR,
            SKINCARE_TYPES.MOISTURIZER,
            SKINCARE_TYPES.SUNSCREEN,
            SKINCARE_TYPES.SERUM,
            SKINCARE_TYPES.TONER,
          ]
        : [
            SKINCARE_TYPES.CLEANSER,
            SKINCARE_TYPES.MOISTURIZER,
            SKINCARE_TYPES.SUNSCREEN,
            SKINCARE_TYPES.SERUM,
          ],
    );

    for (const concern of concerns) {
      if (concern === SKIN_CONCERNS.ACNE) {
        types.add(SKINCARE_TYPES.ACNE_TREATMENT);
        types.add(SKINCARE_TYPES.EXFOLIATOR);
      }
      if (concern === SKIN_CONCERNS.OILY) types.add(SKINCARE_TYPES.TONER);
      if (concern === SKIN_CONCERNS.DRY) types.add(SKINCARE_TYPES.ESSENCE);
      if (concern === SKIN_CONCERNS.DULL) types.add(SKINCARE_TYPES.ESSENCE);
      if (concern === SKIN_CONCERNS.AGING) types.add(SKINCARE_TYPES.EYE_CARE);
      if (concern === SKIN_CONCERNS.DARK_SPOTS) types.add(SKINCARE_TYPES.SERUM);
      if (concern === SKIN_CONCERNS.SENSITIVE) types.add(SKINCARE_TYPES.MOISTURIZER);
    }

    for (const cat of preferences.preferredCategories ?? []) {
      if (cat.toLowerCase() === 'skincare') types.add(SKINCARE_TYPES.MASK);
    }

    return [...types];
  }

  /**
   * Catalog pre-filter types. Defaults to skincare routine steps so public
   * recommendations focus on skin care rather than makeup.
   */
  suggestProductTypes(
    analysis: BeautyAnalysisInput,
    preferences: BeautyPreferencesInput = {},
  ): string[] {
    const preferred = (preferences.preferredCategories ?? []).map((c) => c.toLowerCase());
    const wantsMakeup = preferred.some((c) =>
      ['makeup', 'lips', 'eyes', 'cheeks', 'face'].includes(c),
    );
    const wantsSkincare =
      preferred.length === 0 || preferred.some((c) => c === 'skincare') || !wantsMakeup;

    if (wantsSkincare && !wantsMakeup) {
      return this.suggestSkincareTypes(analysis, preferences);
    }
    if (wantsMakeup && !wantsSkincare) {
      return this.suggestMakeupTypes(analysis, preferences);
    }
    return [
      ...new Set([
        ...this.suggestSkincareTypes(analysis, preferences),
        ...this.suggestMakeupTypes(analysis, preferences),
      ]),
    ];
  }

  /**
   * Derive skin concerns from the scan.
   * Uses AI-provided concerns when available, otherwise infers from skin tone.
   */
  private resolveConcerns(analysis: BeautyAnalysisInput): string[] {
    const provided = (analysis.concerns ?? []).map((c) => c.toLowerCase()).filter(Boolean);
    if (provided.length > 0) return [...new Set(provided)];

    const tone = analysis.skinTone.toLowerCase();
    const concerns = new Set<string>([SKIN_CONCERNS.DRY]);
    if (['tan', 'deep'].includes(tone)) concerns.add(SKIN_CONCERNS.DARK_SPOTS);
    if (['fair', 'light'].includes(tone)) concerns.add(SKIN_CONCERNS.SENSITIVE);
    if (analysis.undertone.toLowerCase() === 'warm') concerns.add(SKIN_CONCERNS.DULL);
    return [...concerns];
  }

  /**
   * Score and rank products. Returns Top N with explanations.
   * Skincare candidates take priority whenever the catalog has them.
   */
  rankProducts(
    products: ProductDto[],
    analysis: BeautyAnalysisInput,
    preferences: BeautyPreferencesInput = {},
    limit = TOP_N_RECOMMENDATIONS,
  ): ScoredProductMatch[] {
    const preferredCats = (preferences.preferredCategories ?? []).map((c) =>
      c.toLowerCase(),
    );
    const forceMakeup = preferredCats.some((c) =>
      ['makeup', 'lips', 'eyes', 'cheeks', 'face'].includes(c),
    );
    const skincarePool = products.filter(
      (p) => p.category.toLowerCase() === 'skincare',
    );
    const pool =
      !forceMakeup && skincarePool.length > 0 ? skincarePool : products;

    const preferredTypes = new Set(
      this.suggestProductTypes(analysis, preferences).map((t) => t.toLowerCase()),
    );
    const concerns = this.resolveConcerns(analysis);
    const favoriteBrands = new Set(
      (preferences.favoriteBrands ?? []).map((b) => b.toLowerCase()),
    );
    const finishPref = preferences.finishPreference?.toLowerCase() ?? null;
    const undertone = analysis.undertone.toLowerCase();
    const skinType = (analysis.skinType ?? '').toLowerCase();
    const budgetMax = preferences.budgetMax ?? null;
    const preferredCatSet = new Set(preferredCats);
    const occasion = preferences.occasion?.toUpperCase() ?? 'DAILY';

    const scored = pool.map((product) => {
      let score = 0;
      const explanations: string[] = [];

      const sub = (product.subcategory ?? '').toLowerCase();
      const tags = product.tags.map((t) => t.toLowerCase());
      const typeNames = product.makeupTypes.map((t) => t.name.toLowerCase());
      const haystack = [sub, ...tags, ...typeNames];
      const isSkincare = product.category.toLowerCase() === 'skincare';
      const benefitsLower = product.benefits.map((b) => b.toLowerCase());

      const matchedTypes = [...preferredTypes].filter((t) =>
        haystack.some((h) => h.includes(t) || t.includes(h)),
      );
      if (matchedTypes.length > 0) {
        score += 35 + Math.min(matchedTypes.length, 3) * 5;
        explanations.push(
          isSkincare
            ? `Routine step: ${product.subcategory ?? matchedTypes[0]}`
            : `Matches makeup type: ${product.subcategory ?? matchedTypes[0]}`,
        );
      }

      if (isSkincare) {
        // Prefer skincare in mixed catalogs (safety net if pool wasn't filtered)
        score += 25;

        const matchedConcerns = concerns.filter((concern) =>
          [...tags, ...benefitsLower, ...product.ingredientNames.map((n) => n.toLowerCase())].some(
            (value) => value.includes(concern),
          ),
        );
        if (matchedConcerns.length > 0) {
          score += 18 + Math.min(matchedConcerns.length, 3) * 8;
          explanations.push(`Targets ${matchedConcerns.join(', ')}`);
        }

        // Acne is the priority concern — push treatment / BHA products up.
        if (concerns.includes(SKIN_CONCERNS.ACNE)) {
          const acneProduct =
            sub.includes('acne') ||
            tags.includes('acne') ||
            typeNames.some((n) => n.includes('acne')) ||
            benefitsLower.some((b) => b.includes('acne'));
          if (acneProduct) {
            score += 28;
            explanations.push('Helps calm breakouts');
          }
        }

        if (skinType) {
          const skinTypeHit =
            tags.some((t) => t.includes(skinType)) ||
            benefitsLower.some((b) => b.includes(skinType)) ||
            product.description.toLowerCase().includes(skinType);
          if (skinTypeHit) {
            score += 16;
            explanations.push(`Fits ${analysis.skinType} skin`);
          }
        }

        if (product.ingredientNames.length > 0) {
          score += 5;
          explanations.push(
            `Key actives: ${product.ingredientNames.slice(0, 2).join(', ')}`,
          );
        }
      }

      // Undertone is mainly a makeup signal; keep it soft for skincare
      const productUndertone = (product.undertoneMatch ?? '').toLowerCase();
      const undertoneHit =
        productUndertone === undertone ||
        productUndertone === 'universal' ||
        tags.includes(undertone) ||
        tags.includes(`${undertone} undertone`);
      if (!isSkincare && (undertoneHit || (!productUndertone && matchedTypes.length > 0))) {
        score += 20;
        explanations.push(`${analysis.undertone} undertone`);
      } else if (isSkincare && undertoneHit) {
        score += 4;
      }

      // Finish preference (makeup)
      const finish = (product.finish ?? '').toLowerCase();
      if (!isSkincare && finishPref && (finish === finishPref || tags.includes(finishPref))) {
        score += 15;
        explanations.push(`${preferences.finishPreference} finish`);
      } else if (!isSkincare && !finishPref && finish === 'natural') {
        score += 5;
      }

      // Budget
      const price = product.minPrice ?? product.maxPrice;
      if (budgetMax != null && price != null && price <= budgetMax) {
        score += 15;
        explanations.push(`Budget under Rp${budgetMax.toLocaleString('id-ID')}`);
      } else if (budgetMax != null && price == null) {
        score += 5;
      } else if (budgetMax != null && price != null && price > budgetMax) {
        score -= 20;
      }

      // Favorite brands
      if (favoriteBrands.has(product.brand.toLowerCase())) {
        score += 12;
        explanations.push(`Favorite brand: ${product.brand}`);
      }

      // Preferred category
      if (preferredCatSet.has(product.category.toLowerCase())) {
        score += 10;
        explanations.push(`Preferred category: ${product.category}`);
      }

      // Occasion suitability — makeup only
      if (!isSkincare) {
        if (occasion === 'DAILY' || occasion === 'CASUAL' || occasion === 'WORK') {
          if (sub.includes('tint') || sub.includes('cushion') || finish === 'natural') {
            score += 8;
            explanations.push(`Suitable for ${occasion.toLowerCase()} makeup`);
          }
        }
        if (occasion === 'PARTY' || occasion === 'WEDDING') {
          if (sub.includes('palette') || sub.includes('cream') || sub.includes('mascara')) {
            score += 8;
            explanations.push(`Suitable for ${occasion.toLowerCase()}`);
          }
        }
        explanations.push(`Face shape: ${analysis.faceShape}`);
      }

      // Social proof
      score += Math.min(10, (product.reviewCount ?? 0) / 2000);
      if (product.rating != null) score += product.rating;

      // Skin tone mention in tags/benefits
      if (
        tags.some((t) => t.includes(analysis.skinTone.toLowerCase())) ||
        benefitsLower.some((b) => b.includes(analysis.skinTone.toLowerCase()))
      ) {
        score += 8;
        explanations.push(`Works with ${analysis.skinTone} skin tone`);
      }

      const uniqueExplanations = [...new Set(explanations)].slice(0, 5);

      return {
        product,
        rawScore: score,
        matchScore: toMatchPercentage(score),
        explanations: uniqueExplanations,
        makeupTypes: matchedTypes,
      };
    });

    return scored
      .filter((s) => s.rawScore > 15)
      .sort((a, b) => b.rawScore - a.rawScore)
      .slice(0, limit);
  }
}
