import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { AffiliatorController } from './controllers/affiliator.controller.js';
import { AffiliatorRepository } from './repositories/affiliator.repository.js';
import { AffiliatorService } from './services/affiliator.service.js';
import {
  affiliatorIdParamSchema,
  createAffiliatorSchema,
  updateAffiliatorSchema,
} from './validators/affiliator.validator.js';

export function createAffiliatorModule(db: PrismaClient): Router {
  const repository = new AffiliatorRepository(db);
  const service = new AffiliatorService(repository, db);
  const controller = new AffiliatorController(service);
  const router = Router();

  router.use(authenticate, authorize('SUPER_ADMIN'));

  router.get('/', asyncHandler(controller.list));
  router.get(
    '/:id/dashboard',
    validateRequest(affiliatorIdParamSchema, 'params'),
    asyncHandler(controller.getDashboard),
  );
  router.get(
    '/:id',
    validateRequest(affiliatorIdParamSchema, 'params'),
    asyncHandler(controller.getById),
  );
  router.post(
    '/',
    validateRequest(createAffiliatorSchema),
    asyncHandler(controller.create),
  );
  router.put(
    '/:id',
    validateRequest(affiliatorIdParamSchema, 'params'),
    validateRequest(updateAffiliatorSchema),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    validateRequest(affiliatorIdParamSchema, 'params'),
    asyncHandler(controller.remove),
  );

  return router;
}
