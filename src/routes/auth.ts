import { Router } from 'express'
import { getAppUrl, getSafeRedirectPath } from '../config/neon-auth'
import { signOutFromNeonAuth, startGoogleSignIn } from '../services/neon-auth'

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
        const callbackURL = `${getAppUrl(req)}${nextPath}`
        const googleUrl = await startGoogleSignIn(req, res, callbackURL)

        res.redirect(303, googleUrl)
    } catch (error) {
        console.error('[Neon Auth] Erro ao iniciar login com Google:', error)
        res.status(500).send('Autenticacao indisponivel. Verifique a configuracao do Neon Auth.')
    }
})

router.post('/auth/logout', async (req, res) => {
    try {
        await signOutFromNeonAuth(req, res)
    } catch (error) {
        console.warn('[Neon Auth] Erro ao encerrar sessao:', error)
    }

    res.redirect(303, '/')
})

function getAuthCallbackPath(value: unknown): string {
    const nextPath = getSafeRedirectPath(value)

    if (nextPath === '/auth' || nextPath.startsWith('/auth/')) {
        return '/member'
    }

    return nextPath
}

export default router
