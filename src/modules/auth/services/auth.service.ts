import { randomUUID } from 'node:crypto';
import { appConfig } from '../../../config/index.js';
import type { RoleName } from '../../../constants/index.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import {
  buildActivationEmail,
  sendTransactionalEmail,
} from '../../../shared/services/brevo-email.js';
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
  ActivateAccountInput,
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterAffiliatorInput,
  RegisterInput,
  ResendActivationInput,
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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: input.name?.trim() || null,
      },
      tokens,
    };
  }

  /**
   * Public affiliator signup — account stays inactive until email activation.
   */
  async registerAffiliator(input: RegisterAffiliatorInput): Promise<{
    email: string;
    message: string;
    activationToken?: string;
  }> {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email sudah terdaftar');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepository.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      whatsapp: input.whatsapp,
      role: 'AFFILIATOR',
      isActive: false,
    });

    const rawToken = await this.issueActivationEmail(user.id, input.email, input.name);
    logger.info('Affiliator registered (pending activation)', { userId: user.id });

    return {
      email: user.email,
      message: 'Akun dibuat. Cek email untuk mengaktifkan akun.',
      ...(appConfig.isProduction ? {} : { activationToken: rawToken }),
    };
  }

  async activateAccount(input: ActivateAccountInput): Promise<{
    message: string;
    email: string;
  }> {
    const stored = await this.authRepository.findEmailActivationByHash(sha256(input.token.trim()));
    if (!stored) {
      throw new ValidationError('Tautan aktivasi tidak valid atau sudah kedaluwarsa');
    }

    // Idempotent: React Strict Mode / double-click / email link prefetch may hit twice.
    if (stored.usedAt) {
      if (stored.user.isActive) {
        return {
          message: 'Akun sudah aktif. Silakan masuk.',
          email: stored.user.email,
        };
      }
      throw new ValidationError('Tautan aktivasi tidak valid atau sudah kedaluwarsa');
    }

    if (stored.expiresAt < new Date()) {
      throw new ValidationError('Tautan aktivasi tidak valid atau sudah kedaluwarsa');
    }

    if (stored.user.isActive) {
      await this.authRepository.markEmailActivationUsed(stored.id);
      return {
        message: 'Akun sudah aktif. Silakan masuk.',
        email: stored.user.email,
      };
    }

    await this.authRepository.activateUser(stored.userId);
    await this.authRepository.markEmailActivationUsed(stored.id);
    logger.info('Affiliator account activated', { userId: stored.userId });

    return {
      message: 'Akun berhasil diaktifkan. Silakan masuk.',
      email: stored.user.email,
    };
  }

  async resendActivation(input: ResendActivationInput): Promise<{
    message: string;
    activationToken?: string;
  }> {
    const user = await this.authRepository.findByEmail(input.email);
    const message = 'Jika email terdaftar dan belum aktif, tautan aktivasi baru telah dikirim.';

    if (!user || user.isActive) {
      return { message };
    }

    const rawToken = await this.issueActivationEmail(
      user.id,
      user.email,
      user.profile?.name ?? user.email,
    );
    return {
      message,
      ...(appConfig.isProduction ? {} : { activationToken: rawToken }),
    };
  }

  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedError(
        'Akun belum diaktifkan. Cek email untuk tautan aktivasi.',
      );
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    logger.info('User logged in', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.profile?.name ?? null,
      },
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

  private async issueActivationEmail(
    userId: string,
    email: string,
    name: string,
  ): Promise<string> {
    await this.authRepository.invalidateActiveEmailTokens(userId);
    const rawToken = generateSecureToken();
    await this.authRepository.createEmailActivationToken({
      userId,
      tokenHash: sha256(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const activateUrl = `${appConfig.frontendUrl}/activate-account?token=${encodeURIComponent(rawToken)}`;
    const mail = buildActivationEmail({ name, activateUrl });
    try {
      await sendTransactionalEmail({
        toEmail: email,
        toName: name,
        subject: mail.subject,
        htmlContent: mail.htmlContent,
        textContent: mail.textContent,
      });
    } catch {
      // Account is created; user can resend from activate page.
      logger.warn('Activation email send failed; token still issued', { userId, email });
    }
    return rawToken;
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
      role: role as RoleName,
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
