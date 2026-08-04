import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { ProductController } from './controllers/product.controller.js';
import type { IProductRepository } from './interfaces/product.repository.interface.js';
import { ProductService } from './services/product.service.js';

export interface ProductModuleDeps {
  productRepository: IProductRepository;
}

export function createProductModule(deps: ProductModuleDeps): Router {
  const service = new ProductService(deps.productRepository);
  const controller = new ProductController(service);
  const router = Router();

  router.get('/', asyncHandler(controller.list));
  router.get('/categories', asyncHandler(controller.categories));
  router.get('/brands', asyncHandler(controller.brands));

  return router;
}
