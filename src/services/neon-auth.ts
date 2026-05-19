import type { Request, Response as ExpressResponse } from 'express'
import {
    NEON_AUTH_KNOWN_COOKIE_NAMES,
    NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAMES,
    NEON_AUTH_SESSION_VERIFIER_PARAM_NAME,
    NeonAuthSessionPayload,
    getNeonAuthBaseUrl,
    getNeonAuthCookieSameSite,
    isNeonAuthCookieName
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

export async function startGoogleSignIn(req: Request, res: ExpressResponse, callbackURL: string, errorCallbackURL: string): Promise<string> {
    const response = await callNeonAuth({
        body: {
            callbackURL,
            errorCallbackURL,
            newUserCallbackURL: callbackURL,
            provider: 'google',
            requestSignUp: true
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

    const hasChallengeCookie = NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAMES.some((cookieName) => {
        return Boolean(req.cookies?.[cookieName])
    })

    if (!verifier || !hasChallengeCookie) {
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

export async function signOutNeonAuth(req: Request, res: ExpressResponse): Promise<void> {
    try {
        const response = await callNeonAuth({
            body: {},
            method: 'POST',
            path: 'sign-out',
            req
        })

        forwardNeonAuthCookies(response, res)

        if (!response.ok && response.status !== 401) {
            throw new Error(`Neon Auth sign-out failed with status ${response.status}`)
        }
    } finally {
        expireNeonAuthCookies(req, res)
    }
}

function hasNeonAuthCookie(req: Request): boolean {
    return Object.keys(req.cookies ?? {}).some(isNeonAuthCookieName)
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

    const userAgent = options.req.get('user-agent')
    const referer = options.req.get('referer')

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
        .filter(([name]) => isNeonAuthCookieName(name))
        .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`)
        .join('; ')
}

function forwardNeonAuthCookies(response: globalThis.Response, res: ExpressResponse): void {
    for (const cookie of getSetCookieHeaders(response.headers)) {
        res.append('Set-Cookie', rewriteNeonAuthCookie(cookie))
    }
}

function expireNeonAuthCookies(req: Request, res: ExpressResponse): void {
    const cookieNames = new Set([
        ...NEON_AUTH_KNOWN_COOKIE_NAMES,
        ...Object.keys(req.cookies ?? {}).filter(isNeonAuthCookieName)
    ])

    for (const cookieName of cookieNames) {
        res.append('Set-Cookie', buildExpiredNeonAuthCookie(cookieName))
        res.append('Set-Cookie', buildExpiredNeonAuthCookie(cookieName, true))
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

function buildExpiredNeonAuthCookie(cookieName: string, partitioned = false): string {
    const parts = [
        `${cookieName}=`,
        'Max-Age=0',
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'Path=/',
        'HttpOnly',
        'Secure',
        `SameSite=${formatSameSite(getNeonAuthCookieSameSite())}`
    ]

    if (partitioned) {
        parts.push('Partitioned')
    }

    return parts.join('; ')
}

function getRequestOrigin(req: Request): string {
    return `${req.protocol}://${req.get('host')}`
}

function formatSameSite(value: 'strict' | 'lax' | 'none'): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}
