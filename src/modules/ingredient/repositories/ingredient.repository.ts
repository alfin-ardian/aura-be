import type { PrismaClient } from '@prisma/client';
import { slugify } from '../../../shared/utils/crypto.js';
import type {
  IIngredientRepository,
  IngredientDto,
} from '../../product/interfaces/product.repository.interface.js';

export class IngredientRepository implements IIngredientRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(): Promise<IngredientDto[]> {
    const rows = await this.db.ingredient.findMany({ orderBy: { name: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      benefits: row.benefits,
      concerns: row.concerns,
    }));
  }

  async findByNames(names: string[]): Promise<IngredientDto[]> {
    if (names.length === 0) return [];
    const rows = await this.db.ingredient.findMany({
      where: {
        OR: names.map((name) => ({
          name: { equals: name, mode: 'insensitive' as const },
        })),
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      benefits: row.benefits,
      concerns: row.concerns,
    }));
  }

  async ensureByNames(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    const seen = new Set<string>();

    for (const raw of names) {
      const name = raw.trim().slice(0, 120);
      if (!name) continue;
      const slug = slugify(name).slice(0, 80);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const row = await this.db.ingredient.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
      });
      ids.push(row.id);
    }

    return ids;
  }
}
