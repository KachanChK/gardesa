import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('Variável RESEND_API_KEY é obrigatória')
}

export const resend = new Resend(process.env.RESEND_API_KEY)