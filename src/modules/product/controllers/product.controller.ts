import type { Request, Response } from 'express';
import { z } from 'zod';
import { HTTP_STATUS } from '../../../constants/index.js';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/app-error.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/api-response.js';
import type { ProductService } from '../services/product.service.js';
import type {
  CreateProductInput,
  ResearchProductInput,
  UpdateProductInput,
} from '../validators/product.validator.js';

export const productQuerySchema = z.object({
  category: z.string().min(1).max(80).optional(),
  subcategory: z.string().min(1).max(80).optional(),
  brand: z.string().min(1).max(80).optional(),
  finish: z.string().min(1).max(40).optional(),
  q: z.string().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  ownerId: z.string().uuid().optional(),
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
    sendSuccess(res, products, HTTP_STATUS.OK, { count: products.length });
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const { ownerId: _ignored, ...filter } = parsed.data;
    const products = await this.productService.listMine(req.user.id, filter);
    sendSuccess(
      res,
      products.map((item) => this.productService.toCatalog(item, req.user!.id)),
      HTTP_STATUS.OK,
      { count: products.length },
    );
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const product = await this.productService.getById(String(req.params.id));
    sendSuccess(res, this.productService.toCatalog(product, req.user?.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const product = await this.productService.create(req.body as CreateProductInput, {
      id: req.user.id,
      role: req.user.role,
    });
    sendCreated(res, this.productService.toCatalog(product, req.user.id));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const product = await this.productService.update(
      String(req.params.id),
      req.body as UpdateProductInput,
      { id: req.user.id, role: req.user.role },
    );
    sendSuccess(res, this.productService.toCatalog(product, req.user.id));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    await this.productService.remove(String(req.params.id), {
      id: req.user.id,
      role: req.user.role,
    });
    sendSuccess(res, { message: 'Product deleted' });
  };

  research = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const result = await this.productService.research(req.body as ResearchProductInput, {
      id: req.user.id,
      role: req.user.role,
    });
    sendSuccess(res, result);
  };

  adopt = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const product = await this.productService.adopt(String(req.params.id), {
      id: req.user.id,
      role: req.user.role,
    });
    sendCreated(res, this.productService.toCatalog(product, req.user.id));
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
