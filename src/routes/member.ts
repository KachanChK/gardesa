import { Router, type Response } from 'express'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middlewares/auth'
import {
    AI_RENDER_ALLOWED_CONTENT_TYPES,
    AI_RENDER_MAX_UPLOAD_BYTES,
    isAiRenderQuality,
    isAiRenderWeather
} from '../services/render-config'
import { createPendingAiRender, findAiRenderForUser } from '../services/render-repository'
import {
    buildOriginalImagePathname,
    createUploadClientToken,
    pipePrivateBlobToResponse
} from '../services/render-storage'
import { generateRenderForUser, getPublicRenderErrorMessage } from '../services/render-service'

const router = Router()

router.use('/member', requireAuth)

router.get('/member', (_req, res) => {
    res.render('member', {
        currentUser: res.locals.currentUser
    })
})

router.get('/member/render', (_req, res) => {
    res.render('render-ai', {
        currentUser: res.locals.currentUser
    })
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
        res.status(400).json({ message: 'A imagem deve ter ate 10 MB.' })
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
        console.error('[Render IA] Erro ao preparar upload:', error)
        res.status(500).json({ message: 'Nao foi possivel preparar o upload da imagem.' })
    }
})

router.post('/member/render/generate', async (req, res) => {
    const currentUser = getCurrentUser(res)
    const renderId = typeof req.body?.renderId === 'string' ? req.body.renderId : ''
    const weather = req.body?.weather
    const quality = req.body?.quality

    if (!currentUser) {
        res.status(401).json({ message: 'Faca login para gerar renders.' })
        return
    }

    if (!isUuid(renderId)) {
        res.status(400).json({ message: 'Imagem enviada invalida.' })
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

    try {
        const result = await generateRenderForUser({
            quality,
            renderId,
            userId: currentUser.id,
            weather
        })

        res.json(result)
    } catch (error) {
        console.error('[Render IA] Erro na geracao:', error)
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
        const pathname = kind === 'original'
            ? render?.original_blob_pathname
            : render?.rendered_blob_pathname

        if (!pathname) {
            res.status(404).send('Imagem nao encontrada.')
            return
        }

        await pipePrivateBlobToResponse(pathname, res)
    } catch (error) {
        console.error('[Render IA] Erro ao servir imagem:', error)
        res.status(500).send('Nao foi possivel carregar a imagem.')
    }
})

router.get('/member/gallery', (_req, res) => {
    res.render('gallery', {
        currentUser: res.locals.currentUser
    })
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

export default router
