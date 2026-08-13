export interface MakeupTypeDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  benefits: string[];
  concerns: string[];
}

export type IngredientDto = MakeupTypeDto;

export interface ProductDto {
  id: string;
  socoId: string | null;
  ownerId: string | null;
  brand: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  category: string;
  subcategory: string | null;
  finish: string | null;
  undertoneMatch: string | null;
  usage: string | null;
  benefits: string[];
  tags: string[];
  ingredientNames: string[];
  uses: string[];
  reviewSummary: string | null;
  sources: string[];
  rating: number | null;
  reviewCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  sourceUrl: string | null;
  affiliateUrl: string | null;
  isActive?: boolean;
  makeupTypes: MakeupTypeDto[];
}

export interface ProductListFilter {
  category?: string;
  subcategory?: string;
  brand?: string;
  finish?: string;
  q?: string;
  limit?: number;
  ownerId?: string;
}

export interface CreateProductData {
  brand: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  category: string;
  subcategory?: string | null;
  finish?: string | null;
  undertoneMatch?: string | null;
  usage?: string | null;
  benefits?: string[];
  tags?: string[];
  ingredientNames?: string[];
  uses?: string[];
  reviewSummary?: string | null;
  sources?: string[];
  rating?: number | null;
  reviewCount?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  sourceUrl?: string | null;
  affiliateUrl?: string | null;
  socoId?: string | null;
  makeupTypeIds?: string[];
  isActive?: boolean;
  ownerId?: string | null;
}

export type UpdateProductData = Partial<CreateProductData>;

export interface IProductRepository {
  findAllActive(filter?: ProductListFilter): Promise<ProductDto[]>;
  findOwned(ownerId: string, filter?: ProductListFilter): Promise<ProductDto[]>;
  search(query: string, options?: { limit?: number }): Promise<ProductDto[]>;
  findById(id: string, options?: { includeInactive?: boolean }): Promise<ProductDto | null>;
  findBySlug(slug: string): Promise<ProductDto | null>;
  findByMakeupTypes(makeupTypes: string[], limit?: number): Promise<ProductDto[]>;
  findCandidatesForRecommendation(limit?: number): Promise<ProductDto[]>;
  findByIds(ids: string[]): Promise<ProductDto[]>;
  create(data: CreateProductData): Promise<ProductDto>;
  update(id: string, data: UpdateProductData): Promise<ProductDto>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  listCategories(): Promise<string[]>;
  listBrands(): Promise<string[]>;
}

export interface IIngredientRepository {
  findAll(): Promise<MakeupTypeDto[]>;
  findByNames(names: string[]): Promise<MakeupTypeDto[]>;
  ensureByNames(names: string[]): Promise<string[]>;
}
