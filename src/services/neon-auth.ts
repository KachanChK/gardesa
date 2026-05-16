import type { Request, Response as ExpressResponse } from 'express'
import {
    NEON_AUTH_COOKIE_PREFIX,
    NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME,
    NEON_AUTH_SESSION_VERIFIER_PARAM_NAME,
    NeonAuthSessionPayload,
    getNeonAuthBaseUrl,
    getNeonAuthCookieSameSite
} from '../config/neon-auth'

interface NeonAuthRequestOptions {
    body?: unknown
    method?: 'GET' | 'POST'
    path: string
    req: Request
}

interface NeonSignInResponse {
    redirect?: boolean
    url?: string
}

export async function startGoogleSignIn(req: Request, res: ExpressResponse, callbackURL: string): Promise<string> {
    const response = await callNeonAuth({
        body: {
            callbackURL,
            errorCallbackURL: '/',
            provider: 'google'
        },
        method: 'POST',
        path: 'sign-in/social',
        req
    })

    forwardNeonAuthCookies(response, res)

    if (!response.ok) {
        throw new Error(`Neon Auth sign-in failed with status ${response.status}`)
    }

    const payload = (await response.json()) as NeonSignInResponse

    if (!payload.url) {
        throw new Error('Neon Auth nao retornou URL de login')
    }

    return payload.url
}

export async function getNeonAuthSession(req: Request): Promise<NeonAuthSessionPayload | null> {
    if (!hasNeonAuthCookie(req)) {
        return null
    }

    const response = await callNeonAuth({
        method: 'GET',
        path: 'get-session',
        req
    })

    if (!response.ok) {
        return null
    }

    return response.json() as Promise<NeonAuthSessionPayload>
}

export async function exchangeNeonAuthVerifier(req: Request, res: ExpressResponse): Promise<boolean> {
    const verifier = typeof req.query[NEON_AUTH_SESSION_VERIFIER_PARAM_NAME] === 'string'
        ? req.query[NEON_AUTH_SESSION_VERIFIER_PARAM_NAME]
        : ''

    if (!verifier || !req.cookies?.[NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME]) {
        return false
    }

    const response = await callNeonAuth({
        method: 'GET',
        path: 'get-session',
        req
    })

    if (!response.ok) {
        return false
    }

    forwardNeonAuthCookies(response, res)
    return true
}

export async function signOutFromNeonAuth(req: Request, res: ExpressResponse): Promise<void> {
    const response = await callNeonAuth({
        method: 'POST',
        path: 'sign-out',
        req
    })

    forwardNeonAuthCookies(response, res)
    clearLocalNeonAuthCookies(req, res)
}

function hasNeonAuthCookie(req: Request): boolean {
    return Object.keys(req.cookies ?? {}).some((cookieName) => cookieName.startsWith(NEON_AUTH_COOKIE_PREFIX))
}

async function callNeonAuth(options: NeonAuthRequestOptions): Promise<globalThis.Response> {
    const method = options.method ?? 'GET'
    const upstreamUrl = new URL(`${getNeonAuthBaseUrl()}/${options.path}`)

    upstreamUrl.search = new URL(options.req.originalUrl, getRequestOrigin(options.req)).search

    const headers: Record<string, string> = {
        Cookie: getNeonAuthCookieHeader(options.req),
        Origin: getRequestOrigin(options.req),
        'x-neon-auth-middleware': 'true'
    }

    const contentType = options.req.get('content-type')
    const userAgent = options.req.get('user-agent')
    const referer = options.req.get('referer')

    if (contentType) {
        headers['content-type'] = contentType
    }

    if (userAgent) {
        headers['user-agent'] = userAgent
    }

    if (referer) {
        headers.referer = referer
    }

    if (options.body !== undefined) {
        headers['content-type'] = 'application/json'
    }

    return fetch(upstreamUrl, {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers,
        method
    })
}

function getNeonAuthCookieHeader(req: Request): string {
    return Object.entries(req.cookies ?? {})
        .filter(([name]) => name.startsWith(NEON_AUTH_COOKIE_PREFIX))
        .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`)
        .join('; ')
}

function forwardNeonAuthCookies(response: globalThis.Response, res: ExpressResponse): void {
    for (const cookie of getSetCookieHeaders(response.headers)) {
        res.append('Set-Cookie', rewriteNeonAuthCookie(cookie))
    }
}

function getSetCookieHeaders(headers: Headers): string[] {
    const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie

    if (typeof getSetCookie === 'function') {
        return getSetCookie.call(headers)
    }

    const cookie = headers.get('set-cookie')
    return cookie ? [cookie] : []
}

function rewriteNeonAuthCookie(cookie: string): string {
    const parts = cookie
        .split(';')
        .map((part) => part.trim())
        .filter((part) => !/^domain=/i.test(part) && !/^samesite=/i.test(part))

    if (!parts.some((part) => /^path=/i.test(part))) {
        parts.push('Path=/')
    }

    parts.push(`SameSite=${formatSameSite(getNeonAuthCookieSameSite())}`)

    return parts.join('; ')
}

function clearLocalNeonAuthCookies(req: Request, res: ExpressResponse): void {
    for (const cookieName of Object.keys(req.cookies ?? {})) {
        if (cookieName.startsWith(NEON_AUTH_COOKIE_PREFIX)) {
            res.clearCookie(cookieName, {
                path: '/',
                sameSite: getNeonAuthCookieSameSite(),
                secure: true
            })
        }
    }
}

function getRequestOrigin(req: Request): string {
    return `${req.protocol}://${req.get('host')}`
}

function formatSameSite(value: 'strict' | 'lax' | 'none'): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}
