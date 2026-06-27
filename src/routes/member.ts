import { Router, type RequestHandler, type Response } from 'express'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middlewares/auth'
import {
    AI_RENDER_ALLOWED_CONTENT_TYPES,
    AI_RENDER_MAX_UPLOAD_BYTES,
    isAiRenderAspectRatio,
    isAiRenderEnvironment,
    isAiRenderQuality,
    isAiRenderWeather
} from '../services/render-config'
import {
    claimAiRenderForProcessing,
    createPendingAiRender,
    findAiRenderForUser,
    listAiRendersForGallery,
    markAiRenderDeleted,
    markAiRenderFailed,
    updateAiRenderFavorite,
    type AiRenderGalleryRecord
} from '../services/render-repository'
import {
    buildOriginalImagePathname,
    createUploadClientToken,
    deletePrivateBlobs,
    pipePrivateBlobToResponse
} from '../services/render-storage'
import { generateRenderForUser, getPublicRenderErrorMessage } from '../services/render-service'
import {
    ensureRenderQualityAllowed,
    getCreditSummary,
    InsufficientCreditsError,
    QualityNotAllowedError,
    reserveCreditsForRender,
    refundCreditsForRender
} from '../services/credits-service'
import { listPlans } from '../services/credits-repository'
import { createPlanCheckout } from '../services/billing-service'

const router = Router()

router.use('/member', requireAuth)

const attachCreditSummary: RequestHandler = async (_req, res, next) => {
    const currentUser = getCurrentUser(res)

    if (!currentUser) {
        next()
        return
    }

    try {
        res.locals.creditSummary = await getCreditSummary(currentUser.id)
    } catch (error) {
        console.error('[Creditos] Erro ao carregar saldo do usuario:', error)
        res.locals.creditSummary = null
    }

    next()
}

router.get('/member', attachCreditSummary, (_req, res) => {
    res.render('member', {
        currentUser: res.locals.currentUser
    })
})

router.get('/member/render', attachCreditSummary, (_req, res) => {
    res.render('render-ai', {
        currentUser: res.locals.currentUser
    })
})

router.get('/member/billing', attachCreditSummary, async (_req, res) => {
    try {
        const plans = await listPlans()

        res.render('billing', {
            currentUser: res.locals.currentUser,
            plans: plans.filter((plan) => plan.is_paid)
        })
    } catch (error) {
        console.error('[Billing] Erro ao carregar planos:', error)
        res.status(500).render('billing', {
            currentUser: res.locals.currentUser,
            plans: []
        })
    }
})

router.post('/member/billing/checkout', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const planSlug = typeof req.body?.planSlug === 'string' ? req.body.planSlug : ''
    const paymentMethod = req.body?.paymentMethod === 'PIX' ? 'PIX' : 'CARD'
    const taxId = typeof req.body?.taxId === 'string' ? req.body.taxId.replace(/\D/g, '') : ''

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para assinar um plano.' })
        return
    }

    if (taxId.length !== 11 && taxId.length !== 14) {
        res.status(400).json({ message: 'Informe um CPF ou CNPJ valido.' })
        return
    }

    try {
        const checkoutUrl = await createPlanCheckout({
            email: typeof res.locals.currentUser?.email === 'string' ? res.locals.currentUser.email : '',
            name: typeof res.locals.currentUser?.name === 'string' ? res.locals.currentUser.name : '',
            paymentMethod,
            planSlug,
            taxId,
            userId: currentUser.id
        })

        res.redirect(303, checkoutUrl)
    } catch (error) {
        console.error('[Billing] Erro ao criar checkout:', error)
        res.status(400).json({ message: error instanceof Error ? error.message : 'Nao foi possivel iniciar a assinatura.' })
    }
})

router.post('/member/render/upload-intent', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType : ''
    const size = Number(req.body?.size)

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para enviar imagens.' })
        return
    }

    if (!AI_RENDER_ALLOWED_CONTENT_TYPES.includes(contentType as typeof AI_RENDER_ALLOWED_CONTENT_TYPES[number])) {
        res.status(400).json({ message: 'Envie apenas imagens PNG ou JPG.' })
        return
    }

    if (!Number.isFinite(size) || size <= 0 || size > AI_RENDER_MAX_UPLOAD_BYTES) {
        res.status(400).json({ message: 'A imagem deve ter ate 5 MB.' })
        return
    }

    try {
        const renderId = randomUUID()
        const originalBlobPathname = buildOriginalImagePathname(currentUser.id, renderId, contentType)
        const originalImageUrl = `/member/render/${renderId}/image/original`
        const upload = await createUploadClientToken(
            originalBlobPathname,
            contentType as typeof AI_RENDER_ALLOWED_CONTENT_TYPES[number]
        )

        await createPendingAiRender({
            id: renderId,
            originalBlobPathname,
            originalContentType: contentType,
            originalImageUrl,
            originalSizeBytes: size,
            userId: currentUser.id
        })

        res.json({
            maxUploadBytes: AI_RENDER_MAX_UPLOAD_BYTES,
            renderId,
            upload
        })
    } catch (error) {
        console.error('[Renderizar Imagem] Erro ao preparar upload:', error)
        res.status(500).json({ message: 'Nao foi possivel preparar o upload da imagem.' })
    }
})

router.post('/member/render/generate', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const renderId = typeof req.body?.renderId === 'string' ? req.body.renderId : ''
    const environment = req.body?.environment
    const weather = req.body?.weather
    const quality = req.body?.quality
    const aspectRatio = req.body?.aspectRatio

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para gerar renders.' })
        return
    }

    if (!isUuid(renderId)) {
        res.status(400).json({ message: 'Imagem enviada invalida.' })
        return
    }

    if (!isAiRenderEnvironment(environment)) {
        res.status(400).json({ message: 'Selecione o tipo de ambiente do render.' })
        return
    }

    if (!isAiRenderWeather(weather)) {
        res.status(400).json({ message: 'Selecione um clima para gerar o render.' })
        return
    }

    if (!isAiRenderQuality(quality)) {
        res.status(400).json({ message: 'Selecione a qualidade do render.' })
        return
    }

    if (!isAiRenderAspectRatio(aspectRatio)) {
        res.status(400).json({ message: 'Selecione o formato do render.' })
        return
    }

    try {
        await ensureRenderQualityAllowed(currentUser.id, quality)
    } catch (error) {
        if (error instanceof QualityNotAllowedError) {
            res.status(403).json({
                allowedQualities: error.allowedQualities,
                code: 'QUALITY_NOT_ALLOWED',
                message: 'Seu plano atual nao permite esta qualidade de render.',
                upgradeUrl: '/member/billing'
            })
            return
        }

        console.error('[Creditos] Erro ao validar qualidade:', error)
        res.status(500).json({ message: 'Nao foi possivel validar seu plano.' })
        return
    }

    const claimed = await claimAiRenderForProcessing(renderId, currentUser.id)

    if (!claimed) {
        res.status(409).json({ message: 'Este render ja esta sendo gerado.' })
        return
    }

    let reservedBalance: number

    try {
        reservedBalance = await reserveCreditsForRender({ quality, renderId, userId: currentUser.id })
    } catch (error) {
        await markAiRenderFailed({
            errorMessage: 'Creditos insuficientes.',
            id: renderId,
            userId: currentUser.id
        }).catch(() => undefined)

        if (error instanceof InsufficientCreditsError) {
            res.status(402).json({
                balance: error.balance,
                code: 'INSUFFICIENT_CREDITS',
                message: 'Voce nao tem creditos suficientes para gerar este render.',
                requiredCredits: error.requiredCredits,
                upgradeUrl: '/member/billing'
            })
            return
        }

        console.error('[Creditos] Erro ao reservar creditos:', error)
        res.status(500).json({ message: 'Nao foi possivel reservar seus creditos.' })
        return
    }

    try {
        const result = await generateRenderForUser({
            aspectRatio,
            environment,
            quality,
            renderId,
            userId: currentUser.id,
            weather
        })

        res.json({ ...result, balance: reservedBalance })
    } catch (error) {
        await refundCreditsForRender(currentUser.id, renderId).catch((refundError) => {
            console.error('[Creditos] Erro ao estornar creditos:', refundError)
        })

        console.error('[Renderizar Imagem] Erro na geracao:', error)
        res.status(500).json({ message: getPublicRenderErrorMessage(error) })
    }
})

router.get('/member/render/:id/image/:kind', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const { id, kind } = req.params

    if (!currentUser) {
        res.status(401).send('Faca login para acessar esta imagem.')
        return
    }

    if (!isUuid(id) || (kind !== 'original' && kind !== 'rendered')) {
        res.status(404).send('Imagem nao encontrada.')
        return
    }

    try {
        const render = await findAiRenderForUser(id, currentUser.id)

        if (render?.is_deleted) {
            res.status(404).send('Imagem nao encontrada.')
            return
        }

        const pathname = kind === 'original'
            ? render?.original_blob_pathname
            : render?.rendered_blob_pathname

        if (!pathname) {
            res.status(404).send('Imagem nao encontrada.')
            return
        }

        await pipePrivateBlobToResponse(pathname, res)
    } catch (error) {
        console.error('[Renderizar Imagem] Erro ao servir imagem:', error)
        res.status(500).send('Nao foi possivel carregar a imagem.')
    }
})

router.get('/member/gallery', attachCreditSummary, (_req, res) => {
    res.render('gallery', {
        currentUser: res.locals.currentUser
    })
})

router.get('/member/gallery/items', async (req, res) => {
    const currentUser = getCurrentUser(res)

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para acessar sua galeria.' })
        return
    }

    const tab = req.query.tab === 'favorites' ? 'favorites' : 'all'
    const limit = getGalleryLimit(req.query.limit)
    const cursor = parseGalleryCursor(typeof req.query.cursor === 'string' ? req.query.cursor : '')

    if (cursor === false) {
        res.status(400).json({ message: 'Cursor invalido.' })
        return
    }

    try {
        const records = await listAiRendersForGallery({
            cursor,
            favoritesOnly: tab === 'favorites',
            limit: limit + 1,
            userId: currentUser.id
        })
        const visibleRecords = records.slice(0, limit)
        const nextCursor = records.length > limit
            ? encodeGalleryCursor(visibleRecords[visibleRecords.length - 1])
            : null

        res.json({
            items: visibleRecords.map(serializeGalleryRender),
            nextCursor
        })
    } catch (error) {
        console.error('[Galeria] Erro ao listar renders:', error)
        res.status(500).json({ message: 'Nao foi possivel carregar sua galeria.' })
    }
})

router.patch('/member/gallery/:id/favorite', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const { id } = req.params

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para favoritar renders.' })
        return
    }

    if (!isUuid(id) || typeof req.body?.isFavorite !== 'boolean') {
        res.status(400).json({ message: 'Render invalido.' })
        return
    }

    try {
        const render = await updateAiRenderFavorite({
            id,
            isFavorite: req.body.isFavorite,
            userId: currentUser.id
        })

        if (!render) {
            res.status(404).json({ message: 'Render nao encontrado.' })
            return
        }

        res.json({
            id: render.id,
            isFavorite: render.is_favorite
        })
    } catch (error) {
        console.error('[Galeria] Erro ao favoritar render:', error)
        res.status(500).json({ message: 'Nao foi possivel atualizar o favorito.' })
    }
})

router.get('/member/gallery/:id/download', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const { id } = req.params

    if (!currentUser) {
        res.status(401).send('Faca login para baixar renders.')
        return
    }

    if (!isUuid(id)) {
        res.status(404).send('Render nao encontrado.')
        return
    }

    try {
        const render = await findAiRenderForUser(id, currentUser.id)

        if (!render || render.is_deleted || render.status !== 'completed' || !render.rendered_blob_pathname) {
            res.status(404).send('Render nao encontrado.')
            return
        }

        await pipePrivateBlobToResponse(render.rendered_blob_pathname, res, {
            downloadFilename: `gardesa-render-${render.id}.jpg`
        })
    } catch (error) {
        console.error('[Galeria] Erro ao baixar render:', error)
        res.status(500).send('Nao foi possivel baixar o render.')
    }
})

router.delete('/member/gallery/:id', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const { id } = req.params

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para excluir renders.' })
        return
    }

    if (!isUuid(id)) {
        res.status(404).json({ message: 'Render nao encontrado.' })
        return
    }

    try {
        const render = await findAiRenderForUser(id, currentUser.id)

        if (!render || render.is_deleted || render.status !== 'completed') {
            res.status(404).json({ message: 'Render nao encontrado.' })
            return
        }

        await deletePrivateBlobs([render.original_blob_pathname, render.rendered_blob_pathname])
        const deletedRender = await markAiRenderDeleted({ id, userId: currentUser.id })

        if (!deletedRender) {
            res.status(404).json({ message: 'Render nao encontrado.' })
            return
        }

        res.json({
            deleted: true,
            id
        })
    } catch (error) {
        console.error('[Galeria] Erro ao excluir render:', error)
        res.status(500).json({ message: 'Nao foi possivel excluir o render.' })
    }
})

function getCurrentUser(res: Response): { id: string } | null {
    const user = res.locals.currentUser

    if (!user || typeof user.id !== 'string') {
        return null
    }

    return {
        id: user.id
    }
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getGalleryLimit(value: unknown): number {
    const parsed = typeof value === 'string' ? Number(value) : 15

    if (!Number.isFinite(parsed)) {
        return 15
    }

    return Math.max(1, Math.min(30, Math.floor(parsed)))
}

function parseGalleryCursor(value: string): { id: string, sortAt: string } | null | false {
    if (!value) {
        return null
    }

    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
            id?: unknown
            sortAt?: unknown
        }

        if (typeof parsed.id !== 'string' || !isUuid(parsed.id) || typeof parsed.sortAt !== 'string') {
            return false
        }

        const sortAt = new Date(parsed.sortAt)

        if (Number.isNaN(sortAt.getTime())) {
            return false
        }

        return {
            id: parsed.id,
            sortAt: sortAt.toISOString()
        }
    } catch {
        return false
    }
}

function encodeGalleryCursor(record: AiRenderGalleryRecord | undefined): string | null {
    if (!record) {
        return null
    }

    return Buffer.from(JSON.stringify({
        id: record.id,
        sortAt: record.sort_at.toISOString()
    })).toString('base64url')
}

function serializeGalleryRender(record: AiRenderGalleryRecord) {
    return {
        completedAt: record.completed_at?.toISOString() ?? null,
        createdAt: record.created_at.toISOString(),
        generatedAt: (record.completed_at ?? record.created_at).toISOString(),
        id: record.id,
        isFavorite: record.is_favorite,
        originalImageUrl: record.original_image_url ?? `/member/render/${record.id}/image/original`,
        renderedImageUrl: record.rendered_image_url ?? `/member/render/${record.id}/image/rendered`,
        selectedEnvironment: record.selected_environment ?? 'exterior',
        selectedQuality: record.selected_quality,
        selectedWeather: record.selected_weather
    }
}

export default router
