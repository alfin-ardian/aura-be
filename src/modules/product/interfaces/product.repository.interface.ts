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
  rating: number | null;
  reviewCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  sourceUrl: string | null;
  affiliateUrl: string | null;
  makeupTypes: MakeupTypeDto[];
}

export interface ProductListFilter {
  category?: string;
  subcategory?: string;
  brand?: string;
  finish?: string;
  q?: string;
  limit?: number;
}

export interface IProductRepository {
  findAllActive(filter?: ProductListFilter): Promise<ProductDto[]>;
  findByMakeupTypes(makeupTypes: string[], limit?: number): Promise<ProductDto[]>;
  findCandidatesForRecommendation(limit?: number): Promise<ProductDto[]>;
  findByIds(ids: string[]): Promise<ProductDto[]>;
  listCategories(): Promise<string[]>;
  listBrands(): Promise<string[]>;
}

export interface IIngredientRepository {
  findAll(): Promise<MakeupTypeDto[]>;
  findByNames(names: string[]): Promise<MakeupTypeDto[]>;
}
