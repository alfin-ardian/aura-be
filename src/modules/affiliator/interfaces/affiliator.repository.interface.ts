import type { Role } from '@prisma/client';

export interface AffiliatorDto {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAffiliatorData {
  email: string;
  passwordHash: string;
  name?: string;
  isActive?: boolean;
}

export interface UpdateAffiliatorData {
  email?: string;
  passwordHash?: string;
  name?: string | null;
  isActive?: boolean;
}

export interface IAffiliatorRepository {
  list(): Promise<AffiliatorDto[]>;
  findById(id: string): Promise<AffiliatorDto | null>;
  findByEmail(email: string): Promise<{ id: string } | null>;
  create(data: CreateAffiliatorData): Promise<AffiliatorDto>;
  update(id: string, data: UpdateAffiliatorData): Promise<AffiliatorDto>;
  softDelete(id: string): Promise<void>;
}
