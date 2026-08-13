import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { UsageController } from './controllers/usage.controller.js';
import { UsageService } from './services/usage.service.js';
import { checkoutSchema } from './validators/usage.validator.js';

export function createUsageModule(db: PrismaClient): Router {
  const service = new UsageService(db);
  const controller = new UsageController(service);
  const router = Router();

  router.use(authenticate, authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN));
  router.get('/', asyncHandler(controller.getUsage));
  router.post('/checkout', validateRequest(checkoutSchema), asyncHandler(controller.checkout));

  return router;
}
