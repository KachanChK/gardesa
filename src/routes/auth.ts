import { Router } from 'express'
import { getAppUrl, getSafeRedirectPath } from '../config/neon-auth'
import { exchangeNeonAuthVerifier, signOutNeonAuth, startGoogleSignIn } from '../services/neon-auth'

const router = Router()

router.get('/auth', (req, res) => {
    if (res.locals.currentUser) {
        res.redirect(303, '/member')
        return
    }

    const nextPath = getAuthCallbackPath(req.query.next)

    res.render('auth', {
        authError: typeof req.query.error === 'string',
        googleAuthUrl: `/auth/google?next=${encodeURIComponent(nextPath)}`
    })
})

router.get('/auth/google', async (req, res) => {
    if (res.locals.currentUser) {
        res.redirect(303, '/member')
        return
    }

    try {
        const nextPath = getAuthCallbackPath(req.query.next)
        const callbackURL = buildAuthCallbackUrl(req, nextPath)
        const errorCallbackURL = buildAuthErrorUrl(req, nextPath)
        const googleUrl = await startGoogleSignIn(req, res, callbackURL, errorCallbackURL)

        res.redirect(303, googleUrl)
    } catch (error) {
        console.error('[Neon Auth] Erro ao iniciar login com Google:', error)
        res.status(500).send('Autenticacao indisponivel. Verifique a configuracao do Neon Auth.')
    }
})

router.get('/auth/callback', async (req, res) => {
    const nextPath = getAuthCallbackPath(req.query.next)

    if (res.locals.currentUser) {
        res.redirect(303, nextPath)
        return
    }

    try {
        const exchanged = await exchangeNeonAuthVerifier(req, res)

        if (exchanged) {
            res.redirect(303, nextPath)
            return
        }
    } catch (error) {
        console.warn('[Neon Auth] Erro ao finalizar callback do Google:', error)
    }

    res.redirect(303, `/auth?error=session&next=${encodeURIComponent(nextPath)}`)
})

router.post('/auth/logout', async (req, res) => {
    if (!isSameOriginRequest(req)) {
        console.warn('[Neon Auth] Logout recebido de origem inesperada:', {
            host: req.get('host'),
            origin: req.get('origin'),
            referer: req.get('referer')
        })
    }

    try {
        await signOutNeonAuth(req, res)
    } catch (error) {
        console.warn('[Neon Auth] Erro ao encerrar sessao no Neon Auth:', error)
    }

    res.redirect(303, '/auth')
})

function getAuthCallbackPath(value: unknown): string {
    const nextPath = getSafeRedirectPath(value)

    if (nextPath === '/auth' || nextPath.startsWith('/auth/')) {
        return '/member'
    }

    return nextPath
}

function buildAuthCallbackUrl(req: Parameters<typeof getAppUrl>[0], nextPath: string): string {
    const callbackUrl = new URL('/auth/callback', getAppUrl(req))
    callbackUrl.searchParams.set('next', nextPath)
    return callbackUrl.toString()
}

function buildAuthErrorUrl(req: Parameters<typeof getAppUrl>[0], nextPath: string): string {
    const errorUrl = new URL('/auth', getAppUrl(req))
    errorUrl.searchParams.set('error', 'google')
    errorUrl.searchParams.set('next', nextPath)
    return errorUrl.toString()
}

function isSameOriginRequest(req: Parameters<typeof getAppUrl>[0]): boolean {
    if (!req) {
        return true
    }

    const requestOrigin = `${req.protocol}://${req.get('host')}`
    const appUrl = getAppUrl(req)
    const allowedOrigins = new Set([requestOrigin, appUrl])
    const allowedHosts = new Set([req.get('host')])

    try {
        allowedHosts.add(new URL(appUrl).host)
    } catch {
        // Ignore invalid optional app URL values and fall back to request host.
    }

    const origin = req.get('origin')
    const referer = req.get('referer')

    if (origin) {
        return isAllowedRequestUrl(origin, allowedOrigins, allowedHosts)
    }

    if (referer) {
        return isAllowedRequestUrl(referer, allowedOrigins, allowedHosts)
    }

    return true
}

function isAllowedRequestUrl(value: string, allowedOrigins: Set<string>, allowedHosts: Set<string | undefined>): boolean {
    try {
        const url = new URL(value)
        return allowedOrigins.has(url.origin) || allowedHosts.has(url.host)
    } catch {
        return false
    }
}

export default router
