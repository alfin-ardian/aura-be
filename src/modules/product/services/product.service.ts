import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import { slugify } from '../../../shared/utils/crypto.js';
import { ROLES, type RoleName } from '../../../constants/index.js';
import type {
  IProductResearchClient,
  ResearchedProduct,
} from '../../../shared/services/openai-product-research.js';
import {
  attachSocoImages,
  searchSocoCatalog,
  type SocoCatalogHit,
} from '../../../shared/services/soco-catalog.js';
import type {
  CreateProductData,
  IIngredientRepository,
  IProductRepository,
  ProductDto,
  ProductListFilter,
  UpdateProductData,
} from '../interfaces/product.repository.interface.js';
import type {
  CreateProductInput,
  ResearchProductInput,
  UpdateProductInput,
} from '../validators/product.validator.js';

export interface ProductActor {
  id: string;
  role: RoleName | string;
}

export interface CatalogProduct {
  id: string;
  brand: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  imageUrl: string | null;
  category: string;
  subcategory: string | null;
  ingredients: string[];
  uses: string[];
  reviews: Array<{ rating: number | null; count: number; summary: string | null }>;
  sources: string[];
  isActive: boolean;
  ownerId: string | null;
  owned: boolean;
}

export class ProductService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly ingredientRepository: IIngredientRepository,
    private readonly researchClient: IProductResearchClient,
  ) {}

  list(filter?: ProductListFilter): Promise<ProductDto[]> {
    return this.productRepository.findAllActive(filter);
  }

  listMine(ownerId: string, filter?: ProductListFilter): Promise<ProductDto[]> {
    return this.productRepository.findOwned(ownerId, filter);
  }

  async getById(id: string): Promise<ProductDto> {
    const product = await this.productRepository.findById(id, { includeInactive: true });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async create(input: CreateProductInput, actor: ProductActor): Promise<ProductDto> {
    const slug = await this.uniqueSlug(
      input.slug ?? `${input.brand}-${input.name}`,
    );

    if (input.minPrice != null && input.maxPrice != null && input.minPrice > input.maxPrice) {
      throw new ValidationError('minPrice cannot be greater than maxPrice');
    }

    const makeupTypeIds =
      input.makeupTypeIds ??
      (input.ingredients?.length
        ? await this.ingredientRepository.ensureByNames(input.ingredients)
        : undefined);

    const data: CreateProductData = {
      brand: input.brand,
      name: input.name,
      slug,
      description: input.description ?? '',
      imageUrl: input.imageUrl,
      category: input.category ?? 'Skincare',
      subcategory: input.subcategory,
      finish: input.finish,
      undertoneMatch: input.undertoneMatch,
      usage: input.usage ?? input.uses?.join(' · ') ?? null,
      benefits: input.benefits ?? input.uses,
      tags: input.tags,
      ingredientNames: input.ingredients ?? [],
      uses: input.uses ?? input.benefits ?? [],
      reviewSummary: input.reviewSummary,
      sources: input.sources ?? [],
      rating: input.rating,
      reviewCount: input.reviewCount ?? undefined,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      sourceUrl: input.sourceUrl,
      affiliateUrl: input.affiliateUrl,
      socoId: input.socoId,
      makeupTypeIds,
      isActive: input.isActive,
      ownerId: actor.role === ROLES.AFFILIATOR ? actor.id : null,
    };

    return this.productRepository.create(data);
  }

  async update(
    id: string,
    input: UpdateProductInput,
    actor: ProductActor,
  ): Promise<ProductDto> {
    const existing = await this.productRepository.findById(id, { includeInactive: true });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }
    this.assertCanManage(existing, actor);

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await this.productRepository.findBySlug(input.slug);
      if (slugTaken && slugTaken.id !== id) {
        throw new ConflictError(`Product slug already exists: ${input.slug}`);
      }
    }

    const minPrice = input.minPrice !== undefined ? input.minPrice : existing.minPrice;
    const maxPrice = input.maxPrice !== undefined ? input.maxPrice : existing.maxPrice;
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      throw new ValidationError('minPrice cannot be greater than maxPrice');
    }

    const makeupTypeIds =
      input.makeupTypeIds ??
      (input.ingredients
        ? await this.ingredientRepository.ensureByNames(input.ingredients)
        : undefined);

    const data: UpdateProductData = {
      brand: input.brand,
      name: input.name,
      slug: input.slug,
      description: input.description,
      imageUrl: input.imageUrl,
      category: input.category,
      subcategory: input.subcategory,
      finish: input.finish,
      undertoneMatch: input.undertoneMatch,
      usage: input.usage,
      benefits: input.benefits,
      tags: input.tags,
      ingredientNames: input.ingredients,
      uses: input.uses ?? input.benefits,
      reviewSummary: input.reviewSummary,
      sources: input.sources,
      rating: input.rating,
      reviewCount: input.reviewCount ?? undefined,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      sourceUrl: input.sourceUrl,
      affiliateUrl: input.affiliateUrl,
      socoId: input.socoId,
      isActive: input.isActive,
      makeupTypeIds,
    };
    return this.productRepository.update(id, data);
  }

  async remove(id: string, actor: ProductActor): Promise<void> {
    const existing = await this.productRepository.findById(id, { includeInactive: true });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }
    this.assertCanManage(existing, actor);
    await this.productRepository.hardDelete(id);
  }

  async research(input: ResearchProductInput, actor: ProductActor) {
    const existing = await this.productRepository.search(input.query, { limit: 12 });
    if (existing.length > 0) {
      return {
        source: 'database' as const,
        query: input.query,
        products: existing.map((item) => this.toCatalog(item, actor.id)),
      };
    }

    const socoHits = await searchSocoCatalog(input.query, 12);
    if (socoHits.length > 0) {
      return {
        source: 'soco' as const,
        query: input.query,
        saved: false,
        products: socoHits.map((item, index) => this.toSocoDraft(item, index)),
      };
    }

    const researchedList = await attachSocoImages(
      await this.researchClient.researchProduct(input.query),
    );
    if (researchedList.length === 0) {
      return {
        source: 'ai_research' as const,
        query: input.query,
        saved: false,
        products: [],
      };
    }

    if (!input.save || researchedList.length > 1) {
      return {
        source: 'ai_research' as const,
        query: input.query,
        saved: false,
        products: researchedList.map((item, index) => this.toResearchDraft(item, index)),
      };
    }

    const researched = researchedList[0]!;
    const saved = await this.create(
      {
        brand: researched.brand,
        name: researched.name,
        description: researched.description,
        imageUrl: researched.image,
        category: researched.category,
        subcategory: researched.subcategory,
        ingredients: researched.ingredients,
        uses: researched.uses,
        reviewSummary: researched.reviewSummary,
        sources: researched.sources,
        rating: researched.rating ?? null,
        reviewCount: researched.reviewCount ?? undefined,
        sourceUrl: researched.sources[0] ?? null,
        isActive: true,
      },
      actor,
    );

    return {
      source: 'ai_research' as const,
      query: input.query,
      saved: true,
      products: [this.toCatalog(saved, actor.id)],
    };
  }

  async adopt(id: string, actor: ProductActor): Promise<ProductDto> {
    const source = await this.productRepository.findById(id, { includeInactive: true });
    if (!source) {
      throw new NotFoundError('Product not found');
    }
    if (source.ownerId === actor.id) {
      return source;
    }

    return this.create(
      {
        brand: source.brand,
        name: source.name,
        description: source.description,
        imageUrl: source.imageUrl,
        category: source.category,
        subcategory: source.subcategory,
        finish: source.finish as CreateProductInput['finish'],
        undertoneMatch: source.undertoneMatch as CreateProductInput['undertoneMatch'],
        usage: source.usage,
        benefits: source.benefits,
        ingredients: source.ingredientNames.length
          ? source.ingredientNames
          : source.makeupTypes.map((item) => item.name),
        uses: source.uses.length ? source.uses : source.benefits,
        reviewSummary: source.reviewSummary,
        sources: source.sources,
        rating: source.rating,
        reviewCount: source.reviewCount,
        sourceUrl: source.sourceUrl,
        affiliateUrl: source.affiliateUrl,
        isActive: true,
      },
      actor,
    );
  }

  listCategories(): Promise<string[]> {
    return this.productRepository.listCategories();
  }

  listBrands(): Promise<string[]> {
    return this.productRepository.listBrands();
  }

  private toSocoDraft(hit: SocoCatalogHit, index: number): CatalogProduct {
    return {
      id: `soco-${hit.id || index}`,
      brand: hit.brand,
      name: hit.name,
      slug: slugify(`${hit.brand}-${hit.name}`),
      description: hit.description || `${hit.brand} ${hit.name}`,
      image: hit.imageUrl,
      imageUrl: hit.imageUrl,
      category: hit.category,
      subcategory: hit.subcategory,
      ingredients: [],
      uses: [],
      reviews:
        hit.rating != null || hit.reviewCount > 0
          ? [{ rating: hit.rating, count: hit.reviewCount, summary: null }]
          : [],
      sources: hit.sourceUrl ? [hit.sourceUrl] : [],
      isActive: false,
      ownerId: null,
      owned: false,
    };
  }

  private toResearchDraft(researched: ResearchedProduct, index: number): CatalogProduct {
    return {
      id: index === 0 ? 'draft' : `draft-${index}`,
      brand: researched.brand,
      name: researched.name,
      slug: slugify(`${researched.brand}-${researched.name}`),
      description: researched.description,
      image: researched.image ?? null,
      imageUrl: researched.image ?? null,
      category: researched.category,
      subcategory: researched.subcategory ?? null,
      ingredients: researched.ingredients,
      uses: researched.uses,
      reviews: [
        {
          rating: researched.rating ?? null,
          count: researched.reviewCount ?? 0,
          summary: researched.reviewSummary ?? null,
        },
      ],
      sources: researched.sources,
      isActive: false,
      ownerId: null,
      owned: false,
    };
  }

  toCatalog(product: ProductDto, actorId?: string): CatalogProduct {
    const ingredients =
      product.ingredientNames.length > 0
        ? product.ingredientNames
        : product.makeupTypes.map((item) => item.name);
    const uses = product.uses.length > 0 ? product.uses : product.benefits;
    return {
      id: product.id,
      brand: product.brand,
      name: product.name,
      slug: product.slug,
      description: product.description,
      image: product.imageUrl,
      imageUrl: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory,
      ingredients,
      uses,
      reviews:
        product.rating != null || product.reviewCount > 0 || product.reviewSummary
          ? [
              {
                rating: product.rating,
                count: product.reviewCount,
                summary: product.reviewSummary,
              },
            ]
          : [],
      sources: product.sources,
      isActive: product.isActive ?? true,
      ownerId: product.ownerId,
      owned: Boolean(actorId && product.ownerId === actorId),
    };
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = slugify(base).slice(0, 160) || `product-${Date.now()}`;
    let slug = root;
    let n = 1;
    while (await this.productRepository.findBySlug(slug)) {
      n += 1;
      slug = `${root.slice(0, 150)}-${n}`;
    }
    return slug;
  }

  private assertCanManage(product: ProductDto, actor: ProductActor): void {
    if (actor.role === ROLES.SUPER_ADMIN) return;
    if (actor.role === ROLES.AFFILIATOR && product.ownerId === actor.id) return;
    throw new ForbiddenError('You can only manage your own products');
  }
}
