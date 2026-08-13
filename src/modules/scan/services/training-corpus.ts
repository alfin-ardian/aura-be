import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../../config/env.js';
import { logger } from '../../../shared/utils/logger.js';

export interface TrainingCorpusEntry {
  scanId: string;
  imagePath: string;
  skinTone: string;
  undertone: string;
  faceShape: string;
  confidence: number;
  skinType: string | null;
  concerns: string[];
  /** Model scores kept as *suggested* labels — never treated as ground truth. */
  acne: number | null;
  oiliness: number | null;
  redness: number | null;
  modelVersion: string | null;
  createdAt: string;
}

/**
 * Persist consented selfies into an adaptive-learning corpus
 * (`uploads/training/`) for future offline model improvement.
 */
export async function appendTrainingCorpusSample(input: {
  scanId: string;
  sourcePath: string;
  skinTone: string;
  undertone: string;
  faceShape: string;
  confidence: number;
  skinType?: string | null;
  concerns?: string[];
  acne?: number | null;
  oiliness?: number | null;
  redness?: number | null;
  modelVersion?: string | null;
}): Promise<string | null> {
  try {
    const root = path.resolve(config.UPLOAD_DIR, 'training');
    await fs.mkdir(root, { recursive: true });

    const ext = path.extname(input.sourcePath) || '.jpg';
    const destName = `${input.scanId}${ext}`;
    const destPath = path.join(root, destName);
    await fs.copyFile(input.sourcePath, destPath);

    const entry: TrainingCorpusEntry = {
      scanId: input.scanId,
      imagePath: destName,
      skinTone: input.skinTone,
      undertone: input.undertone,
      faceShape: input.faceShape,
      confidence: input.confidence,
      skinType: input.skinType ?? null,
      concerns: input.concerns ?? [],
      acne: input.acne ?? null,
      oiliness: input.oiliness ?? null,
      redness: input.redness ?? null,
      modelVersion: input.modelVersion ?? null,
      createdAt: new Date().toISOString(),
    };

    await fs.appendFile(
      path.join(root, 'manifest.jsonl'),
      `${JSON.stringify(entry)}\n`,
      'utf8',
    );

    return destPath;
  } catch (error) {
    logger.warn('Failed to append adaptive training sample', {
      scanId: input.scanId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
