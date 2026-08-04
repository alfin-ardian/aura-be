import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../../../constants/index.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/api-response.js';
import type { AuthService } from '../services/auth.service.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator.js';

/**
 * Auth HTTP adapter — no business logic.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body as RegisterInput);
    sendCreated(res, result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body as LoginInput);
    sendSuccess(res, result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.authService.refresh(req.body as RefreshTokenInput);
    sendSuccess(res, tokens);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(req.body as LogoutInput);
    sendSuccess(res, { message: 'Logged out' }, HTTP_STATUS.OK);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.forgotPassword(req.body as ForgotPasswordInput);
    sendSuccess(res, result);
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    await this.authService.resetPassword(req.body as ResetPasswordInput);
    sendSuccess(res, { message: 'Password updated' });
  };
}
