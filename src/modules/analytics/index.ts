import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { AnalyticsController } from './controllers/analytics.controller.js';
import { AnalyticsService } from './services/analytics.service.js';
import { analyticsQuerySchema } from './validators/analytics.validator.js';

const overviewQuerySchema = z.object({
  affiliatorId: z.string().uuid().optional(),
});

export function createAnalyticsModule(db: PrismaClient): Router {
  const service = new AnalyticsService(db);
  const controller = new AnalyticsController(service);
  const router = Router();

  router.get(
    '/platform',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    asyncHandler(controller.getPlatformOverview),
  );

  router.get(
    '/overview',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(overviewQuerySchema, 'query'),
    asyncHandler(controller.getOverview),
  );

  router.get(
    '/',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(analyticsQuerySchema, 'query'),
    asyncHandler(controller.getDashboard),
  );

  return router;
}
