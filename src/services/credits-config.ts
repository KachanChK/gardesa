import type { AiRenderQuality } from './render-config'

export const FREE_PLAN_SLUG = 'free'

export const RENDER_CREDIT_COSTS: Record<AiRenderQuality, number> = {
    '1K': 2,
    '2K': 3,
    '4K': 5
}

export function getRenderCreditCost(quality: AiRenderQuality): number {
    return RENDER_CREDIT_COSTS[quality]
}

export function isQualityAllowed(allowedQualities: string[], quality: AiRenderQuality): boolean {
    return allowedQualities.includes(quality)
}
