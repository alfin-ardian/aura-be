import { randomUUID } from 'node:crypto';
import { appConfig } from '../../../config/index.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../shared/errors/app-error.js';
import { generateSecureToken, sha256 } from '../../../shared/utils/crypto.js';
import {
  getRefreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../../shared/utils/jwt.js';
import { comparePassword, hashPassword } from '../../../shared/utils/password.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IAuthRepository } from '../interfaces/auth.repository.interface.js';
import type {
  AuthResponseDto,
  AuthTokensDto,
  ForgotPasswordResponseDto,
} from '../dto/auth.dto.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator.js';

export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    logger.info('User registered', { userId: user.id });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    logger.info('User logged in', { userId: user.id });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      tokens,
    };
  }

  async refresh(input: RefreshTokenInput): Promise<AuthTokensDto> {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenHash = sha256(input.refreshToken);
    const stored = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token revoked or expired');
    }

    if (stored.userId !== payload.sub || !stored.user.isActive) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Rotate refresh tokens (Stripe-like session hygiene)
    await this.authRepository.revokeRefreshToken(stored.id);
    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(input: LogoutInput): Promise<void> {
    const tokenHash = sha256(input.refreshToken);
    const stored = await this.authRepository.findRefreshTokenByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.authRepository.revokeRefreshToken(stored.id);
    }
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResponseDto> {
    const user = await this.authRepository.findByEmail(input.email);
    // Always return success to avoid email enumeration
    const message = 'If that email exists, a reset link has been issued';

    if (!user) {
      return { message };
    }

    const rawToken = generateSecureToken();
    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    logger.info('Password reset token created', { userId: user.id });

    return {
      message,
      ...(appConfig.isProduction ? {} : { resetToken: rawToken }),
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const stored = await this.authRepository.findPasswordResetByHash(sha256(input.token));
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(input.password);
    await this.authRepository.updatePassword(stored.userId, passwordHash);
    await this.authRepository.markPasswordResetUsed(stored.id);
    await this.authRepository.revokeAllRefreshTokens(stored.userId);
    logger.info('Password reset completed', { userId: stored.userId });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokensDto> {
    const jti = randomUUID();
    const accessToken = signAccessToken({
      sub: userId,
      email,
      role: role as 'USER' | 'ADMIN',
    });
    const refreshToken = signRefreshToken({ sub: userId, jti });

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: getRefreshExpiryDate(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: appConfig.jwt.accessExpiresIn,
      tokenType: 'Bearer',
    };
  }
}
