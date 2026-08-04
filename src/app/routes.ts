import { Router } from 'express';
import type { AppContainer } from './container.js';
import { createAuthModule } from '../modules/auth/index.js';
import { createUserModule } from '../modules/user/index.js';
import { createProfileModule } from '../modules/profile/index.js';
import { createProductModule } from '../modules/product/index.js';
import { createIngredientModule } from '../modules/ingredient/index.js';
import { createRecommendationModule } from '../modules/recommendation/index.js';
import { createScanModule } from '../modules/scan/index.js';
import { createHistoryModule } from '../modules/history/index.js';
import { createHealthModule } from '../modules/health/index.js';
import { createWishlistModule } from '../modules/wishlist/index.js';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();

  router.use('/auth', createAuthModule({ authRepository: container.authRepository }));
  router.use('/users', createUserModule({ userRepository: container.userRepository }));
  router.use('/profile', createProfileModule({ profileRepository: container.profileRepository }));
  router.use(
    '/products',
    createProductModule({ productRepository: container.productRepository }),
  );
  router.use(
    '/ingredients',
    createIngredientModule({ ingredientRepository: container.ingredientRepository }),
  );
  router.use(
    '/recommendation',
    createRecommendationModule({
      recommendationRepository: container.recommendationRepository,
      ingredientRepository: container.ingredientRepository,
      productRepository: container.productRepository,
      scanRepository: container.scanRepository,
      profileService: container.profileService,
      ruleEngine: container.ruleEngine,
    }),
  );
  router.use(
    '/scan',
    createScanModule({
      aiClient: container.aiClient,
      scanRepository: container.scanRepository,
      historyRepository: container.historyRepository,
      recommendationService: container.recommendationService,
      preferenceReader: container.profileService,
    }),
  );
  router.use(
    '/scan/history',
    createHistoryModule({ historyRepository: container.historyRepository }),
  );
  router.use('/wishlist', createWishlistModule(container.db));
  router.use('/health', createHealthModule({ aiClient: container.aiClient }));

  return router;
}
