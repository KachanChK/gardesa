import type { RequestHandler } from 'express'
import { NEON_AUTH_SESSION_VERIFIER_PARAM_NAME } from '../config/neon-auth'
import { exchangeNeonAuthVerifier, getNeonAuthSession } from '../services/neon-auth'

export const attachAuthenticatedUser: RequestHandler = async (req, res, next) => {
    res.locals.currentUser = null
    res.locals.authActionUrl = '/auth'

    if (req.query[NEON_AUTH_SESSION_VERIFIER_PARAM_NAME]) {
        next()
        return
    }

    try {
        const session = await getNeonAuthSession(req)
        const user = session?.user ?? null

        if (!user) {
            next()
            return
        }

        res.locals.currentUser = {
            avatarUrl: user.image ?? null,
            email: user.email,
            id: user.id,
            name: user.name
        }
        res.locals.authActionUrl = '/member'
    } catch (error) {
        console.warn('[Neon Auth] Erro ao carregar sessao:', error)
    }

    next()
}

export const requireAuth: RequestHandler = async (req, res, next) => {
    if (req.query[NEON_AUTH_SESSION_VERIFIER_PARAM_NAME]) {
        const exchanged = await exchangeNeonAuthVerifier(req, res)

        if (exchanged) {
            const cleanUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`)
            cleanUrl.searchParams.delete(NEON_AUTH_SESSION_VERIFIER_PARAM_NAME)
            res.redirect(303, `${cleanUrl.pathname}${cleanUrl.search}`)
            return
        }
    }

    if (res.locals.currentUser) {
        next()
        return
    }

    res.redirect(303, `/auth?next=${encodeURIComponent(req.originalUrl || '/member')}`)
}
