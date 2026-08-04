import type { PrismaClient } from '@prisma/client';
import { AiClient, type IAiClient } from '../shared/services/ai-client.js';
import { AuthRepository } from '../modules/auth/repositories/auth.repository.js';
import { UserRepository } from '../modules/user/repositories/user.repository.js';
import { ProfileRepository } from '../modules/profile/repositories/profile.repository.js';
import { ProfileService } from '../modules/profile/services/profile.service.js';
import { ProductRepository } from '../modules/product/repositories/product.repository.js';
import { IngredientRepository } from '../modules/ingredient/repositories/ingredient.repository.js';
import { RecommendationRepository } from '../modules/recommendation/repositories/recommendation.repository.js';
import { RecommendationRuleEngine } from '../modules/recommendation/engine/rule-engine.js';
import {
  HistoryRepository,
  ScanRepository,
} from '../modules/scan/repositories/scan.repository.js';
import { createRecommendationService } from '../modules/recommendation/index.js';
import type { RecommendationService } from '../modules/recommendation/services/recommendation.service.js';

export interface AppContainer {
  db: PrismaClient;
  authRepository: AuthRepository;
  userRepository: UserRepository;
  profileRepository: ProfileRepository;
  profileService: ProfileService;
  productRepository: ProductRepository;
  ingredientRepository: IngredientRepository;
  recommendationRepository: RecommendationRepository;
  scanRepository: ScanRepository;
  historyRepository: HistoryRepository;
  ruleEngine: RecommendationRuleEngine;
  aiClient: IAiClient;
  recommendationService: RecommendationService;
}

export function createContainer(db: PrismaClient, aiClient?: IAiClient): AppContainer {
  const ingredientRepository = new IngredientRepository(db);
  const productRepository = new ProductRepository(db);
  const recommendationRepository = new RecommendationRepository(db);
  const ruleEngine = new RecommendationRuleEngine();
  const profileRepository = new ProfileRepository(db);
  const profileService = new ProfileService(profileRepository);

  const recommendationService = createRecommendationService({
    recommendationRepository,
    ingredientRepository,
    productRepository,
    ruleEngine,
  });

  return {
    db,
    authRepository: new AuthRepository(db),
    userRepository: new UserRepository(db),
    profileRepository,
    profileService,
    productRepository,
    ingredientRepository,
    recommendationRepository,
    scanRepository: new ScanRepository(db),
    historyRepository: new HistoryRepository(db),
    ruleEngine,
    aiClient: aiClient ?? new AiClient(),
    recommendationService,
  };
}
