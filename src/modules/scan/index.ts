import { Router } from 'express';
import { ROLES } from '../../constants/index.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateRequest } from '../../middlewares/validate.js';
import { handleMulterError, uploadScanImage } from '../../middlewares/index.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import type { IAiClient } from '../../shared/services/ai-client.js';
import type { RecommendationService } from '../recommendation/services/recommendation.service.js';
import type { IUserRepository } from '../user/interfaces/user.repository.interface.js';
import type { PreferenceReader } from './services/scan.service.js';
import { ScanController } from './controllers/scan.controller.js';
import { productIdParamSchema } from '../product/validators/product.validator.js';
import type { IHistoryRepository, IScanRepository } from './repositories/scan.repository.js';
import { LeadService } from './services/lead.service.js';
import { ScanService } from './services/scan.service.js';

export interface ScanModuleDeps {
  aiClient: IAiClient;
  scanRepository: IScanRepository;
  historyRepository: IHistoryRepository;
  recommendationService: RecommendationService;
  preferenceReader?: PreferenceReader;
  userRepository: IUserRepository;
}

export function createScanModule(deps: ScanModuleDeps): Router {
  const service = new ScanService(
    deps.aiClient,
    deps.scanRepository,
    deps.historyRepository,
    deps.recommendationService,
    deps.preferenceReader,
  );
  const leadService = new LeadService(deps.historyRepository);
  const controller = new ScanController(service, deps.userRepository, leadService);
  const router = Router();

  const upload = (
    req: Parameters<typeof uploadScanImage>[0],
    res: Parameters<typeof uploadScanImage>[1],
    next: Parameters<typeof uploadScanImage>[2],
  ) => {
    uploadScanImage(req, res, (err: unknown) => {
      if (err) {
        handleMulterError(err, req, res, next);
        return;
      }
      next();
    });
  };

  router.get(
    '/leads',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    asyncHandler(controller.listLeads),
  );
  router.get(
    '/leads/:id',
    authenticate,
    authorize(ROLES.AFFILIATOR, ROLES.SUPER_ADMIN),
    validateRequest(productIdParamSchema, 'params'),
    asyncHandler(controller.getLead),
  );

  // Authenticated (affiliator preview)
  router.post('/', authenticate, upload, asyncHandler(controller.create));

  // Public follower scan — no login
  router.post('/public', upload, asyncHandler(controller.createPublic));
  router.get(
    '/public/:id',
    validateRequest(productIdParamSchema, 'params'),
    asyncHandler(controller.getPublic),
  );

  return router;
}
