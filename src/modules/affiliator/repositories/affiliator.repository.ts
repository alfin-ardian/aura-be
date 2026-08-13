import type { PrismaClient } from '@prisma/client';
import type {
  AffiliatorDto,
  CreateAffiliatorData,
  IAffiliatorRepository,
  UpdateAffiliatorData,
} from '../interfaces/affiliator.repository.interface.js';

function mapAffiliator(row: {
  id: string;
  email: string;
  role: AffiliatorDto['role'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile: { name: string | null } | null;
}): AffiliatorDto {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    name: row.profile?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class AffiliatorRepository implements IAffiliatorRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<AffiliatorDto[]> {
    const rows = await this.db.user.findMany({
      where: { role: 'AFFILIATOR' },
      include: { profile: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapAffiliator);
  }

  async findById(id: string): Promise<AffiliatorDto | null> {
    const row = await this.db.user.findFirst({
      where: { id, role: 'AFFILIATOR' },
      include: { profile: { select: { name: true } } },
    });
    return row ? mapAffiliator(row) : null;
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  async create(data: CreateAffiliatorData): Promise<AffiliatorDto> {
    const row = await this.db.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: 'AFFILIATOR',
        isActive: data.isActive ?? true,
        profile: {
          create: { name: data.name ?? null },
        },
      },
      include: { profile: { select: { name: true } } },
    });
    return mapAffiliator(row);
  }

  async update(id: string, data: UpdateAffiliatorData): Promise<AffiliatorDto> {
    const row = await this.db.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.passwordHash !== undefined ? { passwordHash: data.passwordHash } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.name !== undefined
          ? {
              profile: {
                upsert: {
                  create: { name: data.name },
                  update: { name: data.name },
                },
              },
            }
          : {}),
      },
      include: { profile: { select: { name: true } } },
    });
    return mapAffiliator(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
