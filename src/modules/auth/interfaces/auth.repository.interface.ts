import type { PasswordResetToken, RefreshToken, Role, User } from '@prisma/client';

export type UserWithAuth = User;

export interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createUser(data: {
    email: string;
    passwordHash: string;
    role?: Role;
    name?: string;
  }): Promise<User>;
  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
  findRefreshTokenByHash(tokenHash: string): Promise<(RefreshToken & { user: User }) | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken>;
  findPasswordResetByHash(tokenHash: string): Promise<(PasswordResetToken & { user: User }) | null>;
  markPasswordResetUsed(id: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
