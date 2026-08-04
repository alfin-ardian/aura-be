import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { ProductService } from '../services/product.service.js';

export const productQuerySchema = z.object({
  category: z.string().min(1).max(80).optional(),
  subcategory: z.string().min(1).max(80).optional(),
  brand: z.string().min(1).max(80).optional(),
  finish: z.string().min(1).max(40).optional(),
  q: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const products = await this.productService.list(parsed.data);
    sendSuccess(res, products, 200, { count: products.length });
  };

  categories = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.productService.listCategories();
    sendSuccess(res, categories);
  };

  brands = async (_req: Request, res: Response): Promise<void> => {
    const brands = await this.productService.listBrands();
    sendSuccess(res, brands);
  };
}
