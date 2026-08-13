import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateProductData,
  IProductRepository,
  MakeupTypeDto,
  ProductDto,
  ProductListFilter,
  UpdateProductData,
} from '../interfaces/product.repository.interface.js';

function mapMakeupType(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  benefits: string[];
  concerns: string[];
}): MakeupTypeDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    benefits: row.benefits,
    concerns: row.concerns,
  };
}

type ProductRow = {
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
  isActive: boolean;
  ingredients: Array<{ ingredient: Parameters<typeof mapMakeupType>[0] }>;
};

function mapProduct(row: ProductRow): ProductDto {
  return {
    id: row.id,
    socoId: row.socoId,
    ownerId: row.ownerId,
    brand: row.brand,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    category: row.category,
    subcategory: row.subcategory,
    finish: row.finish,
    undertoneMatch: row.undertoneMatch,
    usage: row.usage,
    benefits: row.benefits,
    tags: row.tags,
    ingredientNames: row.ingredientNames,
    uses: row.uses,
    reviewSummary: row.reviewSummary,
    sources: row.sources,
    rating: row.rating,
    reviewCount: row.reviewCount,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    sourceUrl: row.sourceUrl,
    affiliateUrl: row.affiliateUrl,
    isActive: row.isActive,
    makeupTypes: row.ingredients.map((link) => mapMakeupType(link.ingredient)),
  };
}

const productInclude = {
  ingredients: {
    include: { ingredient: true },
  },
} as const;

async function syncMakeupTypes(
  db: PrismaClient,
  productId: string,
  makeupTypeIds: string[] | undefined,
): Promise<void> {
  if (makeupTypeIds === undefined) return;
  await db.productIngredient.deleteMany({ where: { productId } });
  if (makeupTypeIds.length === 0) return;
  await db.productIngredient.createMany({
    data: makeupTypeIds.map((ingredientId) => ({ productId, ingredientId })),
    skipDuplicates: true,
  });
}

export class ProductRepository implements IProductRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAllActive(filter: ProductListFilter = {}): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = { isActive: true };
    return this.findMany(where, filter);
  }

  /** Owner catalog — includes Draft (isActive=false). */
  async findOwned(ownerId: string, filter: ProductListFilter = {}): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = { ownerId };
    return this.findMany(where, filter);
  }

  async search(query: string, options: { limit?: number } = {}): Promise<ProductDto[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.db.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { subcategory: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: productInclude,
      orderBy: [{ updatedAt: 'desc' }],
      take: options.limit ?? 12,
    });
    return rows.map(mapProduct);
  }

  private async findMany(
    baseWhere: Prisma.ProductWhereInput,
    filter: ProductListFilter,
  ): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = { ...baseWhere };

    if (filter.category) {
      where.category = { equals: filter.category, mode: 'insensitive' };
    }
    if (filter.subcategory) {
      where.subcategory = { equals: filter.subcategory, mode: 'insensitive' };
    }
    if (filter.brand) {
      where.brand = { equals: filter.brand, mode: 'insensitive' };
    }
    if (filter.finish) {
      where.finish = { equals: filter.finish, mode: 'insensitive' };
    }
    if (filter.q) {
      where.OR = [
        { name: { contains: filter.q, mode: 'insensitive' } },
        { brand: { contains: filter.q, mode: 'insensitive' } },
        { subcategory: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    if (filter.ownerId && !baseWhere.ownerId) {
      where.ownerId = filter.ownerId;
    }

    const rows = await this.db.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ updatedAt: 'desc' }, { brand: 'asc' }],
      take: filter.limit ?? 200,
    });
    return rows.map(mapProduct);
  }

  async findById(
    id: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<ProductDto | null> {
    const row = await this.db.product.findFirst({
      where: {
        id,
        ...(options.includeInactive ? {} : { isActive: true }),
      },
      include: productInclude,
    });
    return row ? mapProduct(row) : null;
  }

  async findBySlug(slug: string): Promise<ProductDto | null> {
    const row = await this.db.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    return row ? mapProduct(row) : null;
  }

  async findByMakeupTypes(makeupTypes: string[], limit = 40): Promise<ProductDto[]> {
    if (makeupTypes.length === 0) {
      return this.findCandidatesForRecommendation(limit);
    }

    const rows = await this.db.product.findMany({
      where: {
        isActive: true,
        OR: [
          { subcategory: { in: makeupTypes, mode: 'insensitive' } },
          { tags: { hasSome: makeupTypes } },
          {
            ingredients: {
              some: {
                ingredient: {
                  name: { in: makeupTypes, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      },
      include: productInclude,
      orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }],
      take: limit,
    });

    return rows.map(mapProduct);
  }

  async findCandidatesForRecommendation(limit = 80): Promise<ProductDto[]> {
    const rows = await this.db.product.findMany({
      where: { isActive: true },
      include: productInclude,
      orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }],
      take: limit,
    });
    return rows.map(mapProduct);
  }

  async findByIds(ids: string[]): Promise<ProductDto[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: productInclude,
    });
    return rows.map(mapProduct);
  }

  async create(data: CreateProductData): Promise<ProductDto> {
    const created = await this.db.product.create({
      data: {
        brand: data.brand,
        name: data.name,
        slug: data.slug,
        description: data.description,
        imageUrl: data.imageUrl ?? null,
        category: data.category,
        subcategory: data.subcategory ?? null,
        finish: data.finish ?? null,
        undertoneMatch: data.undertoneMatch ?? null,
        usage: data.usage ?? null,
        benefits: data.benefits ?? [],
        tags: data.tags ?? [],
        ingredientNames: data.ingredientNames ?? [],
        uses: data.uses ?? [],
        reviewSummary: data.reviewSummary ?? null,
        sources: data.sources ?? [],
        rating: data.rating ?? null,
        reviewCount: data.reviewCount ?? 0,
        minPrice: data.minPrice ?? null,
        maxPrice: data.maxPrice ?? null,
        sourceUrl: data.sourceUrl ?? null,
        affiliateUrl: data.affiliateUrl ?? null,
        socoId: data.socoId ?? null,
        ownerId: data.ownerId ?? null,
        isActive: data.isActive ?? true,
      },
      include: productInclude,
    });

    await syncMakeupTypes(this.db, created.id, data.makeupTypeIds);
    const refreshed = await this.findById(created.id, { includeInactive: true });
    if (!refreshed) {
      return mapProduct(created);
    }
    return refreshed;
  }

  async update(id: string, data: UpdateProductData): Promise<ProductDto> {
    const { makeupTypeIds, ...fields } = data;
    await this.db.product.update({
      where: { id },
      data: {
        ...(fields.brand !== undefined ? { brand: fields.brand } : {}),
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        ...(fields.imageUrl !== undefined ? { imageUrl: fields.imageUrl } : {}),
        ...(fields.category !== undefined ? { category: fields.category } : {}),
        ...(fields.subcategory !== undefined ? { subcategory: fields.subcategory } : {}),
        ...(fields.finish !== undefined ? { finish: fields.finish } : {}),
        ...(fields.undertoneMatch !== undefined
          ? { undertoneMatch: fields.undertoneMatch }
          : {}),
        ...(fields.usage !== undefined ? { usage: fields.usage } : {}),
        ...(fields.benefits !== undefined ? { benefits: fields.benefits } : {}),
        ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
        ...(fields.ingredientNames !== undefined
          ? { ingredientNames: fields.ingredientNames }
          : {}),
        ...(fields.uses !== undefined ? { uses: fields.uses } : {}),
        ...(fields.reviewSummary !== undefined ? { reviewSummary: fields.reviewSummary } : {}),
        ...(fields.sources !== undefined ? { sources: fields.sources } : {}),
        ...(fields.rating !== undefined ? { rating: fields.rating } : {}),
        ...(fields.reviewCount !== undefined ? { reviewCount: fields.reviewCount } : {}),
        ...(fields.minPrice !== undefined ? { minPrice: fields.minPrice } : {}),
        ...(fields.maxPrice !== undefined ? { maxPrice: fields.maxPrice } : {}),
        ...(fields.sourceUrl !== undefined ? { sourceUrl: fields.sourceUrl } : {}),
        ...(fields.affiliateUrl !== undefined ? { affiliateUrl: fields.affiliateUrl } : {}),
        ...(fields.socoId !== undefined ? { socoId: fields.socoId } : {}),
        ...(fields.isActive !== undefined ? { isActive: fields.isActive } : {}),
      },
    });

    await syncMakeupTypes(this.db, id, makeupTypeIds);
    const refreshed = await this.findById(id, { includeInactive: true });
    if (!refreshed) {
      throw new Error(`Product ${id} missing after update`);
    }
    return refreshed;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.product.delete({ where: { id } });
  }

  async listCategories(): Promise<string[]> {
    const rows = await this.db.product.findMany({
      where: { isActive: true },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async listBrands(): Promise<string[]> {
    const rows = await this.db.product.findMany({
      where: { isActive: true },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand);
  }
}
