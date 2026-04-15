import { z } from 'zod'
import { isEmail } from 'validator'

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .max(254, 'Informe um e-mail valido.')
  .transform(normalizeEmail)
  .refine((value) => isEmail(value), 'Informe um e-mail valido.')

const passwordSchema = z
  .string()
  .min(6, 'A senha precisa ter pelo menos 6 caracteres.')
  .max(128, 'A senha informada e muito longa.')
  .refine((value) => /[A-Z]/.test(value), 'A senha precisa ter pelo menos uma letra maiuscula.')
  .refine((value) => /\d/.test(value), 'A senha precisa ter pelo menos um numero.')
  .refine(
    (value) => /[^A-Za-z0-9]/.test(value),
    'A senha precisa ter pelo menos um caractere especial.'
  )

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Informe seu nome.')
      .max(80, 'Seu nome esta muito longo.')
      .transform(normalizeName)
      .refine((value) => !/[<>]/.test(value), 'Use apenas texto valido no campo nome.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha.')
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas nao conferem.',
        path: ['confirmPassword']
      })
    }
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.').max(128, 'Senha invalida.')
})

export const sessionSyncSchema = z.object({
  accessToken: z.string().min(20, 'Token invalido.').max(5000, 'Token invalido.'),
  refreshToken: z.string().min(20, 'Token invalido.').max(5000, 'Token invalido.'),
  next: z.string().optional()
})

export function getSafeRedirectPath(value: unknown, fallback = '/app') {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()

  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback
  }

  return trimmed
}

export function getFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors
}
