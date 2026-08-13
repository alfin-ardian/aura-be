import { z } from 'zod';

export const checkoutSchema = z.object({
  planId: z.enum(['starter', 'growth', 'scale']),
  method: z.enum(['qris', 'va', 'ewallet']).default('qris'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
