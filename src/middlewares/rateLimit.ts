import rateLimit from 'express-rate-limit'
import { getSafeRedirectPath } from '../utils/validation'

// Máximo 5 inscrições por IP a cada 5 minutos
export const waitlistRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    // Retorna como o formulário espera (redirect com erro via flash ou re-render)
    res.render('landing', {
      waitlistErro: 'Muitas tentativas. Tente novamente em 5 minutos.',
      waitlistSucesso: false,
      waitlistCount: null
    })
  }
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const targetPath = req.path.includes('/cadastro') ? '/auth/cadastro' : '/auth/login'
    const nextPath = getSafeRedirectPath(req.body?.next ?? req.query?.next)

    res.redirect(`${targetPath}?status=rate-limited&next=${encodeURIComponent(nextPath)}`)
  }
})
