import rateLimit from 'express-rate-limit'

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