import { Router } from 'express'
import { budgetSeedPayload } from '../mock/orcamentos'

const router = Router()

router.get('/clientes', (_req, res) => {
    const serializedSeed = JSON.stringify({
        clients: budgetSeedPayload.clients
    }).replace(/</g, '\\u003c')

    res.render('clientes', {
        serializedSeed
    })
})

export default router
