import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { validateRequest } from '../../middlewares/validate.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import type { IAuthRepository } from './interfaces/auth.repository.interface.js';
import {
  activateAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerAffiliatorSchema,
  registerSchema,
  resendActivationSchema,
  resetPasswordSchema,
} from './validators/auth.validator.js';

export interface AuthModuleDeps {
  authRepository: IAuthRepository;
}

export function createAuthModule(deps: AuthModuleDeps): Router {
  const service = new AuthService(deps.authRepository);
  const controller = new AuthController(service);
  const router = Router();

  router.post(
    '/register',
    validateRequest(registerSchema),
    asyncHandler(controller.register),
  );

  router.post(
    '/register-affiliator',
    validateRequest(registerAffiliatorSchema),
    asyncHandler(controller.registerAffiliator),
  );

  router.post(
    '/activate',
    validateRequest(activateAccountSchema),
    asyncHandler(controller.activateAccount),
  );

  router.post(
    '/resend-activation',
    validateRequest(resendActivationSchema),
    asyncHandler(controller.resendActivation),
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
