import type {
  IProductRepository,
  ProductDto,
  ProductListFilter,
} from '../interfaces/product.repository.interface.js';

export class ProductService {
  constructor(private readonly productRepository: IProductRepository) {}

  list(filter?: ProductListFilter): Promise<ProductDto[]> {
    return this.productRepository.findAllActive(filter);
  }

  listCategories(): Promise<string[]> {
    return this.productRepository.listCategories();
  }

  listBrands(): Promise<string[]> {
    return this.productRepository.listBrands();
  }
}
