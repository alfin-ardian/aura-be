import { z } from 'zod';

const optionalHttpUrl = z
  .union([z.string().max(2000), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value.trim().length === 0) return null;
    return value.trim();
  });

export const createProductSchema = z.object({
  brand: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
    .optional(),
  description: z.string().max(8000).optional(),
  imageUrl: optionalHttpUrl,
  category: z.string().min(1).max(80).optional(),
  subcategory: z.string().min(1).max(120).optional().nullable(),
  finish: z.enum(['matte', 'natural', 'dewy', 'glossy']).optional().nullable(),
  undertoneMatch: z.enum(['warm', 'cool', 'neutral', 'universal']).optional().nullable(),
  usage: z.string().max(2000).optional().nullable(),
  benefits: z.array(z.string().min(1).max(120)).max(30).optional(),
  tags: z.array(z.string().min(1).max(80)).max(50).optional(),
  ingredients: z.array(z.string().min(1).max(80)).max(30).optional(),
  uses: z.array(z.string().min(1).max(200)).max(20).optional(),
  reviewSummary: z.string().max(2000).optional().nullable(),
  sources: z.array(z.string().min(1).max(2000)).max(15).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).optional().nullable(),
  minPrice: z.number().int().min(0).optional().nullable(),
  maxPrice: z.number().int().min(0).optional().nullable(),
  sourceUrl: optionalHttpUrl,
  affiliateUrl: optionalHttpUrl,
  socoId: z.string().min(1).max(80).optional().nullable(),
  makeupTypeIds: z.array(z.string().uuid()).max(20).optional(),
  isActive: z.boolean().optional(),
});

export const researchProductSchema = z.object({
  query: z.string().min(2).max(200),
  save: z.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ResearchProductInput = z.infer<typeof researchProductSchema>;
