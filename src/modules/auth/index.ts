import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { validateRequest } from '../../middlewares/validate.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import type { IAuthRepository } from './interfaces/auth.repository.interface.js';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
} from './validators/auth.validator.js';

export interface AuthModuleDeps {
  authRepository: IAuthRepository;
}

export function createAuthModule(deps: AuthModuleDeps): Router {
  const service = new AuthService(deps.authRepository);
  const controller = new AuthController(service);
  const router = Router();

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   */
  router.post(
    '/register',
    validateRequest(registerSchema),
    asyncHandler(controller.register),
  );

  router.post('/login', validateRequest(loginSchema), asyncHandler(controller.login));
  router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(controller.refresh));
  router.post('/logout', validateRequest(logoutSchema), asyncHandler(controller.logout));
  router.post(
    '/forgot-password',
    validateRequest(forgotPasswordSchema),
    asyncHandler(controller.forgotPassword),
  );
  router.post(
    '/reset-password',
    validateRequest(resetPasswordSchema),
    asyncHandler(controller.resetPassword),
  );

  return router;
}
