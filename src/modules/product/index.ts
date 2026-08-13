import { Router } from 'express';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import type { IProductResearchClient } from '../../shared/services/openai-product-research.js';
import { ProductController } from './controllers/product.controller.js';
import type {
  IIngredientRepository,
  IProductRepository,
} from './interfaces/product.repository.interface.js';
import { ProductService } from './services/product.service.js';
import {
  createProductSchema,
  productIdParamSchema,
  researchProductSchema,
  updateProductSchema,
} from './validators/product.validator.js';

export interface ProductModuleDeps {
  productRepository: IProductRepository;
  ingredientRepository: IIngredientRepository;
  productResearchClient: IProductResearchClient;
}

export function createProductModule(deps: ProductModuleDeps): Router {
  const service = new ProductService(
    deps.productRepository,
    deps.ingredientRepository,
    deps.productResearchClient,
  );
  const controller = new ProductController(service);
  const router = Router();

  router.get('/', asyncHandler(controller.list));
  router.get('/categories', asyncHandler(controller.categories));
  router.get('/brands', asyncHandler(controller.brands));

  router.get(
    '/mine',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    asyncHandler(controller.listMine),
  );

  router.post(
    '/research',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(researchProductSchema),
    asyncHandler(controller.research),
  );

  router.post(
    '/:id/adopt',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(productIdParamSchema, 'params'),
    asyncHandler(controller.adopt),
  );

  router.get(
    '/:id',
    validateRequest(productIdParamSchema, 'params'),
    asyncHandler(controller.getById),
  );

  router.post(
    '/',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(createProductSchema),
    asyncHandler(controller.create),
  );

  router.put(
    '/:id',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(productIdParamSchema, 'params'),
    validateRequest(updateProductSchema),
    asyncHandler(controller.update),
  );

  router.delete(
    '/:id',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(productIdParamSchema, 'params'),
    asyncHandler(controller.remove),
  );

  return router;
}
