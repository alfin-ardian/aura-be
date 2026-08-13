import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthenticateApiKey } from '../../middlewares/authenticate-api-key.js';
import { handleMulterError, uploadScanImage } from '../../middlewares/index.js';
import { UnauthorizedError, ValidationError } from '../../shared/errors/app-error.js';
import type { IAiClient } from '../../shared/services/ai-client.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { sendSuccess } from '../../shared/utils/api-response.js';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';

/**
 * White-label partner API (`/v1/*`) — authenticated with Aura API keys.
 */
export function createPartnerApiModule(deps: {
  db: PrismaClient;
  aiClient: IAiClient;
}): Router {
  const router = Router();
  const authenticateApiKey = createAuthenticateApiKey(deps.db);

  const upload = (
    req: Parameters<typeof uploadScanImage>[0],
    res: Parameters<typeof uploadScanImage>[1],
    next: Parameters<typeof uploadScanImage>[2],
  ) => {
    uploadScanImage(req, res, (err: unknown) => {
      if (err) {
        handleMulterError(err, req, res, next);
        return;
      }
      next();
    });
  };

  router.get(
    '/me',
    authenticateApiKey,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      sendSuccess(res, {
        partnerId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        apiKeyId: req.apiKeyId,
      });
    }),
  );

  /**
   * Core white-label AI analysis.
   * Multipart field: `image` (JPEG/PNG/WebP).
   */
  router.post(
    '/analyze',
    authenticateApiKey,
    upload,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      if (!req.file?.path) {
        throw new ValidationError('Image file is required (field name: image)');
      }

      try {
        const prediction = await deps.aiClient.predict(req.file.path, req.file.mimetype);
        sendSuccess(res, {
          partnerId: req.user.id,
          analysis: {
            skinTone: prediction.skin_tone,
            undertone: prediction.undertone,
            faceShape: prediction.face_shape,
            confidence: prediction.confidence,
            skinType: prediction.skin_type ?? null,
            acne: prediction.acne ?? null,
            oiliness: prediction.oiliness ?? null,
            redness: prediction.redness ?? null,
            concerns: prediction.concerns,
            modelVersion: prediction.model_version,
          },
        });
      } finally {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
    }),
  );

  return router;
}
