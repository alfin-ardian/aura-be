import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  IProductRepository,
  MakeupTypeDto,
  ProductDto,
  ProductListFilter,
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
  ingredients: Array<{ ingredient: Parameters<typeof mapMakeupType>[0] }>;
};

function mapProduct(row: ProductRow): ProductDto {
  return {
    id: row.id,
    socoId: row.socoId,
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
    rating: row.rating,
    reviewCount: row.reviewCount,
    minPrice: row.minPrice,
    maxPrice: row.maxPrice,
    sourceUrl: row.sourceUrl,
    affiliateUrl: row.affiliateUrl,
    makeupTypes: row.ingredients.map((link) => mapMakeupType(link.ingredient)),
  };
}

const productInclude = {
  ingredients: {
    include: { ingredient: true },
  },
} as const;

export class ProductRepository implements IProductRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAllActive(filter: ProductListFilter = {}): Promise<ProductDto[]> {
    const where: Prisma.ProductWhereInput = { isActive: true };

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

    const rows = await this.db.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ reviewCount: 'desc' }, { rating: 'desc' }, { brand: 'asc' }],
      take: filter.limit ?? 200,
    });
    return rows.map(mapProduct);
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
