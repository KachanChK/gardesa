import { Router } from 'express'

const router = Router()

const disabledRoutes = [
    '/inicio',
    '/orcamentos',
    '/orcamentos/preview',
    '/orcamentos/export',
    '/clientes',
    '/empresa',
    '/empresa/validate'
]

router.all(disabledRoutes, (_req, res) => {
    res.redirect(303, '/member')
})

export default router
