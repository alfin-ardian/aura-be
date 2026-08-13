import fs from 'node:fs/promises';
import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { IAiClient } from '../../../shared/services/ai-client.js';
import { logger } from '../../../shared/utils/logger.js';
import type { ScanResponseDto } from '../../recommendation/dto/recommendation.dto.js';
import type { RecommendationService } from '../../recommendation/services/recommendation.service.js';
import type { BeautyPreferencesInput } from '../../recommendation/engine/rule-engine.js';
import type { IHistoryRepository, IScanRepository } from '../repositories/scan.repository.js';
import { appendTrainingCorpusSample } from './training-corpus.js';

export interface ScanUpload {
  path: string;
  mimetype: string;
}

export interface PreferenceReader {
  getPreferences(userId: string): Promise<BeautyPreferencesInput>;
}

/**
 * Scan orchestration (PRD Feature 1 + optional Feature 3):
 * Validate → AI beauty analysis → persist → recommend if preferences exist.
 */
export class ScanService {
  constructor(
    private readonly aiClient: IAiClient,
    private readonly scanRepository: IScanRepository,
    private readonly historyRepository: IHistoryRepository,
    private readonly recommendationService: RecommendationService,
    private readonly preferenceReader?: PreferenceReader,
  ) {}

  /**
   * Authenticated scan (affiliator preview / own account).
   * Recommendations only when beauty preferences exist.
   */
  async performScan(userId: string, file: ScanUpload | undefined): Promise<ScanResponseDto> {
    return this.runScan({
      ownerUserId: userId,
      file,
      alwaysRecommend: false,
    });
  }

  /**
   * Public follower scan — no login required.
   * Attributed to the affiliator (`ownerUserId`); always returns product matches.
   */
  async performPublicScan(
    ownerUserId: string,
    file: ScanUpload | undefined,
    options?: {
      guestName?: string;
      channel?: 'referral' | 'qr';
      trainingConsent?: boolean;
    },
  ): Promise<ScanResponseDto> {
    return this.runScan({
      ownerUserId,
      file,
      alwaysRecommend: true,
      guestName: options?.guestName,
      channel: options?.channel,
      trainingConsent: options?.trainingConsent ?? false,
    });
  }

  /**
   * Guest result page — no JWT. Optional affiliatorId must match the scan owner.
   * Rebuilds product matches when the catalog changed and left an empty recommendation.
   */
  async getPublicResult(scanId: string, affiliatorId?: string): Promise<ScanResponseDto & { affiliatorId: string }> {
    let scan = await this.scanRepository.findPublicById(scanId);
    if (!scan || (affiliatorId && scan.userId !== affiliatorId)) {
      throw new NotFoundError('Scan not found');
    }

    const linkedCount = scan.recommendation?.products?.length ?? 0;
    if (linkedCount === 0) {
      await this.recommendationService.generateAndPersist(
        scan.userId,
        scan.id,
        {
          skinTone: scan.skinTone,
          undertone: scan.undertone,
          faceShape: scan.faceShape,
          confidence: scan.confidence,
          skinType: scan.skinType,
          concerns: scan.concerns,
        },
        {},
      );
      scan = await this.scanRepository.findPublicById(scanId);
      if (!scan) {
        throw new NotFoundError('Scan not found');
      }
    }

    const products = (scan.recommendation?.products ?? []).map((row) => ({
      id: row.product.id,
      socoId: null,
      ownerId: null,
      brand: row.product.brand,
      name: row.product.name,
      slug: '',
      description: row.product.description,
      imageUrl: row.product.imageUrl,
      category: row.product.category,
      subcategory: row.product.subcategory,
      finish: null,
      undertoneMatch: null,
      usage: null,
      benefits: [] as string[],
      tags: [] as string[],
      ingredientNames: [] as string[],
      uses: [] as string[],
      reviewSummary: null,
      sources: [] as string[],
      rating: null,
      reviewCount: 0,
      minPrice: null,
      maxPrice: null,
      sourceUrl: row.product.sourceUrl,
      affiliateUrl: row.product.affiliateUrl,
      makeupTypes: [],
      matchScore: row.matchScore,
      explanations: row.explanations,
    }));

    return {
      scanId: scan.id,
      affiliatorId: scan.userId,
      analysis: {
        skinTone: scan.skinTone,
        undertone: scan.undertone,
        faceShape: scan.faceShape,
        confidence: scan.confidence,
        skinType: scan.skinType,
        concerns: scan.concerns,
      },
      recommendationId: scan.recommendation?.id,
      recommendation: scan.recommendation
        ? {
            makeupTypes: scan.recommendation.ingredients.map((row) => ({
              id: row.ingredient.id,
              name: row.ingredient.name,
              slug: row.ingredient.slug,
              description: null,
              benefits: [],
              concerns: [],
            })),
            products,
          }
        : undefined,
    };
  }

  private async runScan(input: {
    ownerUserId: string;
    file: ScanUpload | undefined;
    alwaysRecommend: boolean;
    guestName?: string;
    channel?: 'referral' | 'qr';
    trainingConsent?: boolean;
  }): Promise<ScanResponseDto> {
    const {
      ownerUserId,
      file,
      alwaysRecommend,
      guestName,
      channel,
      trainingConsent = false,
    } = input;

    if (!file) {
      throw new ValidationError('Image file is required (field name: image)');
    }

    let prediction;
    try {
      prediction = await this.aiClient.predict(file.path, file.mimetype);
    } catch (error) {
      await this.safeUnlink(file.path);
      throw error;
    }

    const keepImage = trainingConsent;
    const scan = await this.scanRepository.create({
      userId: ownerUserId,
      imagePath: keepImage ? file.path : null,
      prediction,
      guestName,
      channel,
      trainingConsent: keepImage,
    });

    if (keepImage) {
      await appendTrainingCorpusSample({
        scanId: scan.id,
        sourcePath: file.path,
        skinTone: prediction.skin_tone,
        undertone: prediction.undertone,
        faceShape: prediction.face_shape,
        confidence: prediction.confidence,
        skinType: prediction.skin_type ?? null,
        concerns: prediction.concerns ?? [],
        acne: prediction.acne ?? null,
        oiliness: prediction.oiliness ?? null,
        redness: prediction.redness ?? null,
        modelVersion: prediction.model_version ?? null,
      });
    } else {
      await this.safeUnlink(file.path);
    }

    const analysis = {
      skinTone: prediction.skin_tone,
      undertone: prediction.undertone,
      faceShape: prediction.face_shape,
      confidence: prediction.confidence,
      skinType: prediction.skin_type ?? null,
      concerns: prediction.concerns ?? [],
    };

    const baseSummary = `${prediction.skin_tone} · ${prediction.undertone} undertone · ${prediction.face_shape}`;
    const summary = guestName ? `${guestName}: ${baseSummary}` : baseSummary;
    await this.historyRepository.create({
      userId: ownerUserId,
      scanId: scan.id,
      summary,
    });

    const preferences = this.preferenceReader
      ? await this.preferenceReader.getPreferences(ownerUserId)
      : {};

    const hasPreferences =
      preferences.budgetMax != null ||
      (preferences.favoriteBrands?.length ?? 0) > 0 ||
      preferences.occasion != null ||
      preferences.finishPreference != null ||
      (preferences.preferredCategories?.length ?? 0) > 0;

    let response: ScanResponseDto = {
      scanId: scan.id,
      analysis,
    };

    if (alwaysRecommend || hasPreferences) {
      const recommendation = await this.recommendationService.generateAndPersist(
        ownerUserId,
        scan.id,
        analysis,
        preferences,
      );
      response = {
        ...response,
        recommendationId: recommendation.recommendationId,
        recommendation: {
          makeupTypes: recommendation.makeupTypes,
          products: recommendation.products,
        },
      };
    }

    logger.info('Beauty scan completed', {
      userId: ownerUserId,
      scanId: scan.id,
      public: alwaysRecommend,
      trainingConsent: keepImage,
      ...analysis,
      recommended: Boolean(response.recommendationId),
    });

    return response;
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // best-effort cleanup
    }
  }
}
