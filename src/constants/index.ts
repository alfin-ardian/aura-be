export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  AFFILIATOR: 'AFFILIATOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE_ENTITY',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const MAKEUP_TYPES = {
  FOUNDATION: 'Foundation',
  CONCEALER: 'Concealer',
  CUSHION: 'Cushion',
  POWDER: 'Loose Powder',
  BLUSH: 'Blush',
  LIP_CREAM: 'Lip Cream',
  LIP_TINT: 'Lip Tint',
  MASCARA: 'Mascara',
  EYESHADOW: 'Eyeshadow',
  BROW: 'Eyebrows',
} as const;

export const SKINCARE_TYPES = {
  CLEANSER: 'Cleanser',
  TONER: 'Toner',
  ESSENCE: 'Essence',
  SERUM: 'Serum',
  MOISTURIZER: 'Moisturizer',
  SUNSCREEN: 'Sunscreen',
  EXFOLIATOR: 'Exfoliator',
  MASK: 'Mask',
  EYE_CARE: 'Eye Care',
  ACNE_TREATMENT: 'Acne Treatment',
} as const;

/** Skin concerns used to tag skincare products and explain matches. */
export const SKIN_CONCERNS = {
  ACNE: 'acne',
  OILY: 'oily',
  DRY: 'dry',
  SENSITIVE: 'sensitive',
  DULL: 'dullness',
  AGING: 'aging',
  PORES: 'pores',
  DARK_SPOTS: 'dark spots',
} as const;

export const TOP_N_RECOMMENDATIONS = 5;

export const SKIN_TONES = ['Fair', 'Light', 'Medium', 'Tan', 'Deep'] as const;
export const UNDERTONES = ['Warm', 'Cool', 'Neutral'] as const;
export const FACE_SHAPES = ['Oval', 'Round', 'Square', 'Heart', 'Oblong', 'Diamond'] as const;
