import type {
  EmailActivationToken,
  PasswordResetToken,
  RefreshToken,
  Role,
  User,
} from '@prisma/client';

export type UserWithAuth = User & {
  profile?: { name: string | null; whatsapp?: string | null } | null;
};

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserWithAuth | null>;
  findById(id: string): Promise<UserWithAuth | null>;
  createUser(data: {
    email: string;
    passwordHash: string;
    role?: Role;
    name?: string;
    whatsapp?: string;
    isActive?: boolean;
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
  createEmailActivationToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailActivationToken>;
  findEmailActivationByHash(
    tokenHash: string,
  ): Promise<
    | (EmailActivationToken & {
        user: User & { profile: { name: string | null } | null };
      })
    | null
  >;
  markEmailActivationUsed(id: string): Promise<void>;
  activateUser(userId: string): Promise<User>;
  invalidateActiveEmailTokens(userId: string): Promise<void>;
}
