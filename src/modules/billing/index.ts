import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { BillingController } from './controllers/billing.controller.js';
import { BillingService } from './services/billing.service.js';

export function createBillingModule(db: PrismaClient): Router {
  const service = new BillingService(db);
  const controller = new BillingController(service);
  const router = Router();

  router.get(
    '/finance',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    asyncHandler(controller.getPlatformFinance),
  );
  router.get(
    '/finance/report',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    asyncHandler(controller.getPlatformFinanceReport),
  );

  router.use(authenticate, authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN));
  router.get('/', asyncHandler(controller.getBilling));
  router.get('/spending', asyncHandler(controller.getSpending));
  router.get('/invoices', asyncHandler(controller.listInvoices));
  router.get('/invoices/:invoiceNumber', asyncHandler(controller.getInvoice));

  return router;
}
