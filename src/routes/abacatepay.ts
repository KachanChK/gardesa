import express, { Router } from 'express'
import {
    isWebhookSecretValid,
    isWebhookSignatureValid,
    processWebhookEvent
} from '../services/abacatepay-webhook'
import { reconcileExpiredSubscriptions } from '../services/credits-service'

const router = Router()

router.post('/webhooks/abacatepay', express.raw({ type: '*/*' }), async (req, res) => {
    if (!isWebhookSecretValid(req.query.webhookSecret)) {
        res.status(401).json({ message: 'Webhook secret invalido.' })
        return
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')

    if (!isWebhookSignatureValid(rawBody, req.get('x-webhook-signature'))) {
        res.status(401).json({ message: 'Assinatura invalida.' })
        return
    }

    try {
        await processWebhookEvent(rawBody)
        res.status(200).json({ received: true })
    } catch (error) {
        console.error('[AbacatePay] Erro ao processar webhook:', error)
        res.status(500).json({ message: 'Erro ao processar webhook.' })
    }
})

router.get('/internal/cron/reconcile-credits', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || req.get('authorization') !== `Bearer ${cronSecret}`) {
        res.status(401).json({ message: 'Não autorizado.' })
        return
    }

    try {
        const downgraded = await reconcileExpiredSubscriptions()
        res.json({ downgraded, ok: true })
    } catch (error) {
        console.error('[Cron] Erro na reconciliacao de creditos:', error)
        res.status(500).json({ message: 'Erro na reconciliação.' })
    }
})

export default router
