export const AI_RENDER_MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const AI_RENDER_ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg'] as const
export const AI_RENDER_OUTPUT_FORMAT = 'jpg'
export const AI_RENDER_MODEL = 'google/nano-banana-2'
export const AI_RENDER_MODEL_VERSION = 'google/nano-banana-2:b7866a051519a43b5dda3ee54a3013c4813939a18af2b627f8f1dba876efd443'
export const AI_RENDER_REPLICATE_MODEL_LABEL = 'google/nano-banana-2:b7866a051519a43b5dda3ee54a3013c4813939a18af2b627f8f1dba876efd443'

export const AI_RENDER_ENVIRONMENTS = ['exterior', 'interior'] as const
export const AI_RENDER_WEATHERS = ['dia', 'noite', 'chuvoso', 'por-do-sol'] as const
export const AI_RENDER_QUALITIES = ['1K', '2K', '4K'] as const
export const AI_RENDER_ASPECT_RATIOS = ['match_input_image', '1:1', '3:4', '16:9', '9:16'] as const

export type AiRenderEnvironment = typeof AI_RENDER_ENVIRONMENTS[number]
export type AiRenderWeather = typeof AI_RENDER_WEATHERS[number]
export type AiRenderQuality = typeof AI_RENDER_QUALITIES[number]
export type AiRenderAspectRatio = typeof AI_RENDER_ASPECT_RATIOS[number]

export const AI_RENDER_PROMPTS: Record<AiRenderWeather, string> = {
    dia: 'Transform the uploaded image into an ultra-realistic exterior architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, and textures from the original image. The scene should look as if it was captured during the day by a professional architectural photographer using a high-quality camera, with natural lighting, a clean and smooth blue sky, soft sunlight, balanced exposure, gentle realistic shadows, and a polished high-resolution finish. The sky must appear bright, evenly lit, smooth, and natural, with soft color gradients. Keep the atmosphere clear, elegant, and realistic. Add subtle tropical landscaping on the horizon and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, and perspective. The final result should feel like a real photograph of a modern residential condominium in Brazil, with realistic materials, natural atmosphere, clean lighting, and sophisticated architectural presentation.',
    noite: 'Transform the uploaded image into an ultra-realistic exterior architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, textures, and visual details from the original image. The scene should look like a real architectural photograph captured during blue hour, just before night, with a deep blue evening sky, soft ambient light, realistic shadows, and a high-resolution finish. Add warm white architectural lighting to the house, highlighting the facade, entrances, walls, textures, and main design elements in a natural and elegant way. Add subtle warm white landscape lighting around the vegetation, creating a sophisticated residential atmosphere. Add subtle tropical landscaping on the horizon and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, perspective, and horizon lines. The final result should feel like a real professional architectural photograph of a modern residential condominium in Brazil during blue hour, with realistic materials, warm lighting, natural atmosphere, and a refined high-end presentation.',
    chuvoso: 'Transform the uploaded image into an ultra-realistic exterior architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, and textures from the original image. The scene should look like a real rainy-day architectural photograph, captured by a professional architectural photographer using a high-quality camera. Use predominantly cloudy skies, soft diffused daylight, realistic overcast shadows, subtle wet surfaces, natural reflections on the ground, and a high-resolution finish. Add subtle tropical landscaping on the horizon, with small trees and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, and perspective. The final result should feel like a real photograph of a modern residential condominium in Brazil on a rainy, cloudy day, with realistic materials, natural atmosphere, wet architectural surfaces, and sophisticated architectural presentation.',
    'por-do-sol': 'Transform the uploaded image into an ultra-realistic exterior architectural photograph, preserving the same framing, perspective, proportions, building volumes, architecture, materials, finishes, colors, and textures from the original image. The scene should look like a real golden-hour architectural photograph, captured near sunset with warm directional light, a smooth sunset sky, soft long shadows, warm highlights on the facade, natural contrast, and a polished high-resolution finish. Keep the atmosphere elegant, realistic, and faithful to the original project. Add subtle tropical landscaping on the horizon and a few modern Brazilian condominium houses in the background, naturally integrated with the image depth, scale, and perspective. The final result should feel like a real photograph of a modern residential condominium in Brazil at sunset, with realistic materials, warm tones, natural atmosphere, and sophisticated architectural presentation.'
}

const AI_RENDER_INTERIOR_PROMPTS: Record<AiRenderWeather, string> = {
    dia: 'Transform the uploaded image into an ultra-realistic interior architectural photograph, preserving the same framing, perspective, proportions, room layout, openings, ceiling height, furniture placement, materials, finishes, colors, textures, and design intent from the original image. The scene should look as if it was captured during the day by a professional interior photographer using a high-quality camera, with natural daylight entering through the windows, balanced exposure, soft realistic shadows, clean highlights, and a polished high-resolution finish. Keep the result elegant, realistic, faithful to the original project, and suitable for a refined Brazilian residential interior presentation.',
    noite: 'Transform the uploaded image into an ultra-realistic interior architectural photograph, preserving the same framing, perspective, proportions, room layout, openings, ceiling height, furniture placement, materials, finishes, colors, textures, and design intent from the original image. The scene should look like a real interior photograph captured at night, with warm artificial lighting, soft ambient shadows, balanced exposure, realistic reflections on surfaces, and a polished high-resolution finish. Highlight architectural and decorative lighting naturally, keeping the atmosphere sophisticated, comfortable, realistic, and faithful to the original project.',
    chuvoso: 'Transform the uploaded image into an ultra-realistic interior architectural photograph, preserving the same framing, perspective, proportions, room layout, openings, ceiling height, furniture placement, materials, finishes, colors, textures, and design intent from the original image. The scene should look like a real interior photograph during a rainy day, with soft diffused daylight through the windows, subtle overcast ambiance, balanced exposure, gentle realistic shadows, and a polished high-resolution finish. Keep the atmosphere calm, elegant, realistic, and faithful to the original residential interior project.',
    'por-do-sol': 'Transform the uploaded image into an ultra-realistic interior architectural photograph, preserving the same framing, perspective, proportions, room layout, openings, ceiling height, furniture placement, materials, finishes, colors, textures, and design intent from the original image. The scene should look like a real interior photograph near sunset, with warm golden-hour light entering through windows, soft long shadows, gentle warm highlights, balanced exposure, realistic reflections, and a polished high-resolution finish. Keep the atmosphere sophisticated, comfortable, realistic, and faithful to the original residential interior project.'
}

export function buildAiRenderPrompt(weather: AiRenderWeather, environment: AiRenderEnvironment): string {
    if (environment === 'interior') {
        return AI_RENDER_INTERIOR_PROMPTS[weather]
    }

    return AI_RENDER_PROMPTS[weather]
}

export function isAiRenderEnvironment(value: unknown): value is AiRenderEnvironment {
    return typeof value === 'string' && AI_RENDER_ENVIRONMENTS.includes(value as AiRenderEnvironment)
}

export function isAiRenderWeather(value: unknown): value is AiRenderWeather {
    return typeof value === 'string' && AI_RENDER_WEATHERS.includes(value as AiRenderWeather)
}

export function isAiRenderQuality(value: unknown): value is AiRenderQuality {
    return typeof value === 'string' && AI_RENDER_QUALITIES.includes(value as AiRenderQuality)
}

export function isAiRenderAspectRatio(value: unknown): value is AiRenderAspectRatio {
    return typeof value === 'string' && AI_RENDER_ASPECT_RATIOS.includes(value as AiRenderAspectRatio)
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
