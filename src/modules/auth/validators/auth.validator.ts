import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

/** Accept 08… / +62… / 62… Indonesian mobile numbers. */
export function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').trim();
  let normalized = digits;
  if (normalized.startsWith('+')) normalized = normalized.slice(1);
  if (normalized.startsWith('0')) normalized = `62${normalized.slice(1)}`;
  if (!normalized.startsWith('62')) normalized = `62${normalized}`;
  return normalized;
}

const whatsappSchema = z
  .string()
  .min(9, 'Nomor WA wajib diisi')
  .max(20)
  .transform((value) => normalizeWhatsapp(value))
  .refine((value) => /^62\d{8,15}$/.test(value), 'Nomor WhatsApp tidak valid');

export const registerSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  name: z.string().min(1).max(120).optional(),
});

export const registerAffiliatorSchema = z.object({
  name: z.string().min(2, 'Nama wajib diisi').max(120).transform((v) => v.trim()),
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  whatsapp: whatsappSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const activateAccountSchema = z.object({
  token: z.string().min(1),
});

export const resendActivationSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterAffiliatorInput = z.infer<typeof registerAffiliatorSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
export type ResendActivationInput = z.infer<typeof resendActivationSchema>;
