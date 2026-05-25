import Replicate from 'replicate'
import {
    AI_RENDER_MODEL_VERSION,
    AI_RENDER_OUTPUT_FORMAT,
    buildAiRenderPrompt,
    type AiRenderEnvironment,
    type AiRenderQuality,
    type AiRenderWeather
} from './render-config'

export interface NanoBananaInput {
    aspect_ratio: 'match_input_image'
    google_search: true
    image_input: Buffer[]
    image_search: false
    output_format: typeof AI_RENDER_OUTPUT_FORMAT
    prompt: string
    resolution: AiRenderQuality
}

export interface ReplicateRenderResult {
    imageBuffer: Buffer
    outputUrl: string
    predictionId: string | null
}

export function buildNanoBananaInput(options: {
    environment: AiRenderEnvironment
    imageBuffer: Buffer
    quality: AiRenderQuality
    weather: AiRenderWeather
}): NanoBananaInput {
    return {
        aspect_ratio: 'match_input_image',
        google_search: true,
        image_input: [options.imageBuffer],
        image_search: false,
        output_format: AI_RENDER_OUTPUT_FORMAT,
        prompt: buildAiRenderPrompt(options.weather, options.environment),
        resolution: options.quality
    }
}

export async function generateAiRender(options: {
    environment: AiRenderEnvironment
    imageBuffer: Buffer
    quality: AiRenderQuality
    weather: AiRenderWeather
}): Promise<ReplicateRenderResult> {
    const token = process.env.REPLICATE_API_TOKEN

    if (!token) {
        throw new Error('REPLICATE_API_TOKEN nao configurado.')
    }

    const replicate = new Replicate({
        auth: token,
        fileEncodingStrategy: 'upload',
        useFileOutput: false
    })

    let predictionId: string | null = null
    const input = buildNanoBananaInput(options)
    const output = await replicate.run(
        AI_RENDER_MODEL_VERSION,
        {
            input,
            wait: {
                interval: 1500,
                mode: 'poll'
            }
        },
        (prediction) => {
            predictionId = prediction.id ?? predictionId
        }
    )

    const outputUrl = extractFirstUrl(output)

    if (!outputUrl) {
        throw new Error('O Replicate nao retornou uma imagem renderizada.')
    }

    const response = await fetch(outputUrl)

    if (!response.ok) {
        throw new Error('Nao foi possivel baixar a imagem gerada pelo Replicate.')
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())

    return {
        imageBuffer,
        outputUrl,
        predictionId
    }
}

function extractFirstUrl(value: unknown): string | null {
    if (typeof value === 'string' && isOutputUrl(value)) {
        return value
    }

    const fileOutputUrl = extractFileOutputUrl(value)

    if (fileOutputUrl) {
        return fileOutputUrl
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const url = extractFirstUrl(item)

            if (url) {
                return url
            }
        }
    }

    if (typeof value === 'object' && value !== null) {
        for (const item of Object.values(value)) {
            const url = extractFirstUrl(item)

            if (url) {
                return url
            }
        }
    }

    return null
}

function isOutputUrl(value: string): boolean {
    return value.startsWith('https://') || value.startsWith('data:image/')
}

function extractFileOutputUrl(value: unknown): string | null {
    if (typeof value !== 'object' || value === null) {
        return null
    }

    const fileOutput = value as {
        url?: unknown
    }

    if (typeof fileOutput.url === 'function') {
        const url = fileOutput.url()
        const normalizedUrl = url instanceof URL ? url.toString() : String(url)

        if (isOutputUrl(normalizedUrl)) {
            return normalizedUrl
        }
    }

    if (typeof fileOutput.url === 'string' && isOutputUrl(fileOutput.url)) {
        return fileOutput.url
    }

    return null
}
