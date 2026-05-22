export const AI_RENDER_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const AI_RENDER_ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const
export const AI_RENDER_OUTPUT_FORMAT = 'jpg'
export const AI_RENDER_MODEL = 'google/nano-banana-2'
export const AI_RENDER_MODEL_VERSION = 'google/nano-banana-2:b7866a051519a43b5dda3ee54a3013c4813939a18af2b627f8f1dba876efd443'
export const AI_RENDER_REPLICATE_MODEL_LABEL = 'google/nano-banana-2:b7866a051519a43b5dda3ee54a3013c4813939a18af2b627f8f1dba876efd443'

export const AI_RENDER_WEATHERS = ['dia', 'noite', 'chuvoso'] as const
export const AI_RENDER_QUALITIES = ['1K', '2K', '4K'] as const

export type AiRenderWeather = typeof AI_RENDER_WEATHERS[number]
export type AiRenderQuality = typeof AI_RENDER_QUALITIES[number]

export const AI_RENDER_PROMPTS: Record<AiRenderWeather, string> = {
    dia: 'Transform the uploaded image into an ultra-realistic architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, and textures from the original image. The scene should look as if it was captured during the day by a professional architectural photographer using a high-quality camera, with natural lighting, a clean and smooth blue sky, soft sunlight, balanced exposure, gentle realistic shadows, and a polished high-resolution 4K finish. The sky must appear bright, evenly lit, smooth, and natural, with soft color gradients. Keep the atmosphere clear, elegant, and realistic. Keep the composition clean, elegant, and faithful to the original project. Add subtle tropical landscaping on the horizon and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, and perspective. The final result should feel like a real photograph of a modern residential condominium in Brazil, with realistic materials, natural atmosphere, clean lighting, and sophisticated architectural presentation.',
    noite: 'Transform the uploaded image into an ultra-realistic architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, textures, and visual details from the original image. The scene should look like a real architectural photograph captured during blue hour, just before night, with a deep blue evening sky, soft ambient light, realistic shadows, and a high-resolution 4K finish. Add warm white architectural lighting to the house, highlighting the façade, entrances, walls, textures, and main design elements in a natural and elegant way. Add subtle warm white landscape lighting around the vegetation, creating a sophisticated residential atmosphere. Keep the composition clean, elegant, and faithful to the original project. Add subtle tropical landscaping on the horizon and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, perspective, and horizon lines. The final result should feel like a real professional architectural photograph of a modern residential condominium in Brazil during blue hour, with realistic materials, warm lighting, natural atmosphere, and a refined high-end presentation.',
    chuvoso: 'Transform the uploaded image into an ultra-realistic architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, and textures from the original image. The scene should look like a real rainy-day architectural photograph, captured by a professional architectural photographer using a high-quality camera. Use predominantly cloudy skies, soft diffused daylight, realistic overcast shadows, subtle wet surfaces, natural reflections on the ground, and a high-resolution 4K finish. Keep the composition clean, elegant, and faithful to the original project. Add subtle tropical landscaping on the horizon, with small trees and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, and perspective. The final result should feel like a real photograph of a modern residential condominium in Brazil on a rainy, cloudy day, with realistic materials, natural atmosphere, wet architectural surfaces, and sophisticated architectural presentation.'
}

export function isAiRenderWeather(value: unknown): value is AiRenderWeather {
    return typeof value === 'string' && AI_RENDER_WEATHERS.includes(value as AiRenderWeather)
}

export function isAiRenderQuality(value: unknown): value is AiRenderQuality {
    return typeof value === 'string' && AI_RENDER_QUALITIES.includes(value as AiRenderQuality)
}

export function getUploadExtension(contentType: string): 'png' | 'jpg' {
    return contentType === 'image/png' ? 'png' : 'jpg'
}

export function getPublicQualityFromSliderValue(value: number): AiRenderQuality {
    if (value === 1) {
        return '1K'
    }

    if (value === 3) {
        return '4K'
    }

    return '2K'
}

