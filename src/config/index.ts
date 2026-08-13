import { config } from './env.js';

/**
 * Central application settings.
 * Loaded once at boot — fail-fast on invalid env (Stripe-style).
 */
export const appConfig = {
  env: config.NODE_ENV,
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
  port: config.PORT,
  databaseUrl: config.DATABASE_URL,
  jwt: {
    secret: config.JWT_SECRET,
    accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  },
  ai: {
    baseUrl: config.AI_SERVICE_URL.replace(/\/$/, ''),
    timeoutMs: config.AI_SERVICE_TIMEOUT_MS,
    predictPath: '/predict',
  },
  corsOrigin: config.CORS_ORIGIN,
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
  },
  upload: {
    dir: config.UPLOAD_DIR,
    maxBytes: config.MAX_UPLOAD_BYTES,
  },
  bcryptRounds: config.BCRYPT_ROUNDS,
  logLevel: config.LOG_LEVEL,
  redisUrl: config.REDIS_URL,
  openai: {
    apiKey: config.OPENAI_API_KEY,
    model: config.OPENAI_MODEL,
    timeoutMs: config.OPENAI_TIMEOUT_MS,
  },
  frontendUrl: config.FRONTEND_URL.replace(/\/$/, ''),
  brevo: {
    apiKey: config.BREVO_API_KEY,
    senderEmail: config.BREVO_SENDER_EMAIL,
    senderName: config.BREVO_SENDER_NAME,
  },
  midtrans: {
    merchantId: config.MIDTRANS_MERCHANT_ID,
    clientKey: config.MIDTRANS_CLIENT_KEY,
    serverKey: config.MIDTRANS_SERVER_KEY,
    isProduction: Boolean(config.MIDTRANS_IS_PRODUCTION),
  },
} as const;

export type AppConfig = typeof appConfig;
