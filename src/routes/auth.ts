import { Router } from 'express'
import { getAppUrl, getSafeRedirectPath } from '../config/neon-auth'
import { signOutFromNeonAuth, startGoogleSignIn } from '../services/neon-auth'

const router = Router()

router.get('/auth/google', async (req, res) => {
    if (res.locals.currentUser) {
        res.redirect(303, '/member')
        return
    }

    try {
        const nextPath = getSafeRedirectPath(req.query.next)
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

export default router
