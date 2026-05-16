import type { Request } from 'express'

export const NEON_AUTH_COOKIE_PREFIX = '__Secure-neon-auth'
export const NEON_AUTH_SESSION_COOKIE_NAME = `${NEON_AUTH_COOKIE_PREFIX}.session_token`
export const NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME = `${NEON_AUTH_COOKIE_PREFIX}.session_challange`
export const NEON_AUTH_SESSION_VERIFIER_PARAM_NAME = 'neon_auth_session_verifier'

export interface NeonAuthUser {
    email: string
    emailVerified?: boolean
    id: string
    image?: string | null
    name: string
}

export interface NeonAuthSessionPayload {
    session: unknown | null
    user: NeonAuthUser | null
}

export function getNeonAuthBaseUrl(): string {
    const baseUrl = process.env.NEON_AUTH_BASE_URL

    if (!baseUrl) {
        throw new Error('NEON_AUTH_BASE_URL e obrigatoria para Neon Auth')
    }

    return baseUrl.replace(/\/+$/, '')
}

export function getAppUrl(req?: Request): string {
    const configuredUrl = process.env.AUTH_URL ?? process.env.APP_URL

    if (configuredUrl) {
        return configuredUrl.replace(/\/+$/, '')
    }

    if (req) {
        return `${req.protocol}://${req.get('host')}`
    }

    return `http://localhost:${process.env.PORT ?? 3000}`
}

export function getSafeRedirectPath(value: unknown): string {
    const path = Array.isArray(value) ? value[0] : value

    if (typeof path !== 'string') {
        return '/member'
    }

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return '/member'
    }

    return path
}

export function getNeonAuthCookieSameSite(): 'strict' | 'lax' | 'none' {
    const configured = process.env.NEON_AUTH_COOKIE_SAMESITE?.toLowerCase()

    if (configured === 'strict' || configured === 'none') {
        return configured
    }

    return 'lax'
}
