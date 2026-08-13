import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('7d'),
  /** SUPER_ADMIN only — scope to one affiliator; affiliators always see own data */
  affiliatorId: z.string().uuid().optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
