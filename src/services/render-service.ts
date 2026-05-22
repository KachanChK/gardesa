import {
    AI_RENDER_MAX_UPLOAD_BYTES,
    AI_RENDER_OUTPUT_FORMAT,
    AI_RENDER_PROMPTS,
    AI_RENDER_REPLICATE_MODEL_LABEL,
    type AiRenderQuality,
    type AiRenderWeather
} from './render-config'
import { getImageMetadata } from './render-images'
import {
    buildRenderedImagePathname,
    readPrivateBlob,
    writeRenderedImage
} from './render-storage'
import {
    findAiRenderForUser,
    markAiRenderCompleted,
    markAiRenderFailed,
    markAiRenderProcessing
} from './render-repository'
import { generateAiRender } from './replicate-render'

export async function generateRenderForUser(options: {
    quality: AiRenderQuality
    renderId: string
    userId: string
    weather: AiRenderWeather
}): Promise<{
    id: string
    originalImageUrl: string
    renderedImageUrl: string
    status: 'completed'
}> {
    const render = await findAiRenderForUser(options.renderId, options.userId)

    if (!render || !render.original_blob_pathname) {
        throw new Error('Imagem enviada nao encontrada.')
    }

    try {
        const originalBlob = await readPrivateBlob(render.original_blob_pathname)

        if (originalBlob.size > AI_RENDER_MAX_UPLOAD_BYTES) {
            throw new Error('A imagem excede o limite de 10 MB.')
        }

        const originalMetadata = getImageMetadata(originalBlob.buffer)
        const promptUsed = AI_RENDER_PROMPTS[options.weather]

        await markAiRenderProcessing({
            aspectRatio: originalMetadata.aspectRatio,
            height: originalMetadata.height,
            id: options.renderId,
            promptUsed,
            quality: options.quality,
            replicateModel: AI_RENDER_REPLICATE_MODEL_LABEL,
            userId: options.userId,
            weather: options.weather,
            width: originalMetadata.width
        })

        const result = await generateAiRender({
            imageBuffer: originalBlob.buffer,
            quality: options.quality,
            weather: options.weather
        })

        const renderedPathname = buildRenderedImagePathname(options.userId, options.renderId)
        await writeRenderedImage(renderedPathname, result.imageBuffer)

        const originalImageUrl = `/member/render/${options.renderId}/image/original`
        const renderedImageUrl = `/member/render/${options.renderId}/image/rendered`

        await markAiRenderCompleted({
            id: options.renderId,
            renderedBlobPathname: renderedPathname,
            renderedImageUrl,
            replicatePredictionId: result.predictionId,
            userId: options.userId
        })

        return {
            id: options.renderId,
            originalImageUrl,
            renderedImageUrl,
            status: 'completed'
        }
    } catch (error) {
        await markAiRenderFailed({
            errorMessage: getPublicRenderErrorMessage(error),
            id: options.renderId,
            userId: options.userId
        })

        throw error
    }
}

export function getOutputFormat(): typeof AI_RENDER_OUTPUT_FORMAT {
    return AI_RENDER_OUTPUT_FORMAT
}

export function getPublicRenderErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Nao foi possivel gerar o render. Tente novamente em instantes.'
}

