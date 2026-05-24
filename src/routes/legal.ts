import { Router } from 'express'

const router = Router()

router.get('/tos', (_req, res) => {
    res.render('tos')
})

router.get('/policy', (_req, res) => {
    res.render('policy')
})

export default router
