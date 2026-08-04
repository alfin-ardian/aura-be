import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { sendCreated, sendSuccess } from '../../shared/utils/api-response.js';

const addWishlistSchema = z.object({
  productId: z.string().uuid(),
});

export function createWishlistModule(db: PrismaClient): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const rows = await db.wishlist.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: { ingredients: { include: { ingredient: true } } },
          },
        },
      });

      sendSuccess(
        res,
        rows.map((row) => ({
          id: row.id,
          productId: row.productId,
          createdAt: row.createdAt.toISOString(),
          product: {
            id: row.product.id,
            brand: row.product.brand,
            name: row.product.name,
            category: row.product.category,
            subcategory: row.product.subcategory,
            imageUrl: row.product.imageUrl,
            rating: row.product.rating,
            minPrice: row.product.minPrice,
            affiliateUrl: row.product.affiliateUrl,
            sourceUrl: row.product.sourceUrl,
          },
        })),
      );
    }),
  );

  router.post(
    '/',
    validateRequest(addWishlistSchema),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { productId } = req.body as { productId: string };
      const product = await db.product.findFirst({
        where: { id: productId, isActive: true },
      });
      if (!product) throw new NotFoundError('Product not found');

      try {
        const row = await db.wishlist.create({
          data: { userId: req.user.id, productId },
        });
        sendCreated(res, { id: row.id, productId: row.productId });
      } catch {
        throw new ConflictError('Product already in wishlist');
      }
    }),
  );

  router.delete(
    '/:productId',
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const productId = String(req.params.productId);
      await db.wishlist.deleteMany({
        where: { userId: req.user.id, productId },
      });
      sendSuccess(res, { message: 'Removed from wishlist' });
    }),
  );

  return router;
}
