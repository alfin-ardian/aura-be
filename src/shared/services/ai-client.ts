import axios, { type AxiosInstance, isAxiosError } from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';
import { z } from 'zod';
import { appConfig } from '../../config/index.js';
import { AiServiceError, UnprocessableError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

/**
 * AURA AI contract (PRD Feature 1).
 * Backend NEVER performs inference — only orchestrates.
 */
export const aiPredictionSchema = z.object({
  skin_tone: z.enum(['Fair', 'Light', 'Medium', 'Tan', 'Deep']),
  undertone: z.enum(['Warm', 'Cool', 'Neutral']),
  face_shape: z.enum(['Oval', 'Round', 'Square', 'Heart', 'Oblong', 'Diamond']),
  confidence: z.number().min(0).max(1),
  /** Skin fields are present only when the AuraVision model is loaded. */
  skin_type: z.string().nullish(),
  acne: z.number().int().min(0).max(100).nullish(),
  oiliness: z.number().int().min(0).max(100).nullish(),
  redness: z.number().int().min(0).max(100).nullish(),
  concerns: z.array(z.string()).default([]),
  model_version: z.string().default('heuristic-v1'),
});

export type AiPrediction = z.infer<typeof aiPredictionSchema>;

export interface IAiClient {
  predict(imagePath: string, mimeType: string): Promise<AiPrediction>;
}

export class AiClient implements IAiClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl = appConfig.ai.baseUrl, timeoutMs = appConfig.ai.timeoutMs) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: timeoutMs,
    });
  }

  async predict(imagePath: string, mimeType: string): Promise<AiPrediction> {
    const started = Date.now();
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath), {
      contentType: mimeType,
      filename: 'scan.jpg',
    });

    try {
      const response = await this.http.post(appConfig.ai.predictPath, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
      });

      const parsed = aiPredictionSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new AiServiceError('AI service returned an invalid payload', parsed.error.issues);
      }

      logger.info('AI beauty analysis completed', {
        durationMs: Date.now() - started,
        skinTone: parsed.data.skin_tone,
        undertone: parsed.data.undertone,
        faceShape: parsed.data.face_shape,
        confidence: parsed.data.confidence,
        modelVersion: parsed.data.model_version,
        concerns: parsed.data.concerns,
      });

      return parsed.data;
    } catch (error) {
      logger.error('AI beauty analysis failed', {
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : 'unknown',
      });

      if (error instanceof AiServiceError) {
        throw error;
      }

      if (isAxiosError(error)) {
        const status = error.response?.status;
        const detail =
          typeof error.response?.data === 'object' &&
          error.response?.data !== null &&
          'detail' in error.response.data
            ? String((error.response.data as { detail: unknown }).detail)
            : error.message;

        if (status === 400) {
          throw new UnprocessableError(detail || 'Invalid image for AI analysis');
        }
        if (status === 404) {
          throw new UnprocessableError(detail || 'No face detected in image');
        }
        throw new AiServiceError(detail || 'AI service error', { status });
      }

      throw new AiServiceError('Failed to reach AI service');
    }
  }
}
