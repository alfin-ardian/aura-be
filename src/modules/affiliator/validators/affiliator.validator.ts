import { z } from 'zod';

export const createAffiliatorSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

export const updateAffiliatorSchema = z
  .object({
    email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()).optional(),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Za-z]/)
      .regex(/[0-9]/)
      .optional(),
    name: z.string().min(1).max(120).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const affiliatorIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateAffiliatorInput = z.infer<typeof createAffiliatorSchema>;
export type UpdateAffiliatorInput = z.infer<typeof updateAffiliatorSchema>;
