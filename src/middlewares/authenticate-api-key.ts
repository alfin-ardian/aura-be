import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../shared/errors/app-error.js';
import { sha256 } from '../shared/utils/crypto.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Authenticate partner white-label requests via `Authorization: Bearer aura_…`
 * or `X-API-Key: aura_…`.
 */
export function createAuthenticateApiKey(db: PrismaClient) {
  return async function authenticateApiKey(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const header = req.headers.authorization;
      const rawFromBearer =
        header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
      const rawFromHeader =
        typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : '';
      const rawKey = rawFromBearer || rawFromHeader;

      if (!rawKey.startsWith('aura_')) {
        next(new UnauthorizedError('Missing or invalid API key'));
        return;
      }

      const keyHash = sha256(rawKey);
      const record = await db.apiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });

      if (!record || record.revokedAt || !record.user.isActive) {
        next(new UnauthorizedError('Invalid or revoked API key'));
        return;
      }

      if (record.user.role !== 'AFFILIATOR' && record.user.role !== 'SUPER_ADMIN') {
        next(new UnauthorizedError('API key owner is not allowed'));
        return;
      }

      req.user = {
        id: record.user.id,
        email: record.user.email,
        role: record.user.role,
      };
      req.apiKeyId = record.id;

      void db.apiKey
        .update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);

      next();
    } catch (error) {
      next(error);
    }
  };
}
