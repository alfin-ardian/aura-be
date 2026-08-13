import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { generateSecureToken, sha256 } from '../../shared/utils/crypto.js';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.js';
import type { Request, Response } from 'express';

const createKeySchema = z.object({
  name: z.string().min(2).max(80).transform((value) => value.trim()),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function mintApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const secret = generateSecureToken(24);
  const rawKey = `aura_${secret}`;
  return {
    rawKey,
    keyPrefix: `${rawKey.slice(0, 12)}…`,
    keyHash: sha256(rawKey),
  };
}

export function createApiKeysModule(db: PrismaClient): Router {
  const router = Router();

  router.use(authenticate, authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN));

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const rows = await db.apiKey.findMany({
        where: { userId: req.user.id, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          createdAt: true,
        },
      });
      sendSuccess(res, rows);
    }),
  );

  router.post(
    '/',
    validateRequest(createKeySchema),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { name } = req.body as z.infer<typeof createKeySchema>;
      const existing = await db.apiKey.count({
        where: { userId: req.user.id, revokedAt: null },
      });
      if (existing >= 10) {
        throw new ConflictError('Maksimal 10 API key aktif per akun');
      }

      const minted = mintApiKey();
      const row = await db.apiKey.create({
        data: {
          userId: req.user.id,
          name,
          keyPrefix: minted.keyPrefix,
          keyHash: minted.keyHash,
        },
      });

      sendCreated(res, {
        id: row.id,
        name: row.name,
        keyPrefix: row.keyPrefix,
        apiKey: minted.rawKey,
        createdAt: row.createdAt,
        warning: 'Simpan API key ini sekarang. Tidak bisa dilihat lagi setelah ini.',
      });
    }),
  );

  router.delete(
    '/:id',
    validateRequest(idParamSchema, 'params'),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const id = String(req.params.id);
      const row = await db.apiKey.findFirst({
        where: { id, userId: req.user.id, revokedAt: null },
      });
      if (!row) throw new NotFoundError('API key tidak ditemukan');
      await db.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      sendSuccess(res, { message: 'API key dicabut' });
    }),
  );

  return router;
}
